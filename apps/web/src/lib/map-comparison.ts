import type { BasketComparisonApi, ComparisonTableRow } from '@/api/types';
import { formatIlsMinor } from '@/lib/money';

export function comparisonToTableRows(
  data: BasketComparisonApi,
  isHebrew: boolean,
): ComparisonTableRow[] {
  return [...data.retailerResults]
    .sort((a, b) => a.rank - b.rank)
    .map((r) => ({
      retailerId: r.retailerId,
      retailerName:
        isHebrew && r.retailerDisplayNameHe ? r.retailerDisplayNameHe : r.retailerDisplayName,
      totalLabel: formatIlsMinor(r.totalPrice.minorUnits),
      rank: r.rank,
      missingCount: r.missingShoppingBagItemIds.length,
      substituteCount: r.substituteMatchCount,
      exactCount: r.exactMatchCount,
      equivalentCount: r.equivalentMatchCount,
      promotionSavingsLabel: formatIlsMinor(r.promotionSavings.minorUnits),
    }));
}
