/**
 * CLI entrypoint: scrape Shufersal + Rami Levy category trees, build a
 * common tree, write artifacts to data/processed/categories/, and
 * (optionally) upsert the result into Postgres.
 *
 * Usage:
 *   pnpm scrape:categories                         # both retailers + json + db
 *   pnpm scrape:categories -- --retailer=shufersal
 *   pnpm scrape:categories -- --retailer=rami-levy
 *   pnpm scrape:categories -- --no-network         # rebuild from cached JSONs
 *   pnpm scrape:categories -- --persist=none       # JSON only, skip DB
 *   pnpm scrape:categories -- --shufersal-delay-ms=2000  # override Crawl-delay
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { scrapeShufersalCategories } from '../scrapers/shufersal-categories.js';
import { scrapeRamiLevyCategories } from '../scrapers/rami-levy-categories.js';
import { logBackboneRulesStatus } from '../category-mapper/apply-backbone-rules.js';
import {
  buildCommonTree,
  summarizeBuildResult,
} from '../category-mapper/build-common-tree.js';
import { persistCommonTree } from '../category-mapper/persist.js';
import type { ChainCategoryTree } from '../scrapers/types.js';

/** Walk up from `start` until we find a directory containing `marker`, or hit `/`. */
async function findRepoRoot(start: string, marker = 'pnpm-workspace.yaml'): Promise<string> {
  let dir = path.resolve(start);
  while (true) {
    try {
      await stat(path.join(dir, marker));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return start; // gave up; fall back to start
      dir = parent;
    }
  }
}

type Args = {
  retailer: 'both' | 'shufersal' | 'rami-levy';
  network: boolean;
  persist: 'db' | 'none';
  outputDir: string;
  shufersalDelayMs?: number;
  shufersalCacheMaxAgeMs?: number;
  shufersalMaxRequests?: number;
  shufersalMaxDepth?: number;
  shufersalCacheOnly?: boolean;
  ramiLevyMaxPages?: number;
};

async function defaultOutputDir(): Promise<string> {
  const root = await findRepoRoot(process.cwd());
  return path.join(root, 'data/processed/categories');
}

function parseArgs(argv: readonly string[], defaultOutput: string): Args {
  const args: Args = {
    retailer: 'both',
    network: true,
    persist: 'db',
    outputDir: defaultOutput,
  };
  for (const a of argv) {
    if (a === '--') continue; // pnpm forwards a literal "--" separator; ignore.
    if (a.startsWith('--retailer=')) {
      const v = a.slice('--retailer='.length);
      if (v !== 'both' && v !== 'shufersal' && v !== 'rami-levy') {
        throw new Error(`Unknown --retailer value: ${v}`);
      }
      args.retailer = v;
    } else if (a === '--no-network') {
      args.network = false;
    } else if (a.startsWith('--persist=')) {
      const v = a.slice('--persist='.length);
      if (v !== 'db' && v !== 'none') throw new Error(`Unknown --persist value: ${v}`);
      args.persist = v;
    } else if (a.startsWith('--output=')) {
      args.outputDir = path.resolve(process.cwd(), a.slice('--output='.length));
    } else if (a.startsWith('--shufersal-delay-ms=')) {
      args.shufersalDelayMs = Number(a.slice('--shufersal-delay-ms='.length));
    } else if (a.startsWith('--shufersal-cache-max-age-ms=')) {
      args.shufersalCacheMaxAgeMs = Number(a.slice('--shufersal-cache-max-age-ms='.length));
    } else if (a.startsWith('--shufersal-max-requests=')) {
      args.shufersalMaxRequests = Number(a.slice('--shufersal-max-requests='.length));
    } else if (a.startsWith('--shufersal-max-depth=')) {
      args.shufersalMaxDepth = Number(a.slice('--shufersal-max-depth='.length));
    } else if (a === '--shufersal-cache-only') {
      args.shufersalCacheOnly = true;
    } else if (a.startsWith('--rami-levy-max-pages=')) {
      args.ramiLevyMaxPages = Number(a.slice('--rami-levy-max-pages='.length));
    } else if (a === '--help' || a === '-h') {
      printHelpAndExit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      printHelpAndExit(2);
    }
  }
  return args;
}

function printHelpAndExit(code: number): never {
  console.log(
    [
      'Usage: pnpm scrape:categories [-- --opts]',
      '',
      '  --retailer=both|shufersal|rami-levy   Which chain(s) to scrape (default both)',
      '  --no-network                          Reuse cached chain JSONs (no HTTP)',
      '  --persist=db|none                     Upsert into Postgres (default db)',
      '  --output=PATH                         Output directory (default data/processed/categories)',
      '  --shufersal-delay-ms=N                Per-request delay for Shufersal (default 10000ms = robots.txt)',
      '  --shufersal-cache-max-age-ms=N        Reuse cached pages younger than N ms (default 7d)',
      '  --shufersal-max-requests=N            Hard cap on Shufersal HTTP fetches (default 900)',
      '  --shufersal-max-depth=N               Skip nodes deeper than this in BFS (default 4)',
      '  --shufersal-cache-only                Re-parse cached HTML only; never hit the network',
      '  --rami-levy-max-pages=N               Cap /api/catalog pages (default 60)',
    ].join('\n'),
  );
  process.exit(code);
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    const text = await readFile(file, 'utf8');
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

async function loadOrScrapeShufersal(
  args: Args,
  outputDir: string,
): Promise<ChainCategoryTree | undefined> {
  if (args.retailer === 'rami-levy') return undefined;
  const file = path.join(outputDir, 'shufersal.json');
  if (!args.network) {
    const cached = await readJson<ChainCategoryTree>(file);
    if (!cached) {
      console.warn('[shufersal] --no-network requested but no cached JSON; skipping');
    }
    return cached;
  }
  console.log('[shufersal] scraping (this may take several minutes — Crawl-delay 10s)…');
  const tree = await scrapeShufersalCategories({
    delayMs: args.shufersalDelayMs ?? 10_000,
    cacheMaxAgeMs: args.shufersalCacheMaxAgeMs,
    maxRequests: args.shufersalMaxRequests ?? 900,
    maxDepth: args.shufersalMaxDepth ?? 4,
    cacheOnly: args.shufersalCacheOnly,
  });
  console.log(
    `[shufersal] done — ${tree.roots.length} top-level depts, ${tree.leafCount} leaves`,
  );
  await writeJson(file, tree);
  return tree;
}

async function loadOrScrapeRamiLevy(
  args: Args,
  outputDir: string,
): Promise<ChainCategoryTree | undefined> {
  if (args.retailer === 'shufersal') return undefined;
  const file = path.join(outputDir, 'rami-levy.json');
  if (!args.network) {
    const cached = await readJson<ChainCategoryTree>(file);
    if (!cached) {
      console.warn('[rami-levy] --no-network requested but no cached JSON; skipping');
    }
    return cached;
  }
  console.log('[rami-levy] scraping…');
  const tree = await scrapeRamiLevyCategories({
    maxPages: args.ramiLevyMaxPages,
  });
  console.log(
    `[rami-levy] done — ${tree.roots.length} top-level depts, ${tree.leafCount} leaves`,
  );
  await writeJson(file, tree);
  return tree;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2), await defaultOutputDir());
  await ensureDir(args.outputDir);

  const trees: ChainCategoryTree[] = [];
  const shufersal = await loadOrScrapeShufersal(args, args.outputDir);
  if (shufersal) trees.push(shufersal);
  const ramiLevy = await loadOrScrapeRamiLevy(args, args.outputDir);
  if (ramiLevy) trees.push(ramiLevy);

  if (trees.length === 0) {
    console.error('No chain category trees available; nothing to merge.');
    process.exit(1);
  }

  logBackboneRulesStatus();
  console.log(`[merge] mapping ${trees.length} chain tree(s) onto common backbone…`);
  const result = buildCommonTree(trees);
  const commonPath = path.join(args.outputDir, 'common.json');
  await writeJson(commonPath, {
    builtAt: result.builtAt,
    _meta: {
      backboneSource: 'packages/ingestion/src/category-mapper/backbone.ts + data/category-backbone-rules/',
      rulesApplied: true,
    },
    backbone: result.backbone,
    aliases: result.aliases,
  });
  await writeJson(path.join(args.outputDir, 'unmapped.json'), {
    builtAt: result.builtAt,
    unmapped: result.unmapped,
  });

  console.log(summarizeBuildResult(result));
  console.log(`Wrote ${commonPath} (builtAt=${result.builtAt})`);
  console.log(`Wrote ${path.join(args.outputDir, 'unmapped.json')}`);

  if (args.persist === 'db') {
    if (!process.env.DATABASE_URL) {
      console.warn(
        '[persist] DATABASE_URL not set; skipping DB upsert — the app still serves the OLD tree from Postgres.',
      );
      console.warn(
        '[persist] common.json on disk was updated, but restart scrape with DATABASE_URL set to refresh the API.',
      );
    } else {
      console.log('[persist] upserting backbone + aliases into Postgres…');
      const persistResult = await persistCommonTree(result);
      console.log(
        `[persist] nodes=${persistResult.nodesUpserted} terminals=${persistResult.terminals} staleCategoriesRemoved=${persistResult.removedStaleCategories} aliases=${JSON.stringify(persistResult.aliasesByRetailer)}`,
      );
    }
  }
}

main().catch((err) => {
  console.error('scrape-categories failed:', err);
  process.exit(1);
});
