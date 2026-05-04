import type { BasketComparisonRetailerResultApi } from '@/api/types';
import type { TFunction } from 'i18next';

/** Localized savings line derived from fixture totals (replaces English-only API string). */
export function savingsSummaryFromResults(
  retailerResults: BasketComparisonRetailerResultApi[],
  t: TFunction,
): string {
  const sorted = [...retailerResults].sort((a, b) => a.totalPrice.minorUnits - b.totalPrice.minorUnits);
  if (sorted.length < 2) return t('compare.savingsHint');
  const low = sorted[0]!.totalPrice.minorUnits;
  const high = sorted[sorted.length - 1]!.totalPrice.minorUnits;
  const savings = high - low;
  if (savings <= 0) return t('compare.savingsHint');
  return t('compare.savingsVsPriciest', { amount: (savings / 100).toFixed(2) });
}
