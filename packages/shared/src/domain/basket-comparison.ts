import { z } from 'zod';
import { MoneyMinorSchema } from './money.js';
import {
  BasketComparisonLineResolutionSchema,
  ProductMatchTypeSchema,
} from './enums.js';

/**
 * Per bag-line outcome for one retailer/store basket in a comparison run.
 */
export const BasketComparisonItemResultSchema = z.object({
  id: z.string().min(1),
  shoppingBagItemId: z.string().min(1),
  resolution: BasketComparisonLineResolutionSchema,
  /**
   * When matched, how the line was matched to the chosen retailer product.
   * Undefined when `resolution` is MISSING.
   */
  matchType: ProductMatchTypeSchema.optional(),
  canonicalProductId: z.string().min(1).optional(),
  /** Retailer product used for pricing this line (substitute or equivalent). */
  chosenRetailerProductId: z.string().min(1).optional(),
  /** Line totals after quantity, for this retailer snapshot. */
  lineTotal: MoneyMinorSchema.optional(),
  lineTotalBeforePromotions: MoneyMinorSchema.optional(),
  linePromotionSavings: MoneyMinorSchema.optional(),
  /** Free-form explanation (e.g. substitute name). */
  detail: z.string().optional(),
});
export type BasketComparisonItemResult = z.infer<typeof BasketComparisonItemResultSchema>;

/**
 * Aggregated basket outcome for one retailer / store for a single comparison run.
 */
export const BasketComparisonRetailerResultSchema = z.object({
  id: z.string().min(1),
  retailerId: z.string().min(1),
  storeId: z.string().min(1),
  /** 1 = best (e.g. cheapest total), ascending for worse totals. */
  rank: z.number().int().positive(),
  totalPrice: MoneyMinorSchema,
  totalBeforePromotions: MoneyMinorSchema,
  promotionSavings: MoneyMinorSchema,
  /** Bag line ids with no fulfillable product at this retailer. */
  missingShoppingBagItemIds: z.array(z.string().min(1)),
  /** Bag line ids where a substitute or non-exact path was used. */
  substitutedShoppingBagItemIds: z.array(z.string().min(1)),
  exactMatchCount: z.number().int().nonnegative(),
  equivalentMatchCount: z.number().int().nonnegative(),
  substituteMatchCount: z.number().int().nonnegative(),
  /** 0–1 aggregate confidence for this basket construction. */
  confidenceScore: z.number().min(0).max(1),
  lineResults: z.array(BasketComparisonItemResultSchema),
});
export type BasketComparisonRetailerResult = z.infer<typeof BasketComparisonRetailerResultSchema>;

/**
 * Snapshot comparing a shopping bag across retailers at a point in time.
 */
export const BasketComparisonSchema = z.object({
  id: z.string().min(1),
  shoppingBagId: z.string().min(1),
  comparedAt: z.coerce.date(),
  /** Sorted by `rank` ascending when present. */
  retailerResults: z.array(BasketComparisonRetailerResultSchema).min(1),
  /**
   * Optional run-level confidence (e.g. weighted blend across retailers or
   * data completeness). Distinct from per-retailer `confidenceScore`.
   */
  overallConfidenceScore: z.number().min(0).max(1).optional(),
});
export type BasketComparison = z.infer<typeof BasketComparisonSchema>;
