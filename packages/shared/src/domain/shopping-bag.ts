import { z } from 'zod';

export const ShoppingBagSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ShoppingBag = z.infer<typeof ShoppingBagSchema>;

/**
 * A line in the user's bag. Prefers `canonicalProductId` when known; may reference
 * `retailerProductId` alone during early MVP before canonicalization.
 */
export const ShoppingBagItemSchema = z
  .object({
    id: z.string().min(1),
    bagId: z.string().min(1),
    quantity: z.number().positive(),
    canonicalProductId: z.string().min(1).optional(),
    retailerId: z.string().min(1).optional(),
    retailerProductId: z.string().min(1).optional(),
    note: z.string().optional(),
  })
  .superRefine((row, ctx) => {
    if (!row.canonicalProductId && !row.retailerProductId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either canonicalProductId or retailerProductId must be set',
        path: ['canonicalProductId'],
      });
    }
    if (row.retailerProductId && !row.retailerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'retailerId is required when retailerProductId is set',
        path: ['retailerId'],
      });
    }
  });

export type ShoppingBagItem = z.infer<typeof ShoppingBagItemSchema>;
