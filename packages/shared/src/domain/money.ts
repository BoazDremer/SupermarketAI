import { z } from 'zod';

/** MVP currency: Israel only. */
export const SupportedCurrencySchema = z.literal('ILS');
export type SupportedCurrency = z.infer<typeof SupportedCurrencySchema>;

/**
 * Monetary amount in minor units (e.g. agorot for ILS) for exact arithmetic.
 */
export const MoneyMinorSchema = z.object({
  currency: SupportedCurrencySchema,
  minorUnits: z.number().int(),
});
export type MoneyMinor = z.infer<typeof MoneyMinorSchema>;
