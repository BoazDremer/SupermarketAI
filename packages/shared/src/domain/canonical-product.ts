import { z } from 'zod';

/**
 * Normalized internal product identity used for matching and basket lines.
 */
export const CanonicalProductSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  displayNameHe: z.string().optional(),
  transparencyNameHe: z.string().optional(),
  brand: z.string().optional(),
  barcodeGtin: z.string().optional(),
  /** Internal category key or path (TBD with taxonomy work). */
  categoryKey: z.string().optional(),
  /** Backbone leaf id (e.g. "dairy/cheese") when the product has been mapped to the common backbone. */
  commonCategoryId: z.string().optional(),
  /** Preferred consumer unit for comparisons (e.g. per liter). */
  unitHint: z.string().optional(),
});
export type CanonicalProduct = z.infer<typeof CanonicalProductSchema>;
