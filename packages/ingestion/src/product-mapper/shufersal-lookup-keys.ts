/**
 * Shufersal HTML cards use `data-product-code="P_<digits>"` while the
 * transparency XML row may carry the same value with/without leading zeros or
 * as a bare internal code. The visible `data-product-code` is often a Shufersal
 * internal sku (e.g. `A040901`), while the GTIN lives in the Cloudinary image
 * path (`.../FSA52_M_P_7296073108351_1.png`). Register every sensible variant.
 */

import { normalizeBarcode } from '../normalizers.js';
import type { ShufersalProductCard } from './shufersal.js';

export function expandShufersalHarvestLookupKeys(
  retailer: 'rami-levy' | 'shufersal',
  key: string,
): string[] {
  const k = key.trim();
  if (!k) return [];
  if (retailer !== 'shufersal') return [k];
  const out = new Set<string>([k]);
  if (k.startsWith('P_')) out.add(k.slice(2));
  const digits = k.replace(/\D/g, '');
  if (digits.length > 0) {
    out.add(digits);
    const stripped = digits.replace(/^0+/, '') || digits;
    out.add(stripped);
    out.add(`P_${digits}`);
    out.add(`P_${stripped}`);
    if (stripped.length === 12) {
      out.add(`0${stripped}`);
      out.add(`P_0${stripped}`);
    }
    if (stripped.length === 13) {
      out.add(`0${stripped}`);
      out.add(`P_0${stripped}`);
    }
  }
  return [...out];
}

/** Pull plausible GTINs from Shufersal product image URLs. */
export function extractGtinsFromShufersalImageUrl(url: string): string[] {
  const out = new Set<string>();
  for (const m of url.matchAll(/(?:^|[^0-9])(\d{8,14})(?:[^0-9]|$)/g)) {
    const normalized = normalizeBarcode(m[1]);
    if (normalized) out.add(normalized);
  }
  return [...out];
}

/** All DB lookup keys for a harvested Shufersal product card. */
export function expandShufersalCardLookupKeys(card: ShufersalProductCard): string[] {
  const out = new Set<string>();
  for (const k of expandShufersalHarvestLookupKeys('shufersal', card.productCode)) {
    out.add(k);
  }
  if (card.imageUrl) {
    for (const gtin of extractGtinsFromShufersalImageUrl(card.imageUrl)) {
      for (const k of expandShufersalHarvestLookupKeys('shufersal', gtin)) {
        out.add(k);
      }
    }
  }
  return [...out];
}

/** Lookup keys for assign entries that carry an image URL but not a full card. */
export function expandShufersalEntryLookupKeys(entry: {
  key: string;
  imageUrl?: string;
}): string[] {
  const out = new Set<string>();
  for (const k of expandShufersalHarvestLookupKeys('shufersal', entry.key)) {
    out.add(k);
  }
  if (entry.imageUrl) {
    for (const gtin of extractGtinsFromShufersalImageUrl(entry.imageUrl)) {
      for (const k of expandShufersalHarvestLookupKeys('shufersal', gtin)) {
        out.add(k);
      }
    }
  }
  return [...out];
}
