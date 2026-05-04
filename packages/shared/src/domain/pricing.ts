import { z } from 'zod';
import { MoneyMinorSchema } from './money.js';
import { RetailerPromotionItemRoleSchema, RetailerPromotionKindSchema } from './enums.js';

/**
 * Shelf/catalog price for a retailer product at a store (point-in-time or effective range).
 */
export const RetailerPriceSchema = z.object({
  id: z.string().min(1),
  retailerId: z.string().min(1),
  storeId: z.string().min(1),
  retailerProductId: z.string().min(1),
  amount: MoneyMinorSchema,
  /** When this price becomes effective (inclusive). */
  effectiveFrom: z.coerce.date(),
  /** When this price stops being effective (exclusive), if known. */
  effectiveTo: z.coerce.date().optional(),
  /** When the price was observed or ingested. */
  observedAt: z.coerce.date(),
});
export type RetailerPrice = z.infer<typeof RetailerPriceSchema>;

/**
 * Chain promotion anchored to a retailer (and usually a store).
 * May apply to one or more products via `RetailerPromotionItem`.
 */
export const RetailerPromotionSchema = z.object({
  id: z.string().min(1),
  retailerId: z.string().min(1),
  storeId: z.string().min(1),
  kind: RetailerPromotionKindSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  /** Chain-native promotion id when available. */
  externalPromotionId: z.string().optional(),
  /** Structured terms when parsed (min qty, mix-and-match groups, etc.). */
  terms: z.record(z.unknown()).optional(),
});
export type RetailerPromotion = z.infer<typeof RetailerPromotionSchema>;

export const RetailerPromotionItemSchema = z.object({
  id: z.string().min(1),
  promotionId: z.string().min(1),
  retailerProductId: z.string().min(1),
  role: RetailerPromotionItemRoleSchema,
  /** Minimum units of this product to trigger or qualify, when applicable. */
  minQuantity: z.number().positive().optional(),
  /** Fixed promo line price when the promotion defines one. */
  promoPrice: MoneyMinorSchema.optional(),
  /** Percent discount 0–100 when the promotion defines one. */
  percentOff: z.number().min(0).max(100).optional(),
  /** Opaque per-line metadata from the feed. */
  rawMetadata: z.record(z.unknown()).optional(),
});
export type RetailerPromotionItem = z.infer<typeof RetailerPromotionItemSchema>;
