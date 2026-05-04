import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  BasketComparison,
  BasketComparisonItemResult,
  BasketComparisonRetailerResult,
} from '@supermarket-price-compare/shared';
import { PrismaService } from '../prisma/prisma.service';

type MissingItemDto = {
  lineId: string;
  requestedName: string;
  retailerName: string;
  retailerNameHe?: string;
  retailerId?: string;
};

type SubstitutionSuggestionDto = {
  id: string;
  name: string;
  reason: string;
  priceRangeLabel: string;
};

/**
 * API DTO returned for `/shopping-bags/:id/compare` and
 * `/basket-comparisons/:id`. Decorates each retailer result with the
 * retailer's display names so the UI can render without a separate
 * lookup.
 */
export type BasketComparisonDto = BasketComparison & {
  savingsBestVsWorstLabel: string;
  missing: MissingItemDto[];
  substitutions: SubstitutionSuggestionDto[];
  retailerResults: Array<
    BasketComparisonRetailerResult & {
      retailerDisplayName: string;
      retailerDisplayNameHe?: string;
      retailerSlug: string;
    }
  >;
};

const ILS = 'ILS' as const;

function money(minor: number): { currency: typeof ILS; minorUnits: number } {
  return { currency: ILS, minorUnits: Math.max(0, Math.round(minor)) };
}

@Injectable()
export class BasketComparisonService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compare a shopping bag across all retailers that currently have at
   * least one storefront with current prices, persist the result, and
   * return the API DTO.
   */
  async compareShoppingBag(bagId: string): Promise<BasketComparisonDto> {
    const bag = await this.prisma.client.shoppingBag.findUnique({
      where: { id: bagId },
      include: {
        items: {
          include: {
            canonicalProduct: {
              include: {
                productMatches: {
                  include: {
                    retailerProduct: {
                      include: {
                        prices: {
                          where: { isCurrent: true },
                          orderBy: { amountMinor: 'asc' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!bag) {
      throw new NotFoundException(`Shopping bag not found: ${bagId}`);
    }

    const retailers = await this.prisma.client.retailer.findMany({
      where: { isActive: true },
      include: {
        stores: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { displayName: 'asc' },
    });

    if (retailers.length === 0) {
      throw new NotFoundException(
        'No active retailers in the database. Run the ingestion pipeline first.',
      );
    }

    type RetailerResultBuild = BasketComparisonRetailerResult & {
      retailerDisplayName: string;
      retailerDisplayNameHe?: string;
      retailerSlug: string;
      _missingNames: Array<{ lineId: string; name: string }>;
    };
    const retailerResults: RetailerResultBuild[] = [];

    for (const retailer of retailers) {
      const store = retailer.stores[0];
      if (!store) continue;

      const lineResults: BasketComparisonItemResult[] = [];
      const missingShoppingBagItemIds: string[] = [];
      const substitutedShoppingBagItemIds: string[] = [];
      const missingNames: Array<{ lineId: string; name: string }> = [];
      let totalBefore = 0;
      let totalAfter = 0;
      const promoTotal = 0;
      let exact = 0;
      let equiv = 0;
      let sub = 0;

      for (const item of bag.items) {
        const cid = item.canonicalProductId;
        const canonical = item.canonicalProduct;
        const qty = decimalToNumber(item.quantity);
        const requestedName = canonical?.displayName ?? cid ?? 'Unknown';

        if (!cid || !canonical) {
          lineResults.push({
            id: cuid(),
            shoppingBagItemId: item.id,
            resolution: 'MISSING',
            detail: 'No canonical product on bag line',
          });
          missingShoppingBagItemIds.push(item.id);
          missingNames.push({ lineId: item.id, name: requestedName });
          continue;
        }

        const matches = canonical.productMatches.filter(
          (pm) => pm.retailerProduct.retailerId === retailer.id,
        );
        const cheapest = pickCheapestMatch(matches);
        if (!cheapest) {
          lineResults.push({
            id: cuid(),
            shoppingBagItemId: item.id,
            resolution: 'MISSING',
            canonicalProductId: cid,
            detail: `Not sold at ${retailer.displayName}`,
          });
          missingShoppingBagItemIds.push(item.id);
          missingNames.push({ lineId: item.id, name: requestedName });
          continue;
        }

        const baseLine = cheapest.unitMinor * qty;
        totalBefore += baseLine;
        totalAfter += baseLine;

        const matchType = cheapest.matchType;
        if (matchType === 'EXACT_BARCODE') exact += 1;
        else if (matchType === 'EQUIVALENT') equiv += 1;
        else if (matchType === 'SUBSTITUTE') {
          sub += 1;
          substitutedShoppingBagItemIds.push(item.id);
        }

        lineResults.push({
          id: cuid(),
          shoppingBagItemId: item.id,
          resolution: matchType,
          matchType,
          canonicalProductId: cid,
          chosenRetailerProductId: cheapest.retailerProductId,
          lineTotal: money(baseLine),
          lineTotalBeforePromotions: money(baseLine),
          linePromotionSavings: money(0),
          detail: cheapest.detail,
        });
      }

      const lineCount = Math.max(1, bag.items.length);
      const confidenceScore = Math.max(
        0,
        Math.min(
          1,
          bag.items.length === 0
            ? 1
            : 1 -
                missingShoppingBagItemIds.length / lineCount -
                substitutedShoppingBagItemIds.length * 0.05,
        ),
      );

      retailerResults.push({
        id: cuid(),
        retailerId: retailer.id,
        storeId: store.id,
        rank: 0,
        totalPrice: money(totalAfter),
        totalBeforePromotions: money(totalBefore),
        promotionSavings: money(promoTotal),
        missingShoppingBagItemIds,
        substitutedShoppingBagItemIds,
        exactMatchCount: exact,
        equivalentMatchCount: equiv,
        substituteMatchCount: sub,
        confidenceScore,
        lineResults,
        retailerDisplayName: retailer.displayName,
        retailerDisplayNameHe: retailer.displayNameHe ?? undefined,
        retailerSlug: retailer.slug,
        _missingNames: missingNames,
      });
    }

    if (retailerResults.length === 0) {
      throw new NotFoundException(
        'No retailers with at least one store available for comparison.',
      );
    }

    const sorted = [...retailerResults].sort(
      (a, b) => a.totalPrice.minorUnits - b.totalPrice.minorUnits,
    );
    const ranked = retailerResults.map((r) => ({
      ...r,
      rank: sorted.findIndex((x) => x.id === r.id) + 1,
    }));

    const best = sorted[0]?.totalPrice.minorUnits ?? 0;
    const worst = sorted[sorted.length - 1]?.totalPrice.minorUnits ?? 0;
    const savingsMinor = worst - best;
    const savingsBestVsWorstLabel =
      sorted.length < 2 || savingsMinor <= 0
        ? 'Add items at multiple retailers to see savings.'
        : `Up to ₪${(savingsMinor / 100).toFixed(2)} vs the priciest retailer.`;

    const missing: MissingItemDto[] = [];
    for (const rr of ranked) {
      for (const m of rr._missingNames) {
        missing.push({
          lineId: m.lineId,
          requestedName: m.name,
          retailerName: rr.retailerDisplayName,
          retailerNameHe: rr.retailerDisplayNameHe,
          retailerId: rr.retailerId,
        });
      }
    }

    const substitutions: SubstitutionSuggestionDto[] = [];

    const persisted = await this.persistComparison(
      bag.id,
      ranked,
      Number(
        (
          ranked.reduce((acc, r) => acc + r.confidenceScore, 0) / ranked.length
        ).toFixed(4),
      ),
    );

    return {
      id: persisted.id,
      shoppingBagId: bag.id,
      comparedAt: persisted.comparedAt,
      overallConfidenceScore: persisted.overallConfidenceScore ?? undefined,
      retailerResults: ranked
        .map((r) => stripInternal(r))
        .sort((a, b) => a.rank - b.rank),
      savingsBestVsWorstLabel,
      missing,
      substitutions,
    };
  }

  async findOne(id: string): Promise<BasketComparisonDto> {
    const cmp = await this.prisma.client.basketComparison.findUnique({
      where: { id },
      include: {
        retailerResults: {
          include: {
            retailer: true,
            store: true,
            lineResults: true,
          },
        },
      },
    });
    if (!cmp) {
      throw new NotFoundException(`Basket comparison not found: ${id}`);
    }
    const ranked = cmp.retailerResults
      .map((rr) => ({
        id: rr.id,
        retailerId: rr.retailerId,
        storeId: rr.storeId,
        rank: rr.rank,
        totalPrice: money(rr.totalMinor),
        totalBeforePromotions: money(rr.totalBeforePromotionsMinor),
        promotionSavings: money(rr.promotionSavingsMinor),
        missingShoppingBagItemIds: jsonStringArray(rr.missingShoppingBagItemIds),
        substitutedShoppingBagItemIds: jsonStringArray(rr.substitutedShoppingBagItemIds),
        exactMatchCount: rr.exactMatchCount,
        equivalentMatchCount: rr.equivalentMatchCount,
        substituteMatchCount: rr.substituteMatchCount,
        confidenceScore: rr.confidenceScore,
        lineResults: rr.lineResults.map((lr): BasketComparisonItemResult => ({
          id: lr.id,
          shoppingBagItemId: lr.shoppingBagItemId,
          resolution: lr.resolution,
          matchType: lr.matchType ?? undefined,
          canonicalProductId: lr.canonicalProductId ?? undefined,
          chosenRetailerProductId: lr.chosenRetailerProductId ?? undefined,
          lineTotal:
            lr.lineTotalMinor !== null && lr.lineTotalMinor !== undefined
              ? money(lr.lineTotalMinor)
              : undefined,
          lineTotalBeforePromotions:
            lr.lineTotalBeforePromotionsMinor !== null &&
            lr.lineTotalBeforePromotionsMinor !== undefined
              ? money(lr.lineTotalBeforePromotionsMinor)
              : undefined,
          linePromotionSavings:
            lr.linePromotionSavingsMinor !== null &&
            lr.linePromotionSavingsMinor !== undefined
              ? money(lr.linePromotionSavingsMinor)
              : undefined,
          detail: lr.detail ?? undefined,
        })),
        retailerDisplayName: rr.retailer.displayName,
        retailerDisplayNameHe: rr.retailer.displayNameHe ?? undefined,
        retailerSlug: rr.retailer.slug,
      }))
      .sort((a, b) => a.rank - b.rank);

    const best = ranked[0]?.totalPrice.minorUnits ?? 0;
    const worst = ranked[ranked.length - 1]?.totalPrice.minorUnits ?? 0;
    const savingsMinor = worst - best;
    const savingsBestVsWorstLabel =
      ranked.length < 2 || savingsMinor <= 0
        ? 'Add items at multiple retailers to see savings.'
        : `Up to ₪${(savingsMinor / 100).toFixed(2)} vs the priciest retailer.`;

    const missing: MissingItemDto[] = [];
    for (const rr of ranked) {
      const ids = rr.missingShoppingBagItemIds;
      if (ids.length === 0) continue;
      const items = await this.prisma.client.shoppingBagItem.findMany({
        where: { id: { in: ids } },
        include: { canonicalProduct: true },
      });
      const lookup = new Map(items.map((i) => [i.id, i]));
      for (const lid of ids) {
        const it = lookup.get(lid);
        missing.push({
          lineId: lid,
          requestedName:
            it?.canonicalProduct?.displayName ?? it?.canonicalProductId ?? 'Unknown',
          retailerName: rr.retailerDisplayName,
          retailerNameHe: rr.retailerDisplayNameHe,
          retailerId: rr.retailerId,
        });
      }
    }

    return {
      id: cmp.id,
      shoppingBagId: cmp.shoppingBagId,
      comparedAt: cmp.comparedAt,
      overallConfidenceScore: cmp.overallConfidenceScore ?? undefined,
      retailerResults: ranked,
      savingsBestVsWorstLabel,
      missing,
      substitutions: [],
    };
  }

  // -------- Persistence --------

  private async persistComparison(
    shoppingBagId: string,
    retailerResults: ReadonlyArray<
      BasketComparisonRetailerResult & {
        retailerDisplayName: string;
        retailerDisplayNameHe?: string;
        retailerSlug: string;
      }
    >,
    overallConfidenceScore: number,
  ): Promise<{ id: string; comparedAt: Date; overallConfidenceScore: number | null }> {
    const created = await this.prisma.client.basketComparison.create({
      data: {
        shoppingBagId,
        overallConfidenceScore,
        retailerResults: {
          create: retailerResults.map((rr) => ({
            retailerId: rr.retailerId,
            storeId: rr.storeId,
            rank: rr.rank,
            totalMinor: rr.totalPrice.minorUnits,
            totalBeforePromotionsMinor: rr.totalBeforePromotions.minorUnits,
            promotionSavingsMinor: rr.promotionSavings.minorUnits,
            missingShoppingBagItemIds: rr.missingShoppingBagItemIds,
            substitutedShoppingBagItemIds: rr.substitutedShoppingBagItemIds,
            exactMatchCount: rr.exactMatchCount,
            equivalentMatchCount: rr.equivalentMatchCount,
            substituteMatchCount: rr.substituteMatchCount,
            confidenceScore: rr.confidenceScore,
            lineResults: {
              create: rr.lineResults.map((lr) => ({
                shoppingBagItemId: lr.shoppingBagItemId,
                resolution: lr.resolution,
                matchType: lr.matchType ?? null,
                canonicalProductId: lr.canonicalProductId ?? null,
                chosenRetailerProductId: lr.chosenRetailerProductId ?? null,
                lineTotalMinor: lr.lineTotal?.minorUnits ?? null,
                lineTotalBeforePromotionsMinor: lr.lineTotalBeforePromotions?.minorUnits ?? null,
                linePromotionSavingsMinor: lr.linePromotionSavings?.minorUnits ?? null,
                detail: lr.detail ?? null,
              })),
            },
          })),
        },
      },
    });
    return {
      id: created.id,
      comparedAt: created.comparedAt,
      overallConfidenceScore: created.overallConfidenceScore,
    };
  }
}

// ---- Local helpers ----

function pickCheapestMatch(
  matches: ReadonlyArray<{
    matchType: 'EXACT_BARCODE' | 'EQUIVALENT' | 'SUBSTITUTE';
    notes: string | null;
    retailerProduct: {
      id: string;
      prices: ReadonlyArray<{ amountMinor: number }>;
    };
  }>,
):
  | {
      retailerProductId: string;
      unitMinor: number;
      matchType: 'EXACT_BARCODE' | 'EQUIVALENT' | 'SUBSTITUTE';
      detail?: string;
    }
  | undefined {
  let best:
    | {
        retailerProductId: string;
        unitMinor: number;
        matchType: 'EXACT_BARCODE' | 'EQUIVALENT' | 'SUBSTITUTE';
        detail?: string;
      }
    | undefined;
  for (const m of matches) {
    const price = m.retailerProduct.prices[0];
    if (!price) continue;
    if (!best || price.amountMinor < best.unitMinor) {
      best = {
        retailerProductId: m.retailerProduct.id,
        unitMinor: price.amountMinor,
        matchType: m.matchType,
        detail: m.notes ?? undefined,
      };
    }
  }
  return best;
}

function decimalToNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toNumber?: () => number }).toNumber === 'function'
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function jsonStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

function cuid(): string {
  // Simple unique id; persisted IDs are produced by Prisma `@default(cuid())`.
  return `tmp_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function stripInternal<T extends { _missingNames?: unknown }>(value: T): Omit<T, '_missingNames'> {
  const { _missingNames: _ignored, ...rest } = value;
  return rest;
}
