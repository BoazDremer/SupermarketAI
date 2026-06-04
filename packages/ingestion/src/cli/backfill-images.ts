/**
 * CLI: `pnpm backfill:images`
 *
 * Walks `CanonicalProduct` rows whose `imageUrl` is currently NULL and tries
 * to fill them in using the chain catalogs we already know how to scrape:
 *
 *   - Rami Levy: `enumerateRamiLevyProducts()` pulls `/api/catalog` per
 *                department; each product carries `images.original`. We
 *                build a `barcode → imageUrl` map and use it to fill any
 *                canonical that has an RL match.
 *
 *   - Shufersal: `harvestShufersalCachedCards()` (or `crawlShufersalForProducts`
 *                with `--crawl-shufersal`) reads cached HTML pages and pulls
 *                the `<img class="pic">` of each card. We build a
 *                `productCode (+ variants) → imageUrl` map and use it to
 *                fill any canonical that has a Shufersal match.
 *
 * Unlike `pnpm map:products`, this CLI ONLY writes `imageUrl`. Categories,
 * names, brand, etc. are never touched. Safe to re-run; it skips canonicals
 * that already have an image.
 *
 * When both chains can supply an image for the same canonical we prefer
 * Rami Levy's URL — those come from `img.rami-levy.co.il`, which serves
 * cleaner trim/transparent variants more consistently than Shufersal's
 * site-served thumbnails.
 */

import path from 'node:path';
import { stat } from 'node:fs/promises';
import { getPrismaClient } from '@supermarket-price-compare/db';
import { persistRamiLevyChainCategories } from '../product-mapper/persist-rl-chain-categories.js';
import { persistShufersalCatalog } from '../product-mapper/persist-shufersal-catalog.js';
import {
  enumerateRamiLevyProducts,
  resolveRamiLevyProductsByBarcode,
  type RamiLevyEnumeratedProduct,
} from '../product-mapper/rami-levy.js';
import { harvestShufersalCachedCards } from '../product-mapper/shufersal.js';
import { crawlShufersalForProducts } from '../product-mapper/shufersal-crawl.js';
import { expandShufersalHarvestLookupKeys } from '../product-mapper/assign.js';
import { createProgress } from '../progress.js';

type Args = {
  retailer: 'both' | 'rami-levy' | 'shufersal';
  dryRun: boolean;
  shufersalCacheDir?: string;
  crawlShufersal: boolean;
  shufersalCrawlMaxRequests?: number;
  shufersalCrawlMaxDepth?: number;
  shufersalCrawlDelayMs?: number;
  ramiLevyDelayMs?: number;
  /**
   * Skip the per-barcode RL fallback (department-walk only). The fallback
   * catches deposits / seasonal / department-less SKUs but adds one HTTP
   * call per missing barcode (~5min for 1.3k items at 250ms each).
   */
  skipRamiLevyBarcodeFallback: boolean;
  /** Cap on per-barcode RL fallback calls. Default unlimited. */
  ramiLevyBarcodeFallbackMax?: number;
  batchSize: number;
};

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    retailer: 'both',
    dryRun: false,
    crawlShufersal: false,
    skipRamiLevyBarcodeFallback: false,
    batchSize: 500,
  };
  for (const a of argv) {
    if (a === '--') continue;
    if (a.startsWith('--retailer=')) {
      const v = a.slice('--retailer='.length);
      if (v !== 'both' && v !== 'rami-levy' && v !== 'shufersal') {
        throw new Error(`Unknown --retailer value: ${v}`);
      }
      args.retailer = v;
    } else if (a === '--dry-run') {
      args.dryRun = true;
    } else if (a.startsWith('--shufersal-cache=')) {
      args.shufersalCacheDir = path.resolve(
        process.cwd(),
        a.slice('--shufersal-cache='.length),
      );
    } else if (a === '--crawl-shufersal') {
      args.crawlShufersal = true;
    } else if (a.startsWith('--shufersal-max-requests=')) {
      args.shufersalCrawlMaxRequests = Number(a.slice('--shufersal-max-requests='.length));
    } else if (a.startsWith('--shufersal-max-depth=')) {
      args.shufersalCrawlMaxDepth = Number(a.slice('--shufersal-max-depth='.length));
    } else if (a.startsWith('--shufersal-delay-ms=')) {
      args.shufersalCrawlDelayMs = Number(a.slice('--shufersal-delay-ms='.length));
    } else if (a.startsWith('--rami-levy-delay-ms=')) {
      args.ramiLevyDelayMs = Number(a.slice('--rami-levy-delay-ms='.length));
    } else if (a === '--no-rami-levy-barcode-fallback') {
      args.skipRamiLevyBarcodeFallback = true;
    } else if (a.startsWith('--rami-levy-barcode-fallback-max=')) {
      args.ramiLevyBarcodeFallbackMax = Number(
        a.slice('--rami-levy-barcode-fallback-max='.length),
      );
    } else if (a.startsWith('--batch-size=')) {
      args.batchSize = Math.max(1, Number(a.slice('--batch-size='.length)) || 500);
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
      'Usage: pnpm backfill:images [-- --opts]',
      '',
      '  --retailer=both|rami-levy|shufersal   Which chain(s) to use as image source (default both)',
      '  --dry-run                             Compute counts; do not write to DB',
      '  --batch-size=N                        Updates per transaction (default 500)',
      '',
      '  --shufersal-cache=PATH                Directory of cached Shufersal HTML',
      '                                        (default <repo>/data/processed/categories/.cache/shufersal)',
      '  --crawl-shufersal                     Refresh the Shufersal cache before harvesting',
      '                                        (otherwise reuse what is on disk)',
      '  --shufersal-max-requests=N            Cap on Shufersal HTTP requests when crawling',
      '  --shufersal-max-depth=N               BFS depth cap when crawling',
      '  --shufersal-delay-ms=N                Delay between Shufersal HTTP calls (robots.txt = 10000)',
      '',
      '  --rami-levy-delay-ms=N                Delay between RL /api/catalog calls (default 250ms)',
      '  --no-rami-levy-barcode-fallback       Skip the per-barcode RL fallback (department sweep only).',
      '                                        The fallback catches department-less SKUs',
      '                                        (deposits, seasonal, …) but issues one HTTP call',
      '                                        per still-missing barcode.',
      '  --rami-levy-barcode-fallback-max=N    Cap on per-barcode RL fallback calls.',
    ].join('\n'),
  );
  process.exit(code);
}

async function findRepoRoot(start: string, marker = 'pnpm-workspace.yaml'): Promise<string> {
  let dir = path.resolve(start);
  while (true) {
    try {
      await stat(path.join(dir, marker));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return start;
      dir = parent;
    }
  }
}

/**
 * Lookup key bag for a canonical product, partitioned by retailer. Each list
 * contains every barcode/external-code variant the corresponding chain map
 * might be keyed by, so a single `.get()` per variant is enough.
 */
type CanonicalNeed = {
  canonicalId: string;
  ramiLevyKeys: string[];
  shufersalKeys: string[];
};

type FillResult = {
  url: string;
  source: 'rami-levy' | 'shufersal';
};

function buildNeeds(
  rows: ReadonlyArray<{
    id: string;
    productMatches: ReadonlyArray<{
      retailerProduct: {
        barcode: string | null;
        externalItemCode: string;
        retailer: { slug: string } | null;
      };
    }>;
  }>,
): CanonicalNeed[] {
  const out: CanonicalNeed[] = [];
  for (const cp of rows) {
    const rlKeys = new Set<string>();
    const shuKeys = new Set<string>();
    for (const pm of cp.productMatches) {
      const slug = pm.retailerProduct.retailer?.slug;
      const candidates = [pm.retailerProduct.barcode, pm.retailerProduct.externalItemCode].filter(
        (v): v is string => Boolean(v && v.length),
      );
      if (slug === 'rami-levy') {
        for (const c of candidates) rlKeys.add(c);
      } else if (slug === 'shufersal') {
        for (const c of candidates) {
          for (const k of expandShufersalHarvestLookupKeys('shufersal', c)) {
            shuKeys.add(k);
          }
        }
      }
    }
    if (rlKeys.size === 0 && shuKeys.size === 0) continue;
    out.push({
      canonicalId: cp.id,
      ramiLevyKeys: [...rlKeys],
      shufersalKeys: [...shuKeys],
    });
  }
  return out;
}

function lookupImage(
  need: CanonicalNeed,
  rlMap: Map<string, string>,
  shuMap: Map<string, string>,
): FillResult | undefined {
  for (const k of need.ramiLevyKeys) {
    const url = rlMap.get(k);
    if (url) return { url, source: 'rami-levy' };
  }
  for (const k of need.shufersalKeys) {
    const url = shuMap.get(k);
    if (url) return { url, source: 'shufersal' };
  }
  return undefined;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!process.env['DATABASE_URL']) {
    console.error('DATABASE_URL is not set; export it before running this CLI.');
    process.exit(1);
  }

  const prisma = getPrismaClient();

  // ---------- Step 1: who needs an image? ----------
  console.log('— Loading canonical products without imageUrl —');
  const t0 = Date.now();
  const missing = await prisma.canonicalProduct.findMany({
    where: { imageUrl: null },
    select: {
      id: true,
      productMatches: {
        select: {
          retailerProduct: {
            select: {
              barcode: true,
              externalItemCode: true,
              retailer: { select: { slug: true } },
            },
          },
        },
      },
    },
  });
  console.log(`  ${missing.length} canonical products lack an image`);

  const needs = buildNeeds(missing);
  const rlNeedCount = needs.filter((n) => n.ramiLevyKeys.length > 0).length;
  const shuNeedCount = needs.filter((n) => n.shufersalKeys.length > 0).length;
  const orphanCount = missing.length - needs.length;
  console.log(
    `  ${needs.length} have at least one chain match (RL=${rlNeedCount}, Shufersal=${shuNeedCount}, both possible); ${orphanCount} have no chain link and cannot be filled`,
  );
  console.log(`  (load took ${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  if (needs.length === 0) {
    console.log('\nNothing to do — every canonical without an image is also chain-unmatched.');
    return;
  }

  // ---------- Step 2: harvest images per chain ----------
  const rlMap = new Map<string, string>();
  const shuMap = new Map<string, string>();

  if (args.retailer === 'both' || args.retailer === 'rami-levy') {
    console.log('\n— Enumerating Rami Levy /api/catalog —');
    const t = Date.now();
    const result = await enumerateRamiLevyProducts({ delayMs: args.ramiLevyDelayMs });
    const rlCatalogByBarcode = new Map<string, RamiLevyEnumeratedProduct>();
    for (const p of result.products) {
      if (p.barcode) rlCatalogByBarcode.set(p.barcode, p);
    }
    let withImage = 0;
    for (const p of result.products) {
      if (p.imageUrl && p.barcode) {
        rlMap.set(p.barcode, p.imageUrl);
        withImage += 1;
      }
    }
    console.log(
      `  enumerated ${result.products.length} products in ${((Date.now() - t) / 1000).toFixed(1)}s; ${withImage} carry an image URL`,
    );

    // Per-barcode fallback: any canonical that still has no image candidate
    // after the department sweep gets one direct lookup. This is the only
    // way to reach RL's department-less SKUs (deposits, seasonal, etc.).
    if (!args.skipRamiLevyBarcodeFallback) {
      const missingBarcodes = new Set<string>();
      for (const n of needs) {
        const alreadyResolved = n.ramiLevyKeys.some((k) => rlMap.has(k));
        if (alreadyResolved) continue;
        for (const k of n.ramiLevyKeys) missingBarcodes.add(k);
      }
      let toQuery = [...missingBarcodes];
      if (
        args.ramiLevyBarcodeFallbackMax != null &&
        toQuery.length > args.ramiLevyBarcodeFallbackMax
      ) {
        console.log(
          `  fallback would query ${toQuery.length} barcodes; capping at ${args.ramiLevyBarcodeFallbackMax}`,
        );
        toQuery = toQuery.slice(0, args.ramiLevyBarcodeFallbackMax);
      }
      if (toQuery.length === 0) {
        console.log('  per-barcode fallback: nothing left unresolved.');
      } else {
        const etaSec = (toQuery.length * (args.ramiLevyDelayMs ?? 250)) / 1000;
        console.log(
          `  per-barcode fallback: ${toQuery.length} barcodes (~${Math.ceil(etaSec)}s at ${args.ramiLevyDelayMs ?? 250}ms/req)`,
        );
        let matched = 0;
        const fallbackProgress = createProgress({
          label: 'rl-fallback',
          total: toQuery.length,
          intervalMs: 2_000,
          extra: () => ({ matched }),
        });
        const fallback = await resolveRamiLevyProductsByBarcode(toQuery, {
          delayMs: args.ramiLevyDelayMs,
          progressEvery: 1,
          log: () => undefined,
          onProgress: ({ completed, matched: m }) => {
            matched = m;
            const delta = completed - fallbackProgress.current();
            if (delta > 0) fallbackProgress.tick(delta);
          },
        });
        fallbackProgress.finish();
        let added = 0;
        for (const p of fallback) {
          if (p.barcode) rlCatalogByBarcode.set(p.barcode, p);
          if (p.imageUrl && p.barcode && !rlMap.has(p.barcode)) {
            rlMap.set(p.barcode, p.imageUrl);
            added += 1;
          }
        }
        console.log(`  fallback contributed ${added} new image URLs`);
      }
    } else {
      console.log('  per-barcode fallback skipped (--no-rami-levy-barcode-fallback).');
    }

    const chainPersist = await persistRamiLevyChainCategories(
      [...rlCatalogByBarcode.values()],
      { dryRun: args.dryRun },
    );
    console.log(
      `  retailer catalog on RetailerProduct (dept/group/sub/image): ${chainPersist.retailerProductsUpdated} updated (${chainPersist.retailerProductsMatched} RL rows matched)`,
    );
  }

  if (args.retailer === 'both' || args.retailer === 'shufersal') {
    console.log('\n— Harvesting Shufersal product cards —');
    const repoRoot = await findRepoRoot(process.cwd());
    const cacheDir =
      args.shufersalCacheDir ?? path.join(repoRoot, 'data/processed/categories/.cache/shufersal');
    const harvest = args.crawlShufersal
      ? await crawlShufersalForProducts({
          cacheDir,
          maxRequests: args.shufersalCrawlMaxRequests,
          maxDepth: args.shufersalCrawlMaxDepth,
          delayMs: args.shufersalCrawlDelayMs,
        })
      : await harvestShufersalCachedCards(cacheDir);
    let cardImages = 0;
    for (const card of harvest.cards) {
      if (!card.imageUrl) continue;
      cardImages += 1;
      for (const k of expandShufersalHarvestLookupKeys('shufersal', card.productCode)) {
        // Don't clobber an existing entry — first key variant wins, and
        // matters very little since they all point at the same picture.
        if (!shuMap.has(k)) shuMap.set(k, card.imageUrl);
      }
    }
    console.log(
      `  scanned ${harvest.filesScanned} pages → ${harvest.cards.length} unique cards (${cardImages} with image); ${shuMap.size} lookup keys after variant expansion`,
    );
    if (harvest.cards.length === 0) {
      console.warn(
        `  [shufersal] cache at ${cacheDir} is empty. Run \`pnpm scrape:categories -- --retailer=shufersal\` or pass --crawl-shufersal.`,
      );
    } else {
      const catalogPersist = await persistShufersalCatalog(harvest.cards, {
        dryRun: args.dryRun,
      });
      console.log(
        `  retailer catalog on RetailerProduct (chain codes/image): ${catalogPersist.retailerProductsUpdated} updated (${catalogPersist.retailerProductsMatched} Shufersal rows matched)`,
      );
    }
  }

  // ---------- Step 3: resolve each missing canonical to an image ----------
  type Update = { id: string; imageUrl: string; source: FillResult['source'] };
  const updates: Update[] = [];
  let unresolved = 0;
  let fromRl = 0;
  let fromShu = 0;
  for (const need of needs) {
    const hit = lookupImage(need, rlMap, shuMap);
    if (!hit) {
      unresolved += 1;
      continue;
    }
    updates.push({ id: need.canonicalId, imageUrl: hit.url, source: hit.source });
    if (hit.source === 'rami-levy') fromRl += 1;
    else fromShu += 1;
  }

  console.log('\n— Backfill plan —');
  console.log(`  will write: ${updates.length}`);
  console.log(`    from Rami Levy: ${fromRl}`);
  console.log(`    from Shufersal: ${fromShu}`);
  console.log(`  still unresolved: ${unresolved}`);
  console.log(`  unmatched (no chain link): ${orphanCount}`);

  if (args.dryRun) {
    console.log('\n(dry-run: no rows were written)');
    return;
  }

  // ---------- Step 4: write in batches ----------
  if (updates.length > 0) {
    console.log(`\n— Writing imageUrl updates (batch=${args.batchSize}) —`);
    const writeProgress = createProgress({
      label: 'db-write',
      total: updates.length,
      intervalMs: 1_000,
    });
    for (let i = 0; i < updates.length; i += args.batchSize) {
      const batch = updates.slice(i, i + args.batchSize);
      await prisma.$transaction(
        batch.map((u) =>
          prisma.canonicalProduct.update({
            where: { id: u.id },
            data: { imageUrl: u.imageUrl },
          }),
        ),
      );
      writeProgress.tick(batch.length);
    }
    writeProgress.finish();
  }

  // ---------- Step 5: final coverage report ----------
  const total = await prisma.canonicalProduct.count();
  const withImage = await prisma.canonicalProduct.count({ where: { imageUrl: { not: null } } });
  const pct = total > 0 ? ((withImage / total) * 100).toFixed(1) : '0.0';
  console.log('\n— Coverage —');
  console.log(`  canonical products with image: ${withImage}/${total} (${pct}%)`);
}

main()
  .catch((err) => {
    console.error('backfill-images failed:', err);
    process.exit(1);
  })
  .finally(() => getPrismaClient().$disconnect());
