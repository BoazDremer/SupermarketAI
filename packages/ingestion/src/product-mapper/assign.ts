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
  perBackboneLeaf: Array<{ categoryId: string; count: number }>;
  /** Up to 10 examples of (oldName → newName) where the catalog name was much longer. */
  topNameDeltas: Array<{ oldName: string; newName: string; gain: number }>;
  unresolvedSamples: string[]; // up to 10 chain codes that had no alias
};

/**
 * Build a map (chainCategoryId → backbone categoryId) for a given retailer
 * by reading `RetailerCategoryAlias`.
 */
export async function loadAliasMap(
  retailerSlug: 'rami-levy' | 'shufersal',
): Promise<Map<string, string>> {
  const prisma = getPrismaClient();
  const rows = await prisma.retailerCategoryAlias.findMany({
    where: { retailerSlug },
    select: { chainCategoryId: true, categoryId: true },
  });
  const m = new Map<string, string>();
  for (const r of rows) m.set(r.chainCategoryId, r.categoryId);
  return m;
}

/** Pick the deepest aliased chain code from an ordered candidate list. */
function resolveBackbone(
  candidates: readonly string[],
  aliasMap: Map<string, string>,
): string | undefined {
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
};

/**
 * Per-canonical accumulator while we walk all entries → retailer products →
 * canonical products. Multiple chain SKUs may map to the same canonical, so
 * we keep the longest name we ever see and the first non-empty brand.
 */
type CanonicalUpdate = {
  backbone?: string;
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
  const { retailer, overwrite = false, dryRun = false, skipNames = false } = options;
  const batchSize = options.batchSize ?? 500;
  const prisma = getPrismaClient();
  const aliasMap = await loadAliasMap(retailer);

  type ResolvedEntry = {
    backbone?: string;
    name?: string;
    brand?: string;
    imageUrl?: string;
  };
  const keyToResolved = new Map<string, ResolvedEntry>();
  const unresolvedSet = new Set<string>();
  let productsResolvedToBackbone = 0;
  for (const e of entries) {
    const backbone = resolveBackbone(e.candidateChainCodes, aliasMap);
    if (backbone) productsResolvedToBackbone += 1;
    else if (e.candidateChainCodes[0]) unresolvedSet.add(e.candidateChainCodes[0]);
    // Always store the entry — even without backbone, name/brand/image may
    // still be useful enrichment if we match a RetailerProduct by key.
    keyToResolved.set(e.key, {
      backbone,
      name: trimOrUndef(e.name),
      brand: skipNames ? undefined : trimOrUndef(e.brand),
      // imageUrl always flows; it's not part of the "names" enrichment that
      // skipNames disables, since image data is independent and cheap.
      imageUrl: trimOrUndef(e.imageUrl),
    });
  }

  // canonicalProductId → accumulated update payload.
  const byCanonical = new Map<string, CanonicalUpdate>();
  let retailerProductsMatched = 0;
  const keys = [...keyToResolved.keys()];

  for (let i = 0; i < keys.length; i += batchSize) {
    const batchKeys = keys.slice(i, i + batchSize);
    const rps = await prisma.retailerProduct.findMany({
      where: {
        retailer: { slug: retailer },
        OR: [
          { barcode: { in: batchKeys } },
          { externalItemCode: { in: batchKeys } },
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
      const resolved =
        (rp.barcode && keyToResolved.get(rp.barcode)) ??
        keyToResolved.get(rp.externalItemCode);
      if (!resolved) continue;
      for (const pm of rp.productMatches) {
        const acc = byCanonical.get(pm.canonicalProductId) ?? {};
        if (!acc.backbone && resolved.backbone) acc.backbone = resolved.backbone;
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
  }

  // Read current values so we can compute precise diffs and update only what
  // actually changes (also gives us the "name delta" for the run report).
  const canonicalIds = [...byCanonical.keys()];
  type Existing = {
    id: string;
    displayName: string;
    displayNameHe: string | null;
    brand: string | null;
    commonCategoryId: string | null;
    imageUrl: string | null;
  };
  const existingById = new Map<string, Existing>();
  for (let i = 0; i < canonicalIds.length; i += batchSize) {
    const batch = canonicalIds.slice(i, i + batchSize);
    const rows = await prisma.canonicalProduct.findMany({
      where: { id: { in: batch } },
      select: {
        id: true,
        displayName: true,
        displayNameHe: true,
        brand: true,
        commonCategoryId: true,
        imageUrl: true,
      },
    });
    for (const r of rows) existingById.set(r.id, r);
  }

  // Tally + per-leaf totals (counted on whatever the canonical's category
  // becomes after this run, even when overwrite skips the actual UPDATE).
  const perBackbone = new Map<string, number>();
  for (const [id, upd] of byCanonical) {
    const existing = existingById.get(id);
    if (!existing) continue;
    const finalCategory =
      upd.backbone && (overwrite || existing.commonCategoryId === null)
        ? upd.backbone
        : existing.commonCategoryId ?? upd.backbone;
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
    for (const [id, upd] of byCanonical) {
      const existing = existingById.get(id);
      if (!existing) continue;
      const data: Record<string, unknown> = {};

      // Category.
      if (upd.backbone) {
        if (existing.commonCategoryId === null || overwrite) {
          if (existing.commonCategoryId !== upd.backbone) {
            data['commonCategoryId'] = upd.backbone;
          }
        } else {
          canonicalProductsCategorySkipped += 1;
        }
      }

      // Name (Hebrew). Update when the catalog name is non-trivially longer.
      if (!skipNames && upd.name && isMoreInformative(upd.name, existing.displayNameHe)) {
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
        if ('displayNameHe' in data || 'displayName' in data) {
          canonicalProductsNameUpdated += 1;
        }
        if ('brand' in data) canonicalProductsBrandUpdated += 1;
        if ('imageUrl' in data) canonicalProductsImageUpdated += 1;
        updateTuples.push({ id, data });
      }
    }

    for (let i = 0; i < updateTuples.length; i += batchSize) {
      const batch = updateTuples.slice(i, i + batchSize);
      await prisma.$transaction(
        batch.map((u) =>
          prisma.canonicalProduct.update({ where: { id: u.id }, data: u.data }),
        ),
      );
    }
  } else {
    // Dry-run: compute counters but no writes.
    for (const [id, upd] of byCanonical) {
      const existing = existingById.get(id);
      if (!existing) continue;
      if (upd.backbone) {
        if (existing.commonCategoryId === null || overwrite) {
          if (existing.commonCategoryId !== upd.backbone) {
            canonicalProductsCategoryUpdated += 1;
          }
        } else {
          canonicalProductsCategorySkipped += 1;
        }
      }
      if (!skipNames && upd.name && isMoreInformative(upd.name, existing.displayNameHe)) {
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
    perBackboneLeaf,
    topNameDeltas: nameDeltas,
    unresolvedSamples: [...unresolvedSet].slice(0, 10),
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
