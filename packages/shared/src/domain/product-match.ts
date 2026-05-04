import { z } from 'zod';
import { ProductMatchTypeSchema } from './enums.js';

/**
 * Directed link from a chain product to a canonical product.
 */
export const ProductMatchSchema = z.object({
  id: z.string().min(1),
  canonicalProductId: z.string().min(1),
  retailerProductId: z.string().min(1),
  matchType: ProductMatchTypeSchema,
  /** 0–1 confidence for EQUIVALENT / SUBSTITUTE; typically 1 for EXACT_BARCODE. */
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
  /** When this match was established or last reviewed. */
  updatedAt: z.coerce.date(),
});
export type ProductMatch = z.infer<typeof ProductMatchSchema>;
