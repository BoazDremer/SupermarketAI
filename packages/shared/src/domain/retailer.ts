import { z } from 'zod';

export const RetailerSchema = z.object({
  id: z.string().min(1),
  /** Stable code for ingestion and URLs (e.g. `shufersal`). */
  slug: z.string().min(1),
  displayName: z.string().min(1),
  /** Hebrew display name when different from `displayName`. */
  displayNameHe: z.string().optional(),
  /** Whether the chain is in scope for delivery comparison. */
  supportsDelivery: z.boolean(),
  websiteUrl: z.string().url().optional(),
  isActive: z.boolean(),
});
export type Retailer = z.infer<typeof RetailerSchema>;

export const RetailerStoreSchema = z.object({
  id: z.string().min(1),
  retailerId: z.string().min(1),
  /** Chain-native store / branch identifier when available. */
  externalStoreId: z.string().optional(),
  displayName: z.string().min(1),
  city: z.string().optional(),
  /** Delivery is offered from this store in MVP scope. */
  deliveryOffered: z.boolean(),
});
export type RetailerStore = z.infer<typeof RetailerStoreSchema>;
