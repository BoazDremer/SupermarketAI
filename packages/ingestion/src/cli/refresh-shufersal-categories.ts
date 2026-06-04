/**
 * CLI: `pnpm refresh:shufersal-categories`
 *
 * Rebuilds `data/processed/categories/shufersal.json` with:
 *   - Fresh category paths from the online catalog API (default)
 *   - Hebrew names from facets + category-page titles (via /online/he/c/{code})
 *
 * Logs progress continuously — safe to run in an external terminal.
 */

import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildShufersalCategoryTree } from '../category-mapper/build-shufersal-tree.js';

type Args = {
  rebuildPaths: boolean;
  fetchTitles: boolean;
  outputPath: string;
  existingPath: string;
  pageSize: number;
  maxPages?: number;
  onlineDelayMs: number;
  titleDelayMs: number;
  maxFetchDepth: number;
  refreshCache: boolean;
  namesOnly: boolean;
};

function defaultShufersalTreePath(repoRoot: string): string {
  return path.join(repoRoot, 'data/processed/categories/shufersal.json');
}

function parseArgs(argv: readonly string[], repoRoot: string): Args {
  const repoDefault = defaultShufersalTreePath(repoRoot);
  const args: Args = {
    rebuildPaths: true,
    fetchTitles: true,
    outputPath: repoDefault,
    existingPath: repoDefault,
    pageSize: 100,
    onlineDelayMs: 400,
    titleDelayMs: 2_000,
    maxFetchDepth: 4,
    refreshCache: false,
    namesOnly: false,
  };
  for (const a of argv) {
    if (a === '--') continue;
    if (a === '--names-only') {
      args.namesOnly = true;
      args.rebuildPaths = false;
    } else if (a === '--no-fetch-titles') args.fetchTitles = false;
    else if (a === '--no-rebuild-paths') args.rebuildPaths = false;
    else if (a.startsWith('--output=')) {
      args.outputPath = resolveArgPath(repoRoot, a.slice('--output='.length));
    } else if (a.startsWith('--existing=')) {
      args.existingPath = resolveArgPath(repoRoot, a.slice('--existing='.length));
    } else if (a.startsWith('--page-size=')) {
      args.pageSize = Number(a.slice('--page-size='.length));
    } else if (a.startsWith('--max-pages=')) {
      args.maxPages = Number(a.slice('--max-pages='.length));
    } else if (a.startsWith('--online-delay-ms=')) {
      args.onlineDelayMs = Number(a.slice('--online-delay-ms='.length));
    } else if (a.startsWith('--title-delay-ms=')) {
      args.titleDelayMs = Number(a.slice('--title-delay-ms='.length));
    } else if (a.startsWith('--max-fetch-depth=')) {
      args.maxFetchDepth = Number(a.slice('--max-fetch-depth='.length));
    } else if (a === '--refresh-cache') {
      args.refreshCache = true;
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
      'Usage: pnpm refresh:shufersal-categories [-- opts]',
      '',
      'Updates data/processed/categories/shufersal.json',
      '',
      '  (default) Rebuild paths from online catalog + resolve Hebrew names',
      '  --names-only              Keep tree shape; only refresh names',
      '  --no-rebuild-paths        Same as --names-only',
      '  --no-fetch-titles         Use facets/cache only; no category-page HTTP',
      '  --output=PATH             Output JSON (default: data/processed/categories/shufersal.json)',
      '  --existing=PATH           Seed names from this file',
      '  --page-size=N             Catalog API page size (default 100)',
      '  --max-pages=N             Cap catalog pages (default: all ~249)',
      '  --online-delay-ms=N       Delay between catalog pages (default 400)',
      '  --title-delay-ms=N        Delay between title fetches (default 2000; robots=10000)',
      '  --max-fetch-depth=N       Fetch titles for codes up to this depth (default 4)',
      '  --refresh-cache           Re-fetch all category pages (ignore HTML cache)',
    ].join('\n'),
  );
  process.exit(code);
}

function resolveArgPath(repoRoot: string, raw: string): string {
  const p = raw.trim();
  if (path.isAbsolute(p)) return p;
  return path.join(repoRoot, p);
}

async function findRepoRoot(start: string): Promise<string> {
  let dir = path.resolve(start);
  while (true) {
    try {
      await stat(path.join(dir, 'pnpm-workspace.yaml'));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return start;
      dir = parent;
    }
  }
}

async function main(): Promise<void> {
  const repoRoot = await findRepoRoot(process.cwd());
  const args = parseArgs(process.argv.slice(2), repoRoot);

  console.log('— Refresh Shufersal category tree —');
  console.log(`  repo root: ${repoRoot}`);
  console.log(`  output: ${args.outputPath}`);
  console.log(
    `  rebuildPaths=${args.rebuildPaths} fetchTitles=${args.fetchTitles} maxFetchDepth=${args.maxFetchDepth} refreshCache=${args.refreshCache}`,
  );
  if (!args.refreshCache) {
    console.log(
      '  tip: add --refresh-cache if depth-1 codes (e.g. A16) still show raw ids from old /online/he/ fetches',
    );
  }

  const tree = await buildShufersalCategoryTree({
    rebuildPaths: args.rebuildPaths,
    existingTreePath: args.existingPath,
    pageSize: args.pageSize,
    maxPages: args.maxPages,
    onlineDelayMs: args.onlineDelayMs,
    fetchTitles: args.fetchTitles,
    titleDelayMs: args.titleDelayMs,
    maxFetchDepth: args.maxFetchDepth,
    refreshCache: args.refreshCache,
  });

  await mkdir(path.dirname(args.outputPath), { recursive: true });
  await writeFile(args.outputPath, JSON.stringify(tree, null, 2) + '\n', 'utf8');

  console.log('\n— Done —');
  console.log(`  wrote ${args.outputPath}`);
  console.log(`  top-level departments: ${tree.roots.length}`);
  console.log(`  leaves: ${tree.leafCount}`);
  console.log('\nNext (optional): pnpm scrape:categories -- --retailer=shufersal --no-network');
  console.log('  to rebuild common.json aliases from the updated chain tree.');
}

main().catch((err) => {
  console.error('refresh-shufersal-categories failed:', err);
  process.exit(1);
});
