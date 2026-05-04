import { z } from 'zod';

/**
 * Raw catalog row as published by a supermarket chain (ingestion source of truth shape).
 */
export const RetailerProductSchema = z.object({
  id: z.string().min(1),
  retailerId: z.string().min(1),
  /** Chain-native SKU / product code. */
  retailerSku: z.string().optional(),
  /** GTIN / EAN when published (string to preserve leading zeros). */
  barcodeGtin: z.string().optional(),
  name: z.string().min(1),
  nameHe: z.string().optional(),
  brand: z.string().optional(),
  /** Human unit label as shown online (e.g. "750 מ\"ל"). */
  unitLabel: z.string().optional(),
  /** Pack or size description from the feed, unstructured. */
  packDescription: z.string().optional(),
  /** Opaque enrichment from ingestion (images URLs, hierarchy codes, etc.). */
  rawMetadata: z.record(z.unknown()).optional(),
});
export type RetailerProduct = z.infer<typeof RetailerProductSchema>;
