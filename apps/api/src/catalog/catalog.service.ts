import { Injectable, NotFoundException } from '@nestjs/common';
import type { ShoppingBagItem } from '@supermarket-price-compare/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';
import {
  categoryKeywords,
  hueForId,
  inferCategoryKey,
  type CategoryKey,
} from './categorizer';

/**
 * Where in the backbone a search request lives — a single leaf or a whole
 * group (in which case we match every leaf with that group prefix).
 */
type CategoryIdScope = { kind: 'leaf'; id: string } | { kind: 'group'; id: string };

function buildCommonCategoryIdClause(scope: CategoryIdScope): Record<string, unknown> {
  if (scope.kind === 'leaf') {
    return { commonCategoryId: scope.id };
  }
  // Group → match the group itself (rare) and any leaf nested under it.
  return {
    OR: [
      { commonCategoryId: scope.id },
      { commonCategoryId: { startsWith: `${scope.id}/` } },
    ],
  };
}

/**
 * Minimum number of cleanly-mapped products in a leaf/group before we drop
 * the keyword-based fallback. Below this, we keep the fallback so newly-added
 * leaves are not embarrassingly empty during the data-coverage ramp-up.
 *
 * Override at boot via env `CATALOG_KEYWORD_FALLBACK_FLOOR`.
 */
const KEYWORD_FALLBACK_FLOOR = (() => {
  const raw = process.env['CATALOG_KEYWORD_FALLBACK_FLOOR'];
  if (!raw) return 5;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 5;
})();

/** Stable badge order in the UI: known chains first, then any others A–Z. */
const RETAILER_SLUG_DISPLAY_ORDER = ['rami-levy', 'shufersal'] as const;

function sortRetailerSlugsForDisplay(slugs: readonly string[]): string[] {
  const set = new Set(slugs);
  const ordered: string[] = [];
  for (const s of RETAILER_SLUG_DISPLAY_ORDER) {
    if (set.has(s)) ordered.push(s);
  }
  const rest = [...set].filter((s) => !ordered.includes(s)).sort();
  return [...ordered, ...rest];
}

/** Snapshot of one canonical product enriched for the UI. */
export type CatalogProductListItem = {
  id: string;
  name: string;
  nameHe?: string;
  categoryKey?: string;
  brand: string;
  unit: string;
  priceRangeLabel: string;
  imageHue: number;
  /** Absolute https URL when we have one — UI falls back to imageHue. */
  imageUrl?: string;
  promoLabel?: string;
  barcodeGtin?: string;
  /**
   * Retailer slugs where this canonical has at least one matched
   * `RetailerProduct` (independent of whether a current price row exists).
   */
  availableRetailerSlugs: string[];
};

export type EnrichedShoppingBagItem = ShoppingBagItem & {
  name: string;
  nameHe?: string;
  brand: string;
  unit: string;
  priceRangeLabel: string;
  imageHue: number;
  imageUrl?: string;
  promoLabel?: string;
  availableRetailerSlugs: string[];
};

/** Internal aggregate used to compute price labels and hue from current prices. */
type CanonicalAggregate = {
  id: string;
  displayName: string;
  displayNameHe: string | null;
  brand: string | null;
  barcodeGtin: string | null;
  storedCategoryKey: string | null;
  imageUrl: string | null;
  /** First retailer-product representative for unit/pack info. */
  unitLabel: string | null;
  packDescription: string | null;
  /** Min/max current price across retailers (null when no current prices). */
  minMinor: number | null;
  maxMinor: number | null;
  retailerIdsWithPrice: string[];
  /** Distinct retailer slugs from matched `RetailerProduct` rows. */
  availableRetailerSlugs: string[];
};

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  // -------- Search --------

  /**
   * Search canonical products. Matches against `displayName`, `displayNameHe`,
   * `brand`, or `barcodeGtin`. Optionally restricts to a retailer (via current
   * prices) or a UI category (via keyword sweep across product names).
   *
   * Category resolution order:
   *   1. If the category id exists in `Category` (new backbone), use the
   *      synonyms/chain names registered against it.
   *   2. Otherwise fall back to the legacy `categoryKeywords()` heuristic
   *      (preserves /search?category=dairy URLs from before the migration).
   */
  async search(
    qRaw: string | undefined,
    retailerId: string | undefined,
    categoryId: string | undefined,
    limit: number,
    offset = 0,
  ): Promise<{ items: CatalogProductListItem[]; total: number }> {
    const q = qRaw?.trim() ?? '';

    const categoryKeywordList = categoryId
      ? await this.resolveCategoryKeywords(categoryId)
      : [];
    const categoryIdMatchScope = categoryId
      ? await this.resolveCategoryIdScope(categoryId)
      : null;
    // Decide whether keyword fallback is still needed for this scope: only
    // when the leaf/group has fewer cleanly-mapped products than the floor.
    // Without an id scope (e.g. legacy "dairy" key) we always allow it.
    const allowKeywordFallback = categoryIdMatchScope
      ? (await this.countMappedInScope(categoryIdMatchScope)) < KEYWORD_FALLBACK_FLOOR
      : true;
    const where = this.buildSearchWhere(
      q,
      retailerId,
      categoryKeywordList,
      categoryIdMatchScope,
      allowKeywordFallback,
    );

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    const [rawCount, rawProducts] = await Promise.all([
      this.prisma.client.canonicalProduct.count({ where }),
      this.prisma.client.canonicalProduct.findMany({
        where,
        // Stable ordering for paged scans: secondary key on `id` so two rows
        // with identical displayName never swap between requests.
        orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
        skip: safeOffset,
        take: safeLimit,
        include: {
          productMatches: {
            include: {
              retailerProduct: {
                select: {
                  id: true,
                  unitLabel: true,
                  packDescription: true,
                  retailer: { select: { slug: true } },
                  prices: {
                    where: { isCurrent: true },
                    select: {
                      amountMinor: true,
                      retailerId: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const aggregates = rawProducts.map((p) => this.aggregateCanonical(p));
    const items = aggregates.map((a) => this.toListItem(a));

    return { items, total: rawCount };
  }

  private buildSearchWhere(
    q: string,
    retailerId: string | undefined,
    categoryKws: readonly string[],
    categoryIdScope: CategoryIdScope | null,
    allowKeywordFallback: boolean,
  ): Record<string, unknown> {
    const and: Record<string, unknown>[] = [];

    if (q) {
      and.push({
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { displayNameHe: { contains: q } },
          { brand: { contains: q, mode: 'insensitive' } },
          { barcodeGtin: { equals: q } },
        ],
      });
    }

    // Category filter strategy:
    //   1. Default (well-mapped leaf): exact `commonCategoryId` match only.
    //      Keyword fallback is skipped to prevent false positives from
    //      Hebrew substring matches (e.g. "אטריות ביצים" / egg noodles
    //      matching the dairy/eggs keyword "ביצים").
    //   2. Sparse leaf (count < KEYWORD_FALLBACK_FLOOR): hybrid — exact
    //      `commonCategoryId` match OR keyword match against products that
    //      have no `commonCategoryId` yet, so the leaf is not empty.
    //   3. Legacy id with no DB row (e.g. "dairy"): keyword-only, since we
    //      have no backbone scope to filter on.
    const hasIdScope = categoryIdScope != null;
    const hasKeywords = categoryKws.length > 0 && allowKeywordFallback;
    if (hasIdScope || hasKeywords) {
      const branches: Record<string, unknown>[] = [];
      if (hasIdScope) branches.push(buildCommonCategoryIdClause(categoryIdScope));
      if (hasKeywords) {
        branches.push({
          AND: [
            { commonCategoryId: null },
            { OR: categoryKws.flatMap((kw) => this.keywordMatchClauses(kw)) },
          ],
        });
      }
      and.push(branches.length === 1 ? branches[0]! : { OR: branches });
    }

    if (retailerId) {
      and.push({
        productMatches: {
          some: {
            retailerProduct: {
              retailerId,
              prices: { some: { isCurrent: true } },
            },
          },
        },
      });
    }

    return and.length === 0 ? {} : { AND: and };
  }

  private async resolveCategoryKeywords(categoryId: string): Promise<string[]> {
    const fromDb = await this.categories.getKeywordsForCategoryId(categoryId);
    if (fromDb.length > 0) return fromDb;
    if (this.isLegacyCategoryKey(categoryId)) return categoryKeywords(categoryId);
    return [];
  }

  /**
   * Decide what `commonCategoryId` values qualify a product for the requested
   * category. Returns `null` if the id refers to a legacy heuristic key with
   * no DB row (those still rely on keyword matching alone).
   */
  private async resolveCategoryIdScope(categoryId: string): Promise<CategoryIdScope | null> {
    const found = await this.categories.findById(categoryId);
    if (!found) return null;
    if (found.isLeaf) return { kind: 'leaf', id: found.id };
    return { kind: 'group', id: found.id };
  }

  /**
   * How many canonical products are cleanly mapped (i.e. have
   * `commonCategoryId`) in the requested scope. Used to gate the keyword
   * fallback — a leaf with plenty of mapped products doesn't need it.
   */
  private async countMappedInScope(scope: CategoryIdScope): Promise<number> {
    return this.prisma.client.canonicalProduct.count({
      where: buildCommonCategoryIdClause(scope) as never,
    });
  }

  /**
   * Builds Prisma OR-clauses to test whether a product display name contains
   * the given keyword. Hebrew has no morphological boundaries that LIKE can
   * exploit, so a naive `contains "חלב"` matches "חלבון" (protein),
   * "תחליב" (emulsion), etc. To prevent that, short single-word Hebrew tokens
   * (≤ 5 chars, no space) are matched only at proper word boundaries:
   *
   *   ' חלב '  middle of the name
   *   'חלב '   start of the name
   *   ' חלב'   end of the name
   *   'חלב'    the entire name (rare, but possible)
   *
   * Multi-word phrases and longer tokens fall back to plain `contains`,
   * which is selective enough on its own.
   */
  private keywordMatchClauses(kw: string): Record<string, unknown>[] {
    const trimmed = kw.trim();
    if (!trimmed) return [];
    const isShortSingleWord = !/\s/.test(trimmed) && trimmed.length <= 5;
    if (!isShortSingleWord) {
      return [
        { displayName: { contains: trimmed, mode: 'insensitive' } },
        { displayNameHe: { contains: trimmed } },
      ];
    }
    return [
      { displayName: { contains: ` ${trimmed} `, mode: 'insensitive' } },
      { displayName: { startsWith: `${trimmed} `, mode: 'insensitive' } },
      { displayName: { endsWith: ` ${trimmed}`, mode: 'insensitive' } },
      { displayName: { equals: trimmed, mode: 'insensitive' } },
      { displayNameHe: { contains: ` ${trimmed} ` } },
      { displayNameHe: { startsWith: `${trimmed} ` } },
      { displayNameHe: { endsWith: ` ${trimmed}` } },
      { displayNameHe: { equals: trimmed } },
    ];
  }

  private isLegacyCategoryKey(value: string): value is CategoryKey {
    return [
      'dairy',
      'produce',
      'pantry',
      'beverages',
      'breakfast',
      'bakery',
      'meat',
      'baby',
    ].includes(value);
  }

  // -------- Single product --------

  async findOne(id: string): Promise<CatalogProductListItem> {
    const found = await this.prisma.client.canonicalProduct.findUnique({
      where: { id },
      include: {
        productMatches: {
          include: {
            retailerProduct: {
              select: {
                id: true,
                unitLabel: true,
                packDescription: true,
                retailer: { select: { slug: true } },
                prices: {
                  where: { isCurrent: true },
                  select: { amountMinor: true, retailerId: true },
                },
              },
            },
          },
        },
      },
    });
    if (!found) {
      throw new NotFoundException(`Product not found: ${id}`);
    }
    return this.toListItem(this.aggregateCanonical(found));
  }

  async tryFindOne(id: string): Promise<CatalogProductListItem | null> {
    try {
      return await this.findOne(id);
    } catch (err) {
      if (err instanceof NotFoundException) return null;
      throw err;
    }
  }

  // -------- Bag enrichment --------

  async enrichBagItems(items: readonly ShoppingBagItem[]): Promise<EnrichedShoppingBagItem[]> {
    const cids = Array.from(
      new Set(items.map((i) => i.canonicalProductId).filter((v): v is string => Boolean(v))),
    );
    const lookup = new Map<string, CatalogProductListItem>();
    if (cids.length > 0) {
      const rows = await this.prisma.client.canonicalProduct.findMany({
        where: { id: { in: cids } },
        include: {
          productMatches: {
            include: {
              retailerProduct: {
                select: {
                  id: true,
                  unitLabel: true,
                  packDescription: true,
                  retailer: { select: { slug: true } },
                  prices: {
                    where: { isCurrent: true },
                    select: { amountMinor: true, retailerId: true },
                  },
                },
              },
            },
          },
        },
      });
      for (const r of rows) {
        const item = this.toListItem(this.aggregateCanonical(r));
        lookup.set(item.id, item);
      }
    }

    return items.map((it) => this.enrichOne(it, lookup));
  }

  private enrichOne(
    item: ShoppingBagItem,
    lookup: Map<string, CatalogProductListItem>,
  ): EnrichedShoppingBagItem {
    const cid = item.canonicalProductId;
    const li = cid ? lookup.get(cid) : undefined;
    if (!li) {
      return {
        ...item,
        name: cid ?? 'Unknown product',
        nameHe: undefined,
        brand: '—',
        unit: '—',
        priceRangeLabel: '—',
        imageHue: hueForId(cid ?? 'unknown'),
        imageUrl: undefined,
        availableRetailerSlugs: [],
      };
    }
    return {
      ...item,
      name: li.name,
      nameHe: li.nameHe,
      brand: li.brand,
      unit: li.unit,
      priceRangeLabel: li.priceRangeLabel,
      imageHue: li.imageHue,
      imageUrl: li.imageUrl,
      promoLabel: li.promoLabel,
      availableRetailerSlugs: li.availableRetailerSlugs,
    };
  }

  // -------- Aggregation helpers --------

  private aggregateCanonical(p: CanonicalProductWithMatches): CanonicalAggregate {
    const retailerPriceMin = new Map<string, number>();
    const retailerSlugs = new Set<string>();
    let unitLabel: string | null = null;
    let packDescription: string | null = null;

    for (const pm of p.productMatches) {
      const rp = pm.retailerProduct;
      const slug = rp.retailer?.slug;
      if (slug) retailerSlugs.add(slug);
      if (rp.unitLabel && !unitLabel) unitLabel = rp.unitLabel;
      if (rp.packDescription && !packDescription) packDescription = rp.packDescription;
      for (const price of rp.prices) {
        const existing = retailerPriceMin.get(price.retailerId);
        if (existing === undefined || price.amountMinor < existing) {
          retailerPriceMin.set(price.retailerId, price.amountMinor);
        }
      }
    }

    const minors = [...retailerPriceMin.values()];
    const minMinor = minors.length === 0 ? null : Math.min(...minors);
    const maxMinor = minors.length === 0 ? null : Math.max(...minors);

    return {
      id: p.id,
      displayName: p.displayName,
      displayNameHe: p.displayNameHe,
      brand: p.brand,
      barcodeGtin: p.barcodeGtin,
      storedCategoryKey: p.categoryKey,
      imageUrl: p.imageUrl,
      unitLabel,
      packDescription,
      minMinor,
      maxMinor,
      retailerIdsWithPrice: [...retailerPriceMin.keys()],
      availableRetailerSlugs: sortRetailerSlugsForDisplay([...retailerSlugs]),
    };
  }

  private toListItem(a: CanonicalAggregate): CatalogProductListItem {
    const inferred = inferCategoryKey(a.displayName, a.displayNameHe ?? '', a.brand ?? '');
    return {
      id: a.id,
      name: a.displayName,
      nameHe: a.displayNameHe ?? undefined,
      categoryKey: a.storedCategoryKey ?? inferred,
      brand: a.brand ?? '—',
      unit: a.unitLabel ?? a.packDescription ?? '—',
      priceRangeLabel: this.priceRangeLabel(a.minMinor, a.maxMinor),
      imageHue: hueForId(a.barcodeGtin ?? a.id),
      imageUrl: a.imageUrl ?? undefined,
      barcodeGtin: a.barcodeGtin ?? undefined,
      availableRetailerSlugs: a.availableRetailerSlugs,
    };
  }

  private priceRangeLabel(minMinor: number | null, maxMinor: number | null): string {
    if (minMinor === null || maxMinor === null) return '—';
    const min = minMinor / 100;
    const max = maxMinor / 100;
    if (Math.abs(min - max) < 0.005) return `₪${min.toFixed(2)}`;
    return `₪${min.toFixed(2)} – ₪${max.toFixed(2)}`;
  }
}

// ---- Local helper types (mirrors the shape of the included select) ----

type CanonicalProductWithMatches = {
  id: string;
  displayName: string;
  displayNameHe: string | null;
  brand: string | null;
  barcodeGtin: string | null;
  categoryKey: string | null;
  imageUrl: string | null;
  productMatches: Array<{
    retailerProduct: {
      id: string;
      unitLabel: string | null;
      packDescription: string | null;
      retailer: { slug: string } | null;
      prices: Array<{ amountMinor: number; retailerId: string }>;
    };
  }>;
};
