/**
 * CLI: `pnpm enrich:shufersal`
 *
 * Fills Shufersal `RetailerProduct` chain category codes + image URL from:
 *   - **online** (default) — JSON search API (~24k products, no browser)
 *   - **html** — legacy category-page HTML harvest (~764 products)
 *
 * Optionally also runs canonical mapping (`--also-map-canonical`).
 */

import path from 'node:path';
import { stat } from 'node:fs/promises';
import { getPrismaClient } from '@supermarket-price-compare/db';
import {
  assignBackboneToCanonicalProducts,
  type AssignmentReport,
} from '../product-mapper/assign.js';
import { persistShufersalCatalog } from '../product-mapper/persist-shufersal-catalog.js';
import { crawlShufersalForProducts } from '../product-mapper/shufersal-crawl.js';
import { enumerateShufersalOnlineProducts } from '../product-mapper/shufersal-online.js';
import {
  harvestShufersalCachedCards,
  summarizeShufersalCache,
  type ShufersalProductCard,
} from '../product-mapper/shufersal.js';

type Source = 'online' | 'html';

type Args = {
  source: Source;
  crawl: boolean;
  refreshCache: boolean;
  alsoMapCanonical: boolean;
  dryRun: boolean;
  overwriteCanonical: boolean;
  cacheDir?: string;
  maxRequests: number;
  maxDepth: number;
  delayMs: number;
  pageSize: number;
  maxPages?: number;
  onlineDelayMs: number;
};

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    source: 'online',
    crawl: true,
    refreshCache: false,
    alsoMapCanonical: false,
    dryRun: false,
    overwriteCanonical: false,
    maxRequests: 1500,
    maxDepth: 1,
    delayMs: 10_000,
    pageSize: 100,
    onlineDelayMs: 400,
  };
  for (const a of argv) {
    if (a === '--') continue;
    if (a === '--source=online' || a === '--online') args.source = 'online';
    else if (a === '--source=html' || a === '--html') args.source = 'html';
    else if (a === '--no-crawl') args.crawl = false;
    else if (a === '--crawl') args.crawl = true;
    else if (a === '--refresh-cache') args.refreshCache = true;
    else if (a === '--also-map-canonical') args.alsoMapCanonical = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--overwrite-canonical') args.overwriteCanonical = true;
    else if (a.startsWith('--cache=')) {
      args.cacheDir = path.resolve(process.cwd(), a.slice('--cache='.length));
    } else if (a.startsWith('--max-requests=')) {
      args.maxRequests = Number(a.slice('--max-requests='.length));
    } else if (a.startsWith('--max-depth=')) {
      args.maxDepth = Number(a.slice('--max-depth='.length));
    } else if (a.startsWith('--delay-ms=')) {
      args.delayMs = Number(a.slice('--delay-ms='.length));
    } else if (a.startsWith('--page-size=')) {
      args.pageSize = Number(a.slice('--page-size='.length));
    } else if (a.startsWith('--max-pages=')) {
      args.maxPages = Number(a.slice('--max-pages='.length));
    } else if (a.startsWith('--online-delay-ms=')) {
      args.onlineDelayMs = Number(a.slice('--online-delay-ms='.length));
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
      'Usage: pnpm enrich:shufersal [-- opts]',
      '',
      'Fills Shufersal RetailerProduct.chainSubGroupId / chainGroupId /',
      'chainDepartmentId / chainImageUrl.',
      '',
      '  --source=online            JSON search API — full catalog (DEFAULT)',
      '  --source=html              Legacy HTML category harvest (~764 products)',
      '  --dry-run                  Match counts only; no DB writes',
      '  --also-map-canonical       Also run backbone category + name assign',
      '  --overwrite-canonical      Replace existing commonCategoryId',
      '',
      'Online API options:',
      '  --page-size=N              Results per page (default 100)',
      '  --max-pages=N              Cap pages (default: all ~249)',
      '  --online-delay-ms=N        Delay between pages (default 400)',
      '',
      'HTML harvest options (--source=html):',
      '  --crawl / --no-crawl       Fetch category HTML first',
      '  --refresh-cache            Re-fetch cached category pages',
      '  --cache=PATH               HTML cache dir',
      '  --max-requests=N           Crawl budget (default 1500)',
      '  --max-depth=N              Category fetch depth (default 1)',
      '  --delay-ms=N               Crawl delay (default 10000)',
    ].join('\n'),
  );
  process.exit(code);
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

function shufersalEntries(cards: readonly ShufersalProductCard[]) {
  return cards.map((c) => ({
    key: c.productCode,
    candidateChainCodes: c.chainCodes,
    name: c.name,
    imageUrl: c.imageUrl,
  }));
}

async function harvestOnline(args: Args): Promise<{
  cards: ShufersalProductCard[];
  meta: string;
}> {
  console.log('— Shufersal online catalog (search/results JSON) —');
  const t0 = Date.now();
  const result = await enumerateShufersalOnlineProducts({
    query: ':',
    pageSize: args.pageSize,
    maxPages: args.maxPages,
    delayMs: args.onlineDelayMs,
  });
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  const withImage = result.cards.filter((c) => c.imageUrl).length;
  const withCodes = result.cards.filter((c) => c.chainCodes.length > 0).length;
  console.log(
    `  pages=${result.pagesFetched} unique=${result.cards.length} reported=${result.totalReported} (${sec}s)`,
  );
  console.log(`  cards with image URL: ${withImage}/${result.cards.length}`);
  console.log(`  cards with category codes: ${withCodes}/${result.cards.length}`);
  return {
    cards: result.cards,
    meta: `online:${result.cards.length}`,
  };
}

async function harvestHtml(
  args: Args,
  cacheDir: string,
): Promise<{ cards: ShufersalProductCard[]; meta: string }> {
  console.log('— Shufersal HTML harvest —');
  if (args.refreshCache && !args.crawl) {
    console.error('--refresh-cache requires --crawl (ignored with --no-crawl).');
    process.exit(2);
  }

  const harvest = args.crawl
    ? await crawlShufersalForProducts({
        cacheDir,
        refreshCache: args.refreshCache,
        maxRequests: args.maxRequests,
        maxDepth: args.maxDepth,
        delayMs: args.delayMs,
      })
    : {
        ...(await harvestShufersalCachedCards(cacheDir)),
        cacheDir,
        cacheOnly: true,
      };

  console.log(`  cache: ${cacheDir}`);
  console.log(
    `  pages=${harvest.filesScanned} cardOccurrences=${harvest.cardOccurrences} uniqueProducts=${harvest.cards.length}`,
  );

  const cacheSummary = await summarizeShufersalCache(cacheDir);
  if (cacheSummary.htmlFiles > 0) {
    console.log(
      `  cache files: ${cacheSummary.pagesWithProductCards} with product HTML, ${cacheSummary.emptyFiles} empty (404), ${cacheSummary.htmlFiles} total on disk`,
    );
  }

  if (harvest.crawlStats) {
    const { networkRequests, cacheHits, codesVisited } = harvest.crawlStats;
    console.log(
      `  crawl: ${networkRequests} HTTP requests, ${cacheHits} cache hits, ${codesVisited} category codes visited`,
    );
  }

  return { cards: harvest.cards, meta: `html:${harvest.cards.length}` };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env['DATABASE_URL']) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const repoRoot = await findRepoRoot(process.cwd());
  const cacheDir =
    args.cacheDir ?? path.join(repoRoot, 'data/processed/categories/.cache/shufersal');

  const { cards } =
    args.source === 'online'
      ? await harvestOnline(args)
      : await harvestHtml(args, cacheDir);

  if (cards.length === 0) {
    console.error('\nNo products harvested — RetailerProduct cannot be enriched.');
    process.exit(1);
  }

  console.log('\n— Persist onto RetailerProduct —');
  const persist = await persistShufersalCatalog(cards, { dryRun: args.dryRun });
  console.log(
    `  matched ${persist.retailerProductsMatched} DB rows; updated ${persist.retailerProductsUpdated}${args.dryRun ? ' (dry-run)' : ''}`,
  );

  const prisma = getPrismaClient();
  const retailerWhere = { retailer: { slug: 'shufersal' as const } };
  const dbTotal = await prisma.retailerProduct.count({ where: retailerWhere });
  if (persist.retailerProductsMatched < dbTotal * 0.5) {
    console.log(
      `  note: ${persist.retailerProductsMatched}/${dbTotal} PriceFull rows matched — unmatched rows may be offline-only or use different ids.`,
    );
  }

  if (args.alsoMapCanonical) {
    console.log('\n— Map canonical products (names / backbone / image) —');
    const report: AssignmentReport = await assignBackboneToCanonicalProducts(
      shufersalEntries(cards),
      {
        retailer: 'shufersal',
        overwrite: args.overwriteCanonical,
        dryRun: args.dryRun,
        shufersalCatalogCards: cards,
      },
    );
    console.log(
      `  canonical category writes: ${report.canonicalProductsCategoryUpdated}; retailer catalog field writes (again): ${report.retailerProductsChainCategoryUpdated ?? 0}`,
    );
  }

  const [total, withChain, withImageDb] = await Promise.all([
    Promise.resolve(dbTotal),
    prisma.retailerProduct.count({
      where: { ...retailerWhere, chainSubGroupId: { not: null } },
    }),
    prisma.retailerProduct.count({
      where: { ...retailerWhere, chainImageUrl: { not: null } },
    }),
  ]);
  console.log('\n— Shufersal RetailerProduct coverage —');
  console.log(`  total: ${total}`);
  console.log(`  with chainSubGroupId: ${withChain}`);
  console.log(`  with chainImageUrl: ${withImageDb}`);
}

main()
  .catch((err) => {
    console.error('enrich-shufersal failed:', err);
    process.exit(1);
  })
  .finally(() => getPrismaClient().$disconnect());
