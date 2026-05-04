import { z } from 'zod';

/** How a retailer SKU was linked to a canonical product. */
export const ProductMatchTypeSchema = z.enum(['EXACT_BARCODE', 'EQUIVALENT', 'SUBSTITUTE']);
export type ProductMatchType = z.infer<typeof ProductMatchTypeSchema>;

/** Role of a product line inside a chain-defined promotion. */
export const RetailerPromotionItemRoleSchema = z.enum([
  'PRIMARY_TARGET',
  'QUALIFYING',
  'REWARD',
  'BUNDLE_COMPONENT',
]);
export type RetailerPromotionItemRole = z.infer<typeof RetailerPromotionItemRoleSchema>;

/** Coarse classification for ingestion and UI. */
export const RetailerPromotionKindSchema = z.enum([
  'UNKNOWN',
  'PRICE_OVERRIDE',
  'PERCENT_OFF',
  'MULTI_BUY',
  'THRESHOLD',
  'BOGO',
  'LOYALTY',
  'CART_LEVEL',
]);
export type RetailerPromotionKind = z.infer<typeof RetailerPromotionKindSchema>;

/**
 * How a shopping-bag line was fulfilled for a specific retailer basket
 * in a comparison snapshot.
 */
export const BasketComparisonLineResolutionSchema = z.enum([
  'EXACT_BARCODE',
  'EQUIVALENT',
  'SUBSTITUTE',
  'MISSING',
]);
export type BasketComparisonLineResolution = z.infer<
  typeof BasketComparisonLineResolutionSchema
>;
