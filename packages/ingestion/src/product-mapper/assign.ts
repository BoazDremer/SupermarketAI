/**
 * Resolve chain product → backbone `commonCategoryId` and persist enriched
 * data (name, brand) onto `CanonicalProduct` rows.
 *
 * For a chain category code we prefer the MOST SPECIFIC alias available
 * (e.g. group-level "225" over dept-level "54", or `A0411` over `A04`),
 * falling back to ancestors only when the deeper code isn't aliased yet.
 *
 * Beyond the category, each input record may also carry the full
 * (untruncated) Hebrew name and the brand string from the chain's catalog.
 * We propagate those onto the canonical record under conservative rules so a
 * second retailer mapping the same barcode does not regress earlier data.
 */

import { getPrismaClient } from '@supermarket-price-compare/db';

import { persistRamiLevyChainCategories } from './persist-rl-chain-categories.js';
import {
  emptyRefineSummary,
  refineAssignment,
  type RefineDecision,
  type RefineSummary,
} from './refine.js';
import type { RamiLevyEnumeratedProduct } from './rami-levy.js';
import { persistShufersalCatalog } from './persist-shufersal-catalog.js';
import type { ShufersalProductCard } from './shufersal.js';
import {
  expandShufersalEntryLookupKeys,
  expandShufersalHarvestLookupKeys,
} from './shufersal-lookup-keys.js';
import { createProgress } from '../progress.js';

export { expandShufersalHarvestLookupKeys } from './shufersal-lookup-keys.js';

function entryLookupKeys(
  retailer: 'rami-levy' | 'shufersal',
  entry: ChainResolverEntry,
): string[] {
  if (retailer === 'shufersal') {
    return expandShufersalEntryLookupKeys({
      key: entry.key,
      imageUrl: entry.imageUrl,
    });
  }
  return expandShufersalHarvestLookupKeys(retailer, entry.key);
}

export type ChainResolverEntry = {
  /** Lookup key (RetailerProduct.barcode and externalItemCode are equal in our data). */
  key: string;
  /**
   * Ordered list of chain category codes for this product, FROM most specific
   * to least specific. The first code that has a backbone alias wins.
   */
  candidateChainCodes: string[];
  /** Full untruncated Hebrew name from the chain catalog, if known. */
  name?: string;
  /** Brand string from the chain catalog, if known. */
  brand?: string;
  /** Absolute image URL from the chain catalog, if known. */
  imageUrl?: string;
};

export type AssignmentReport = {
  retailer: 'rami-levy' | 'shufersal';
  productsConsidered: number;
  productsResolvedToBackbone: number;
  retailerProductsMatched: number;
  canonicalProductsCategoryUpdated: number;
  canonicalProductsCategorySkipped: number; // already had a value, --no-overwrite
  canonicalProductsNameUpdated: number;
  canonicalProductsBrandUpdated: number;
  canonicalProductsImageUpdated: number;
  /** `RetailerProduct` rows updated with chain catalog fields (dept/group/sub/image). */
  retailerProductsChainCategoryUpdated?: number;
  perBackboneLeaf: Array<{ categoryId: string; count: number }>;
  /** Up to 10 examples of (oldName → newName) where the catalog name was much longer. */
  topNameDeltas: Array<{ oldName: string; newName: string; gain: number }>;
  unresolvedSamples: string[]; // up to 10 chain codes that had no alias
  /** Tally of name-aware refinement decisions (counted per canonical write). */
  refineSummary: RefineSummary;
  /** Up to 10 sample overrides for human review. */
  refineSamples: Array<{
    productName: string;
    aliasLeafId?: string;
    aliasConfidence?: number;
    finalLeafId?: string;
    reason: string;
  }>;
};

export type AliasEntry = { categoryId: string; confidence: number };

/**
 * Build a map (chainCategoryId → { categoryId, confidence }) for a given
 * retailer by reading `RetailerCategoryAlias`. Confidence lets the
 * name-aware refiner downgrade obviously-inherited (low confidence) aliases
 * when the product name disagrees.
 */
export async function loadAliasMap(
  retailerSlug: 'rami-levy' | 'shufersal',
): Promise<Map<string, AliasEntry>> {
  const prisma = getPrismaClient();
  const rows = await prisma.retailerCategoryAlias.findMany({
    where: { retailerSlug },
    select: { chainCategoryId: true, categoryId: true, confidence: true },
  });
  const m = new Map<string, AliasEntry>();
  for (const r of rows) {
    m.set(r.chainCategoryId, {
      categoryId: r.categoryId,
      confidence: typeof r.confidence === 'number' ? r.confidence : 0.5,
    });
  }
  return m;
}

/** Pick the deepest aliased chain code from an ordered candidate list. */
function resolveBackbone(
  candidates: readonly string[],
  aliasMap: Map<string, AliasEntry>,
): AliasEntry | undefined {
  for (const code of candidates) {
    const hit = aliasMap.get(code);
    if (hit) return hit;
  }
  return undefined;
}

export type AssignOptions = {
  retailer: 'rami-levy' | 'shufersal';
  /** When true, overwrite a CanonicalProduct.commonCategoryId already set. */
  overwrite?: boolean;
  /** Dry-run: compute counts but do not write. */
  dryRun?: boolean;
  /** Bulk update batch size (Postgres-friendly). */
  batchSize?: number;
  /**
   * When true, skip name/brand enrichment entirely — only category
   * assignment runs. Useful for fast re-categorization runs.
   */
  skipNames?: boolean;
  /**
   * Rami Levy catalog rows used to persist native dept/group/sub-group onto
   * `RetailerProduct`. Required when `retailer` is `rami-levy` if chain ids
   * should be written (supplied by `map:products` / `backfill:images`).
   */
  ramiLevyCatalogProducts?: readonly RamiLevyEnumeratedProduct[];
  /**
   * Shufersal HTML cards used to persist chain codes + image onto
   * `RetailerProduct` (supplied by `map:products` / `backfill:images`).
   */
  shufersalCatalogCards?: readonly ShufersalProductCard[];
  /**
   * Legacy toggle: when true, run name/brand-based semantic refinement on top
   * of alias-derived leaf assignment. Default false so assignments rely ONLY on
   * chain leaf mapping (`RetailerCategoryAlias`).
   */
  enableSemanticRefine?: boolean;
};

/**
 * Per-canonical accumulator while we walk all entries → retailer products →
 * canonical products. Multiple chain SKUs may map to the same canonical, so
 * we keep the longest name we ever see and the first non-empty brand.
 *
 * `aliasLeafId` and `aliasConfidence` are kept around so the **name-aware**
 * refiner (`refineAssignment`) can inspect them at write-time and decide
 * whether to override the chain-derived leaf.
 */
type CanonicalUpdate = {
  aliasLeafId?: string;
  aliasConfidence?: number;
  name?: string;
  brand?: string;
  imageUrl?: string;
};

/**
 * Resolve every entry to a backbone categoryId, harvest the best per-product
 * name + brand, then write everything back to `CanonicalProduct`.
 */
export async function assignBackboneToCanonicalProducts(
  entries: readonly ChainResolverEntry[],
  options: AssignOptions,
): Promise<AssignmentReport> {
  const {
    retailer,
    overwrite = false,
    dryRun = false,
    skipNames = false,
    enableSemanticRefine = false,
  } = options;
  const batchSize = options.batchSize ?? 500;
  const prisma = getPrismaClient();
  console.log(`[assign:${retailer}] loading alias map…`);
  const aliasMap = await loadAliasMap(retailer);
  console.log(
    `[assign:${retailer}] alias map loaded: ${aliasMap.size} chain codes → backbone ids`,
  );

  type ResolvedEntry = {
    aliasLeafId?: string;
    aliasConfidence?: number;
    name?: string;
    brand?: string;
    imageUrl?: string;
  };
  const keyToResolved = new Map<string, ResolvedEntry>();
  const unresolvedSet = new Set<string>();
  let productsResolvedToBackbone = 0;
  console.log(
    `[assign:${retailer}] resolving ${entries.length} chain entries against alias map…`,
  );
  const resolveProgress = createProgress({
    label: `assign:${retailer}:resolve`,
    total: entries.length,
    intervalMs: 1_000,
    extra: () => ({
      withAlias: productsResolvedToBackbone,
      noAlias: unresolvedSet.size,
    }),
  });
  for (const e of entries) {
    resolveProgress.tick();
    if (!e.key.trim()) continue;
    const aliasHit = resolveBackbone(e.candidateChainCodes, aliasMap);
    if (aliasHit) productsResolvedToBackbone += 1;
    else if (e.candidateChainCodes[0]) unresolvedSet.add(e.candidateChainCodes[0]);
    // Always store the entry — even without backbone, name/brand/image may
    // still be useful enrichment if we match a RetailerProduct by key.
    const resolved: ResolvedEntry = {
      aliasLeafId: aliasHit?.categoryId,
      aliasConfidence: aliasHit?.confidence,
      name: trimOrUndef(e.name),
      brand: skipNames ? undefined : trimOrUndef(e.brand),
      // imageUrl always flows; it's not part of the "names" enrichment that
      // skipNames disables, since image data is independent and cheap.
      imageUrl: trimOrUndef(e.imageUrl),
    };
    for (const k of entryLookupKeys(retailer, e)) {
      keyToResolved.set(k, resolved);
    }
  }
  resolveProgress.finish(
    `${productsResolvedToBackbone} resolved | ${unresolvedSet.size} chain codes without alias`,
  );

  function resolvedForRetailerProduct(rp: {
    barcode: string | null;
    externalItemCode: string;
  }): ResolvedEntry | undefined {
    const tryKeys = new Set<string>();
    if (rp.barcode) {
      for (const k of expandShufersalHarvestLookupKeys(retailer, rp.barcode)) tryKeys.add(k);
    }
    for (const k of expandShufersalHarvestLookupKeys(retailer, rp.externalItemCode)) tryKeys.add(k);
    for (const k of tryKeys) {
      const hit = keyToResolved.get(k);
      if (hit) return hit;
    }
    return undefined;
  }

  // canonicalProductId → accumulated update payload.
  const byCanonical = new Map<string, CanonicalUpdate>();
  let retailerProductsMatched = 0;
  const keys = [...keyToResolved.keys()];

  console.log(
    `[assign:${retailer}] joining ${keys.length} lookup keys against RetailerProduct (batch=${batchSize})…`,
  );
  const rpProgress = createProgress({
    label: `assign:${retailer}:retailer-products`,
    total: keys.length,
    intervalMs: 1_000,
    extra: () => ({ matched: retailerProductsMatched, canonicalAcc: byCanonical.size }),
  });
  for (let i = 0; i < keys.length; i += batchSize) {
    const batchKeys = keys.slice(i, i + batchSize);
    const expandedKeys = new Set<string>();
    for (const bk of batchKeys) {
      for (const k of expandShufersalHarvestLookupKeys(retailer, bk)) expandedKeys.add(k);
    }
    const lookupKeys = [...expandedKeys];
    const rps = await prisma.retailerProduct.findMany({
      where: {
        retailer: { slug: retailer },
        OR: [
          { barcode: { in: lookupKeys } },
          { externalItemCode: { in: lookupKeys } },
        ],
      },
      select: {
        barcode: true,
        externalItemCode: true,
        productMatches: { select: { canonicalProductId: true } },
      },
    });
    retailerProductsMatched += rps.length;
    for (const rp of rps) {
      const resolved = resolvedForRetailerProduct(rp);
      if (!resolved) continue;
      for (const pm of rp.productMatches) {
        const acc = byCanonical.get(pm.canonicalProductId) ?? {};
        // Keep the alias from the most-confident chain code we've seen for
        // this canonical (multiple SKUs may resolve to the same product).
        if (resolved.aliasLeafId) {
          if (
            !acc.aliasLeafId ||
            (resolved.aliasConfidence ?? 0) > (acc.aliasConfidence ?? 0)
          ) {
            acc.aliasLeafId = resolved.aliasLeafId;
            acc.aliasConfidence = resolved.aliasConfidence;
          }
        }
        if (
          !skipNames &&
          resolved.name &&
          (!acc.name || resolved.name.length > acc.name.length)
        ) {
          acc.name = resolved.name;
        }
        if (!skipNames && !acc.brand && resolved.brand) acc.brand = resolved.brand;
        if (!acc.imageUrl && resolved.imageUrl) acc.imageUrl = resolved.imageUrl;
        byCanonical.set(pm.canonicalProductId, acc);
      }
    }
    rpProgress.tick(batchKeys.length);
  }
  rpProgress.finish(
    `matched ${retailerProductsMatched} RetailerProduct rows → ${byCanonical.size} canonical aggregates`,
  );

  // Read current values so we can compute precise diffs and update only what
  // actually changes (also gives us the "name delta" for the run report).
  const canonicalIds = [...byCanonical.keys()];
  type Existing = {
    id: string;
    displayName: string;
    displayNameHe: string | null;
    transparencyNameHe: string | null;
    brand: string | null;
    commonCategoryId: string | null;
    imageUrl: string | null;
  };
  const existingById = new Map<string, Existing>();
  console.log(
    `[assign:${retailer}] fetching ${canonicalIds.length} CanonicalProduct rows for diffing…`,
  );
  const fetchProgress = createProgress({
    label: `assign:${retailer}:canonical-fetch`,
    total: canonicalIds.length,
    intervalMs: 1_000,
  });
  for (let i = 0; i < canonicalIds.length; i += batchSize) {
    const batch = canonicalIds.slice(i, i + batchSize);
    const rows = await prisma.canonicalProduct.findMany({
      where: { id: { in: batch } },
      select: {
        id: true,
        displayName: true,
        displayNameHe: true,
        transparencyNameHe: true,
        brand: true,
        commonCategoryId: true,
        imageUrl: true,
      },
    });
    for (const r of rows) existingById.set(r.id, r);
    fetchProgress.tick(batch.length);
  }
  fetchProgress.finish(`loaded ${existingById.size} rows`);

  // Resolve final category for each canonical row. Default behavior is strict
  // alias-only mapping (no semantic/name-based reassignment).
  type RefinedUpdate = CanonicalUpdate & {
    refinedLeafId?: string;
    refineDecision?: RefineDecision;
  };
  const refined = new Map<string, RefinedUpdate>();
  const refineSummary = emptyRefineSummary();
  const refineSamples: AssignmentReport['refineSamples'] = [];
  for (const [id, upd] of byCanonical) {
    const existing = existingById.get(id);
    const decision = enableSemanticRefine
      ? refineAssignment({
          name: existing?.displayNameHe ?? existing?.displayName ?? upd.name,
          extraNames: [
            existing?.transparencyNameHe ?? undefined,
            existing?.displayName ?? undefined,
            upd.name,
          ],
          brand: upd.brand ?? existing?.brand ?? undefined,
          aliasLeafId: upd.aliasLeafId,
          aliasConfidence: upd.aliasConfidence,
        })
      : ({
          finalLeafId: upd.aliasLeafId,
          reason: upd.aliasLeafId ? 'kept-alias' : 'no-alias-no-name-signal',
          aliasLeafId: upd.aliasLeafId,
          aliasConfidence: upd.aliasConfidence,
        } as RefineDecision);
    refineSummary[decision.reason] += 1;
    refined.set(id, { ...upd, refinedLeafId: decision.finalLeafId, refineDecision: decision });
    if (
      enableSemanticRefine &&
      refineSamples.length < 10 &&
      decision.aliasLeafId &&
      decision.finalLeafId !== decision.aliasLeafId
    ) {
      refineSamples.push({
        productName:
          existing?.displayNameHe ??
          existing?.displayName ??
          upd.name ??
          '(unknown)',
        aliasLeafId: decision.aliasLeafId,
        aliasConfidence: decision.aliasConfidence,
        finalLeafId: decision.finalLeafId,
        reason: decision.reason,
      });
    }
  }

  // Tally + per-leaf totals (counted on whatever the canonical's category
  // becomes after this run, even when overwrite skips the actual UPDATE).
  const perBackbone = new Map<string, number>();
  for (const [id, upd] of refined) {
    const existing = existingById.get(id);
    if (!existing) continue;
    const candidate = upd.refinedLeafId;
    const finalCategory =
      candidate && (overwrite || existing.commonCategoryId === null)
        ? candidate
        : existing.commonCategoryId ?? candidate;
    if (finalCategory) {
      perBackbone.set(finalCategory, (perBackbone.get(finalCategory) ?? 0) + 1);
    }
  }

  let canonicalProductsCategoryUpdated = 0;
  let canonicalProductsCategorySkipped = 0;
  let canonicalProductsNameUpdated = 0;
  let canonicalProductsBrandUpdated = 0;
  let canonicalProductsImageUpdated = 0;
  const nameDeltas: Array<{ oldName: string; newName: string; gain: number }> = [];

  if (!dryRun) {
    // Apply per-canonical updates, batched into transactions for throughput.
    const updateTuples: Array<{ id: string; data: Record<string, unknown> }> = [];
    for (const [id, upd] of refined) {
      const existing = existingById.get(id);
      if (!existing) continue;
      const data: Record<string, unknown> = {};

      // Category — use the refined leaf (alias resolved + name corroborated).
      const finalLeafId = upd.refinedLeafId;
      if (upd.aliasLeafId !== undefined) {
        if (existing.commonCategoryId === null || overwrite) {
          if (existing.commonCategoryId !== (finalLeafId ?? null)) {
            data['commonCategoryId'] = finalLeafId ?? null;
          }
        } else {
          canonicalProductsCategorySkipped += 1;
        }
      }

      // Name (Hebrew): Shufersal — keep transparency XML/price-file label once,
      // then always prefer the website `data-product-name` for displayNameHe
      // when it differs (not only when +4 chars longer). Other retailers: keep
      // the conservative "more informative" rule.
      const webName = trimOrUndef(upd.name);
      if (!skipNames && retailer === 'shufersal' && webName) {
        if (!existing.transparencyNameHe?.trim()) {
          const seed =
            existing.displayNameHe?.trim() || existing.displayName?.trim() || undefined;
          if (seed) data['transparencyNameHe'] = seed;
        }
        if ((existing.displayNameHe ?? '').trim() !== webName) {
          data['displayNameHe'] = webName;
          if (nameDeltas.length < 10) {
            nameDeltas.push({
              oldName: existing.displayNameHe ?? existing.displayName ?? '',
              newName: webName,
              gain: webName.length - (existing.displayNameHe?.length ?? 0),
            });
          }
        }
        if (
          (!existing.displayName || existing.displayName.trim().length === 0) &&
          webName
        ) {
          data['displayName'] = webName;
        }
      } else if (!skipNames && upd.name && isMoreInformative(upd.name, existing.displayNameHe)) {
        data['displayNameHe'] = upd.name;
        if (nameDeltas.length < 10) {
          nameDeltas.push({
            oldName: existing.displayNameHe ?? existing.displayName ?? '',
            newName: upd.name,
            gain: upd.name.length - (existing.displayNameHe?.length ?? 0),
          });
        }
      }

      // displayName fallback: only fill when blank, keep existing English-ish
      // text otherwise (we don't want to overwrite curated normalized names).
      if (
        retailer !== 'shufersal' &&
        !skipNames &&
        upd.name &&
        (existing.displayName === null ||
          existing.displayName === undefined ||
          existing.displayName.length === 0)
      ) {
        data['displayName'] = upd.name;
      }

      // Brand: only fill when null/empty.
      if (
        !skipNames &&
        upd.brand &&
        (existing.brand === null || existing.brand.length === 0)
      ) {
        data['brand'] = upd.brand;
      }

      // Image URL: only fill when null/empty (first writer wins per canonical;
      // if RL ran before Shufersal, the canonical keeps the RL image).
      if (
        upd.imageUrl &&
        (existing.imageUrl === null || existing.imageUrl.length === 0)
      ) {
        data['imageUrl'] = upd.imageUrl;
      }

      if (Object.keys(data).length > 0) {
        if ('commonCategoryId' in data) canonicalProductsCategoryUpdated += 1;
        if (
          'displayNameHe' in data ||
          'displayName' in data ||
          'transparencyNameHe' in data
        ) {
          canonicalProductsNameUpdated += 1;
        }
        if ('brand' in data) canonicalProductsBrandUpdated += 1;
        if ('imageUrl' in data) canonicalProductsImageUpdated += 1;
        updateTuples.push({ id, data });
      }
    }

    console.log(
      `[assign:${retailer}] writing ${updateTuples.length} CanonicalProduct updates (batch=${batchSize})…`,
    );
    const writeProgress = createProgress({
      label: `assign:${retailer}:write`,
      total: updateTuples.length,
      intervalMs: 1_000,
      extra: () => ({
        catUpdates: canonicalProductsCategoryUpdated,
        nameUpdates: canonicalProductsNameUpdated,
        imageUpdates: canonicalProductsImageUpdated,
      }),
    });
    for (let i = 0; i < updateTuples.length; i += batchSize) {
      const batch = updateTuples.slice(i, i + batchSize);
      await prisma.$transaction(
        batch.map((u) =>
          prisma.canonicalProduct.update({ where: { id: u.id }, data: u.data }),
        ),
      );
      writeProgress.tick(batch.length);
    }
    writeProgress.finish(`${updateTuples.length} rows written`);
  } else {
    // Dry-run: compute counters but no writes.
    for (const [id, upd] of refined) {
      const existing = existingById.get(id);
      if (!existing) continue;
      if (upd.aliasLeafId !== undefined) {
        if (existing.commonCategoryId === null || overwrite) {
          if (existing.commonCategoryId !== (upd.refinedLeafId ?? null)) {
            canonicalProductsCategoryUpdated += 1;
          }
        } else {
          canonicalProductsCategorySkipped += 1;
        }
      }
      const webNameDry = trimOrUndef(upd.name);
      if (!skipNames && retailer === 'shufersal' && webNameDry) {
        if (!existing.transparencyNameHe?.trim() && (existing.displayNameHe?.trim() || existing.displayName?.trim())) {
          canonicalProductsNameUpdated += 1;
        }
        if ((existing.displayNameHe ?? '').trim() !== webNameDry) {
          canonicalProductsNameUpdated += 1;
        }
      } else if (!skipNames && upd.name && isMoreInformative(upd.name, existing.displayNameHe)) {
        canonicalProductsNameUpdated += 1;
        if (nameDeltas.length < 10) {
          nameDeltas.push({
            oldName: existing.displayNameHe ?? existing.displayName ?? '',
            newName: upd.name,
            gain: upd.name.length - (existing.displayNameHe?.length ?? 0),
          });
        }
      }
      if (
        !skipNames &&
        upd.brand &&
        (existing.brand === null || existing.brand.length === 0)
      ) {
        canonicalProductsBrandUpdated += 1;
      }
      if (
        upd.imageUrl &&
        (existing.imageUrl === null || existing.imageUrl.length === 0)
      ) {
        canonicalProductsImageUpdated += 1;
      }
    }
  }

  const perBackboneLeaf = [...perBackbone.entries()]
    .map(([categoryId, count]) => ({ categoryId, count }))
    .sort((a, b) => b.count - a.count);
  nameDeltas.sort((a, b) => b.gain - a.gain);

  let retailerProductsChainCategoryUpdated: number | undefined;
  if (retailer === 'rami-levy' && options.ramiLevyCatalogProducts?.length) {
    const chainResult = await persistRamiLevyChainCategories(
      options.ramiLevyCatalogProducts,
      { dryRun, batchSize },
    );
    retailerProductsChainCategoryUpdated = chainResult.retailerProductsUpdated;
  }
  if (retailer === 'shufersal' && options.shufersalCatalogCards?.length) {
    const catalogResult = await persistShufersalCatalog(
      options.shufersalCatalogCards,
      { dryRun, batchSize },
    );
    retailerProductsChainCategoryUpdated = catalogResult.retailerProductsUpdated;
  }

  return {
    retailer,
    productsConsidered: entries.length,
    productsResolvedToBackbone,
    retailerProductsMatched,
    canonicalProductsCategoryUpdated,
    canonicalProductsCategorySkipped,
    canonicalProductsNameUpdated,
    canonicalProductsBrandUpdated,
    canonicalProductsImageUpdated,
    retailerProductsChainCategoryUpdated,
    perBackboneLeaf,
    topNameDeltas: nameDeltas,
    unresolvedSamples: [...unresolvedSet].slice(0, 10),
    refineSummary,
    refineSamples,
  };
}

function trimOrUndef(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * Decide whether the catalog-supplied name is meaningfully better than the
 * existing one. We treat any name that is at least 4 chars longer (or any
 * name when the existing slot is empty) as an upgrade, which catches the
 * "20-char truncation" symptom while ignoring noise like trailing whitespace.
 */
function isMoreInformative(candidate: string, current: string | null): boolean {
  if (!candidate) return false;
  if (!current || current.length === 0) return true;
  if (candidate === current) return false;
  return candidate.length >= current.length + 4;
}
