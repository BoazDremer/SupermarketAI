/**
 * CLI: `pnpm map:products`
 *
 * Populates `CanonicalProduct.commonCategoryId`, `displayNameHe`, and `brand`
 * for every product the chain catalogs already know about, using two
 * deterministic sources:
 *
 *   Stage A — Rami Levy public `/api/catalog`. Each product carries its
 *             department + group ids and a full Hebrew name. We look the
 *             chain ids up in `RetailerCategoryAlias` to assign a backbone
 *             leaf, and propagate the untruncated name + brand onto the
 *             linked `CanonicalProduct` rows.
 *
 *   Stage B — Shufersal product cards from cached HTML pages. Each card
 *             carries `data-product-name`, `data-product-code`, and
 *             `data-all-categories`, so the same enrichment runs from cache
 *             without any new HTTP calls. With `--crawl-shufersal` we deepen
 *             the BFS first to refresh the cache before harvesting.
 *
 * Stages run in order; by default Stage B does not overwrite assignments
 * Stage A made (`--overwrite=shufersal` to flip that).
 */

import path from 'node:path';
import { stat } from 'node:fs/promises';
import {
  enumerateRamiLevyProducts,
  type RamiLevyEnumeratedProduct,
} from '../product-mapper/rami-levy.js';
import {
  harvestShufersalCachedCards,
  type ShufersalProductCard,
} from '../product-mapper/shufersal.js';
import { crawlShufersalForProducts } from '../product-mapper/shufersal-crawl.js';
import {
  assignBackboneToCanonicalProducts,
  type AssignmentReport,
  type ChainResolverEntry,
} from '../product-mapper/assign.js';
import { persistShufersalCatalog } from '../product-mapper/persist-shufersal-catalog.js';
import { refineExistingCanonicalProducts } from '../product-mapper/refine.js';
import { getPrismaClient } from '@supermarket-price-compare/db';
import { createProgress } from '../progress.js';

type Args = {
  retailer: 'both' | 'shufersal' | 'rami-levy';
  shufersalCacheDir?: string;
  overwrite: { ramiLevy: boolean; shufersal: boolean };
  dryRun: boolean;
  ramiLevyDelayMs?: number;
  crawlShufersal: boolean;
  shufersalCrawlMaxRequests?: number;
  shufersalCrawlMaxDepth?: number;
  shufersalCrawlDelayMs?: number;
  noNames: boolean;
  /** Skip chain harvest and only re-evaluate already-stored CanonicalProduct rows. */
  refineOnly: boolean;
  /** Run the backfill refine pass over every canonical row (default: false). */
  refineAfter: boolean;
  /** Legacy toggle: allow semantic/name refinement at assignment time. */
  semanticRefine: boolean;
};

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    retailer: 'both',
    // Regeneration default: RL writes first, Shufersal fills only missing.
    // This guarantees RL precedence on cross-retailer discrepancies.
    overwrite: { ramiLevy: true, shufersal: false },
    dryRun: false,
    crawlShufersal: false,
    noNames: false,
    refineOnly: false,
    refineAfter: false,
    semanticRefine: false,
  };
  for (const a of argv) {
    if (a === '--') continue;
    if (a.startsWith('--retailer=')) {
      const v = a.slice('--retailer='.length);
      if (v !== 'both' && v !== 'shufersal' && v !== 'rami-levy') {
        throw new Error(`Unknown --retailer value: ${v}`);
      }
      args.retailer = v;
    } else if (a === '--dry-run') {
      args.dryRun = true;
    } else if (a === '--overwrite') {
      args.overwrite.ramiLevy = true;
      args.overwrite.shufersal = true;
    } else if (a === '--overwrite=rami-levy') {
      args.overwrite.ramiLevy = true;
    } else if (a === '--overwrite=shufersal') {
      args.overwrite.shufersal = true;
    } else if (a.startsWith('--shufersal-cache=')) {
      args.shufersalCacheDir = path.resolve(process.cwd(), a.slice('--shufersal-cache='.length));
    } else if (a.startsWith('--rami-levy-delay-ms=')) {
      args.ramiLevyDelayMs = Number(a.slice('--rami-levy-delay-ms='.length));
    } else if (a === '--crawl-shufersal') {
      args.crawlShufersal = true;
    } else if (a.startsWith('--shufersal-max-requests=')) {
      args.shufersalCrawlMaxRequests = Number(a.slice('--shufersal-max-requests='.length));
    } else if (a.startsWith('--shufersal-max-depth=')) {
      args.shufersalCrawlMaxDepth = Number(a.slice('--shufersal-max-depth='.length));
    } else if (a.startsWith('--shufersal-delay-ms=')) {
      args.shufersalCrawlDelayMs = Number(a.slice('--shufersal-delay-ms='.length));
    } else if (a === '--no-names') {
      args.noNames = true;
    } else if (a === '--refine-only') {
      args.refineOnly = true;
    } else if (a === '--refine-after') {
      args.refineAfter = true;
    } else if (a === '--no-refine-after') {
      args.refineAfter = false;
    } else if (a === '--semantic-refine') {
      args.semanticRefine = true;
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
      'Usage: pnpm map:products [-- --opts]',
      '',
      '  --retailer=both|shufersal|rami-levy   Which chain(s) to process (default both)',
      '  --dry-run                             Compute counts; do not write to DB',
      '  --overwrite                           Replace existing commonCategoryId values',
      '                                        (default behavior is already RL-first: RL overwrites,',
      '                                        Shufersal does not overwrite RL assignments).',
      '  --overwrite=rami-levy                 Only overwrite during Stage A',
      '  --overwrite=shufersal                 Only overwrite during Stage B',
      '  --no-names                            Skip name/brand enrichment (categories only)',
      '  --refine-only                         Skip chain harvest; only re-evaluate stored',
      '                                        CanonicalProduct rows against their own names',
      '                                        (cheap, no network).',
      '  --refine-after                        Run the name-aware refine pass over EVERY',
      '                                        canonical row after the chain harvest+assign',
      '                                        (DEFAULT: off).',
      '  --no-refine-after                     Disable the post-assign refine pass.',
      '  --semantic-refine                     Legacy: enable semantic name-based reassignment',
      '                                        inside Stage A/B (DEFAULT: off; alias-only mapping).',
      '  --shufersal-cache=PATH                Directory of cached Shufersal HTML',
      '                                        (default <repo>/data/processed/categories/.cache/shufersal)',
      '  --crawl-shufersal                     Refresh the Shufersal cache before harvesting',
      '  --shufersal-max-requests=N            Cap on Shufersal HTTP requests (default 1500)',
      '  --shufersal-max-depth=N               BFS depth cap (default 6)',
      '  --shufersal-delay-ms=N                Delay between Shufersal HTTP calls (default 10000)',
      '  --rami-levy-delay-ms=N                Delay between /api/catalog calls (default 250ms)',
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

function ramiLevyEntries(products: readonly RamiLevyEnumeratedProduct[]): ChainResolverEntry[] {
  return products.map((p) => {
    const chain: string[] = [];
    if (p.subGroupId != null) chain.push(String(p.subGroupId));
    if (p.groupId != null) chain.push(String(p.groupId));
    chain.push(String(p.departmentId));
    return {
      key: p.barcode,
      candidateChainCodes: chain,
      name: p.name && p.name.length > 0 ? p.name : undefined,
      brand: p.brand,
      imageUrl: p.imageUrl,
    };
  });
}

function shufersalEntries(cards: readonly ShufersalProductCard[]): ChainResolverEntry[] {
  return cards.map((c) => ({
    key: c.productCode,
    candidateChainCodes: c.chainCodes,
    name: c.name,
    imageUrl: c.imageUrl,
  }));
}

function summarizeReport(report: AssignmentReport): string {
  const lines: string[] = [];
  lines.push(
    `[${report.retailer}] resolved ${report.productsResolvedToBackbone}/${report.productsConsidered} chain products to a backbone leaf`,
  );
  lines.push(`  retailer rows matched: ${report.retailerProductsMatched}`);
  if (report.retailerProductsChainCategoryUpdated !== undefined) {
    lines.push(
      `  retailer catalog fields on RetailerProduct (dept/group/sub/image): ${report.retailerProductsChainCategoryUpdated} updated`,
    );
  }
  lines.push(
    `  canonical category writes: ${report.canonicalProductsCategoryUpdated} updated, ${report.canonicalProductsCategorySkipped} skipped (already set)`,
  );
  lines.push(
    `  canonical name writes: ${report.canonicalProductsNameUpdated}; brand writes: ${report.canonicalProductsBrandUpdated}; image writes: ${report.canonicalProductsImageUpdated}`,
  );
  const refineEntries = Object.entries(report.refineSummary).filter(([, n]) => n > 0);
  if (refineEntries.length > 0) {
    lines.push('  name-aware refinement:');
    for (const [reason, count] of refineEntries.sort((a, b) => b[1] - a[1])) {
      lines.push(`    ${reason.padEnd(38)} ${count}`);
    }
  }
  if (report.refineSamples.length > 0) {
    lines.push('  refinement examples (alias → final):');
    for (const s of report.refineSamples.slice(0, 8)) {
      const before = s.aliasLeafId ?? '∅';
      const after = s.finalLeafId ?? '∅ (cleared)';
      const conf = s.aliasConfidence !== undefined ? `@${s.aliasConfidence.toFixed(2)}` : '';
      lines.push(
        `    [${s.reason}] "${s.productName}"  ${before}${conf} → ${after}`,
      );
    }
  }
  if (report.topNameDeltas.length > 0) {
    lines.push('  top name upgrades (was → now):');
    for (const d of report.topNameDeltas.slice(0, 5)) {
      const oldDisplay = d.oldName.length > 0 ? d.oldName : '∅';
      lines.push(`    +${d.gain.toString().padStart(3)}  "${oldDisplay}"  →  "${d.newName}"`);
    }
  }
  lines.push('  top backbone leaves by canonical-product count:');
  for (const r of report.perBackboneLeaf.slice(0, 12)) {
    lines.push(`    ${r.categoryId.padEnd(28)} ${r.count}`);
  }
  if (report.unresolvedSamples.length > 0) {
    lines.push(`  unresolved chain codes (samples): ${report.unresolvedSamples.join(', ')}`);
  }
  return lines.join('\n');
}

async function runRefineBackfill(opts: { dryRun: boolean }): Promise<void> {
  console.log('— Refine pass — re-evaluating every canonical row against its own name —');
  const prisma = getPrismaClient();
  const total = await prisma.canonicalProduct.count({
    where: { commonCategoryId: { not: null } },
  });
  // Live counters surfaced as `extra` columns on every progress print.
  const stats = { updated: 0, cleared: 0, unchanged: 0 };
  const progress = createProgress({
    label: 'refine',
    total,
    intervalMs: 2_000,
    extra: () => ({
      updated: stats.updated,
      cleared: stats.cleared,
      unchanged: stats.unchanged,
    }),
  });
  const t0 = Date.now();
  const result = await refineExistingCanonicalProducts(prisma as never, {
    dryRun: opts.dryRun,
    onBatch: ({ considered, updated, cleared, unchanged }) => {
      const delta = considered - progress.current();
      if (delta > 0) progress.tick(delta);
      stats.updated = updated;
      stats.cleared = cleared;
      stats.unchanged = unchanged;
    },
  });
  progress.finish();
  console.log(
    `[refine] considered ${result.considered} | updated ${result.updated} | cleared ${result.cleared} | unchanged ${result.unchanged} (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
  );
  const reasons = Object.entries(result.reasonCounts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (reasons.length > 0) {
    console.log('  decisions:');
    for (const [reason, count] of reasons) {
      console.log(`    ${reason.padEnd(38)} ${count}`);
    }
  }
  if (result.samples.length > 0) {
    // Group by reason so we can spot regressions; print a few per reason.
    const byReason = new Map<string, typeof result.samples>();
    for (const s of result.samples) {
      const list = byReason.get(s.reason) ?? [];
      list.push(s);
      byReason.set(s.reason, list);
    }
    console.log('  examples (before → after, grouped by reason):');
    for (const [reason, list] of byReason) {
      console.log(`    --- ${reason} ---`);
      for (const s of list.slice(0, 4)) {
        const before = s.before ?? '∅';
        const after = s.after ?? '∅ (cleared)';
        console.log(`      "${s.productName}"  ${before} → ${after}`);
      }
    }
  }
  if (opts.dryRun) console.log('  (dry-run: nothing was written)');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!process.env['DATABASE_URL']) {
    console.error('DATABASE_URL is not set; export it before running this CLI.');
    process.exit(1);
  }

  // --refine-only short-circuit: skip every chain harvest and just walk the DB.
  if (args.refineOnly) {
    await runRefineBackfill({ dryRun: args.dryRun });
    const prisma = getPrismaClient();
    const total = await prisma.canonicalProduct.count();
    const mapped = await prisma.canonicalProduct.count({
      where: { commonCategoryId: { not: null } },
    });
    const pct = total > 0 ? ((mapped / total) * 100).toFixed(1) : '0.0';
    console.log(
      `\n— Coverage —\ncanonical products: ${total} total | ${mapped} categorised (${pct}%)`,
    );
    return;
  }

  const repoRoot = await findRepoRoot(process.cwd());
  const cacheDir =
    args.shufersalCacheDir ?? path.join(repoRoot, 'data/processed/categories/.cache/shufersal');

  const reports: AssignmentReport[] = [];

  if (args.retailer === 'both' || args.retailer === 'rami-levy') {
    console.log('— Stage A — Rami Levy /api/catalog enumeration —');
    const t0 = Date.now();
    const result = await enumerateRamiLevyProducts({ delayMs: args.ramiLevyDelayMs });
    console.log(
      `[rami-levy] /api/catalog enumeration done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${result.products.length} products, ${result.products.filter((p) => p.brand).length} with brand`,
    );
    const report = await assignBackboneToCanonicalProducts(
      ramiLevyEntries(result.products),
      {
        retailer: 'rami-levy',
        overwrite: args.overwrite.ramiLevy,
        dryRun: args.dryRun,
        skipNames: args.noNames,
        enableSemanticRefine: args.semanticRefine,
        ramiLevyCatalogProducts: result.products,
      },
    );
    console.log(summarizeReport(report));
    reports.push(report);
  }

  if (args.retailer === 'both' || args.retailer === 'shufersal') {
    console.log('\n— Stage B — Shufersal HTML harvest —');
    const harvest = args.crawlShufersal
      ? await crawlShufersalForProducts({
          cacheDir,
          maxRequests: args.shufersalCrawlMaxRequests,
          maxDepth: args.shufersalCrawlMaxDepth,
          delayMs: args.shufersalCrawlDelayMs,
        })
      : await harvestShufersalCachedCards(cacheDir);
    console.log(
      `[shufersal] scanned ${harvest.filesScanned} cached pages, ${harvest.cardOccurrences} card occurrences, ${harvest.cards.length} unique products${'cacheOnly' in harvest && (harvest as { cacheOnly: boolean }).cacheOnly === false ? ' (after fresh crawl)' : ''}`,
    );
    if (harvest.cards.length === 0) {
      console.warn(
        `[shufersal] no cached cards found in ${cacheDir}. RetailerProduct chain fields will NOT be updated.`,
      );
      console.warn(
        `  Run \`pnpm enrich:shufersal\` or re-run with --crawl-shufersal.`,
      );
    } else {
      const withName = harvest.cards.filter((c) => c.name).length;
      console.log(
        `[shufersal] cards with full data-product-name: ${withName}/${harvest.cards.length}`,
      );

      console.log('— Shufersal → RetailerProduct (chain codes + image) —');
      const catalogPersist = await persistShufersalCatalog(harvest.cards, {
        dryRun: args.dryRun,
      });
      console.log(
        `  matched ${catalogPersist.retailerProductsMatched} RetailerProduct rows; updated ${catalogPersist.retailerProductsUpdated}`,
      );

      const report = await assignBackboneToCanonicalProducts(
        shufersalEntries(harvest.cards),
        {
          retailer: 'shufersal',
          overwrite: args.overwrite.shufersal,
          dryRun: args.dryRun,
          skipNames: args.noNames,
          enableSemanticRefine: args.semanticRefine,
          shufersalCatalogCards: harvest.cards,
        },
      );
      console.log(summarizeReport(report));
      reports.push(report);
    }
  }

  if (args.refineAfter) {
    console.log('');
    await runRefineBackfill({ dryRun: args.dryRun });
  }

  console.log('\n— Coverage —');
  const prisma = getPrismaClient();
  const total = await prisma.canonicalProduct.count();
  const mapped = await prisma.canonicalProduct.count({
    where: { commonCategoryId: { not: null } },
  });
  const named = await prisma.canonicalProduct.count({
    where: { displayNameHe: { not: null } },
  });
  const branded = await prisma.canonicalProduct.count({ where: { brand: { not: null } } });
  const imaged = await prisma.canonicalProduct.count({ where: { imageUrl: { not: null } } });
  const pct = total > 0 ? ((mapped / total) * 100).toFixed(1) : '0.0';
  console.log(
    `canonical products: ${total} total | ${mapped} categorised (${pct}%) | ${named} with HE name | ${branded} with brand | ${imaged} with image`,
  );
  if (args.dryRun) console.log('(dry-run: no rows were written)');
}

main()
  .catch((err) => {
    console.error('map-products failed:', err);
    process.exit(1);
  })
  .finally(() => getPrismaClient().$disconnect());
