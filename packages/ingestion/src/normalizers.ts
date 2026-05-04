import type { ParsedRetailerPrice, ParsedRetailerProduct, ParsedStore } from './types.js';
import type { RawRow } from './xml-parser.js';
import { pickNumber, pickString } from './xml-parser.js';

const ONLINE_HEBREW = [
  'אינטרנט',
  'אונליין',
  'משלוחים',
  'משלוח',
  'דליברי',
  'מקוון',
  'באינטרנט',
];

const ONLINE_ENGLISH = [
  'online',
  'internet',
  'delivery',
  'e-commerce',
  'ecommerce',
  'ship',
  'web',
];

/**
 * Trim, collapse internal whitespace, and Unicode-normalize (NFC) for bilingual text.
 */
export function normalizeBilingualText(input: string): string {
  const trimmed = input.normalize('NFC').trim();
  return trimmed.replace(/\s+/g, ' ');
}

/** Alias kept so the CLI matches the task brief naming. */
export function normalizeText(input: string | undefined | null): string | undefined {
  if (input === undefined || input === null) return undefined;
  const s = normalizeBilingualText(String(input));
  return s.length === 0 ? undefined : s;
}

/**
 * Heuristic: chain feeds often label virtual / delivery-first branches in Hebrew or English.
 */
export function detectLikelyOnlineDeliveryStore(store: ParsedStore): boolean {
  const hay = `${store.displayName} ${store.city ?? ''} ${store.externalStoreId}`.toLowerCase();

  for (const w of ONLINE_ENGLISH) {
    if (hay.includes(w)) return true;
  }
  const he = `${store.displayName} ${store.city ?? ''} ${store.externalStoreId}`;
  for (const w of ONLINE_HEBREW) {
    if (he.includes(w)) return true;
  }
  if (store.deliveryOffered === true && /online|אינטרנט/i.test(store.displayName)) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helpers used by the price-import CLI.
// ---------------------------------------------------------------------------

/** Strip non-digits; return undefined for clearly invalid barcodes. */
export function normalizeBarcode(input: string | number | undefined | null): string | undefined {
  if (input === undefined || input === null) return undefined;
  const digits = String(input).replace(/\D+/g, '');
  if (digits.length === 0) return undefined;
  if (digits.length < 6 || digits.length > 14) return undefined;
  return digits;
}

/**
 * Convert a price expressed in major units (e.g. `7.99`) to integer minor
 * units (`799`). Returns `undefined` for non-finite or negative inputs.
 */
export function normalizePrice(amount: string | number | undefined | null): number | undefined {
  if (amount === undefined || amount === null) return undefined;
  const num = typeof amount === 'number' ? amount : Number(String(amount).replace(',', '.'));
  if (!Number.isFinite(num) || num < 0) return undefined;
  return Math.round(num * 100);
}

/**
 * Best-effort date parsing for the various formats seen in transparency XMLs:
 *   - `2026-04-28T12:00:06`
 *   - `2026-04-28 12:00:06`
 *   - `28/04/2026 12:00:06`
 *   - `20260428120006`
 */
export function normalizeDate(input: string | number | undefined | null): Date | undefined {
  if (input === undefined || input === null) return undefined;
  const str = String(input).trim();
  if (str.length === 0) return undefined;
  const compact = str.match(/^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2})(\d{2}))?$/);
  if (compact) {
    const [, y, mo, d, h = '00', mi = '00', s = '00'] = compact;
    const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}`;
    const dt = new Date(iso);
    return Number.isNaN(dt.getTime()) ? undefined : dt;
  }
  const dmy = str.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dmy) {
    const d = dmy[1] ?? '01';
    const mo = dmy[2] ?? '01';
    const y = dmy[3] ?? '1970';
    const h = dmy[4] ?? '00';
    const mi = dmy[5] ?? '00';
    const s = dmy[6] ?? '00';
    const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${mi}:${s}`;
    const dt = new Date(iso);
    return Number.isNaN(dt.getTime()) ? undefined : dt;
  }
  const dt = new Date(str.replace(' ', 'T'));
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

export type NormalizePriceFullRowOptions = {
  /** Used when the row itself does not provide a store id. */
  fallbackStoreId?: string;
  /** Set when the row only includes a sub-chain id. */
  subChainId?: string;
  /** Default observation timestamp when the file does not include one. */
  observedAtFallback?: Date;
};

export type NormalizedPriceFullRow = {
  product: ParsedRetailerProduct;
  price: ParsedRetailerPrice;
  /** Reasons the row was not normalized fully (kept for diagnostics). */
  warnings: string[];
};

/**
 * Map a raw transparency row to normalized product + price shapes.
 * Returns `undefined` when the row is unusable (no item code or price).
 */
export function normalizePriceFullRow(
  raw: RawRow,
  opts: NormalizePriceFullRowOptions = {},
): NormalizedPriceFullRow | undefined {
  const externalItemCode = pickString(
    raw,
    'ItemCode',
    'externalItemCode',
    'itemCode',
    'ProductCode',
    'Barcode',
  );
  if (!externalItemCode) return undefined;

  const externalStoreId =
    pickString(raw, 'StoreId', 'externalStoreId', 'storeId', 'BranchId', 'Branch') ??
    opts.fallbackStoreId;
  if (!externalStoreId) return undefined;

  const name =
    normalizeText(
      pickString(raw, 'ItemName', 'name', 'itemName', 'ProductName', 'Description', 'ManufactureItemDescription'),
    ) ?? externalItemCode;
  const nameHe = normalizeText(pickString(raw, 'ItemNameHE', 'nameHe', 'ItemNameHe', 'NameHe'));
  const brand = normalizeText(
    pickString(raw, 'ManufactureName', 'ManufacturerName', 'brand', 'Manufacturer'),
  );
  const unitLabel = normalizeText(
    pickString(raw, 'UnitOfMeasure', 'unitLabel', 'UnitQty', 'UnitMeasure'),
  );
  const packDescription = normalizeText(
    pickString(
      raw,
      'ManufactureItemDescription',
      'packDescription',
      'PackDescription',
      'Quantity',
      'ManufactureCountry',
    ),
  );

  const barcodeInput = pickString(raw, 'ItemCode', 'Barcode', 'barcode', 'GTIN', 'UPC');
  const barcode = normalizeBarcode(barcodeInput);

  const priceMajor = pickNumber(
    raw,
    'ItemPrice',
    'price',
    'Price',
    'UnitPrice',
    'priceMajor',
    'Amount',
  );
  const priceMinor =
    pickNumber(raw, 'priceMinor', 'amountMinor') ??
    (priceMajor !== undefined ? Math.round(priceMajor * 100) : undefined);

  const warnings: string[] = [];
  if (priceMinor === undefined) {
    warnings.push('missing price');
  }

  const observedAt =
    normalizeDate(
      pickString(raw, 'PriceUpdateDate', 'PriceUpdateTime', 'observedAt', 'UpdateDate'),
    ) ??
    opts.observedAtFallback ??
    new Date();
  const effectiveFrom =
    normalizeDate(
      pickString(raw, 'PriceUpdateDate', 'PriceUpdateTime', 'effectiveFrom', 'UpdateDate'),
    ) ?? observedAt;
  const effectiveTo = normalizeDate(
    pickString(raw, 'effectiveTo', 'PriceEndDate', 'LastSaleDateTime'),
  );

  const product: ParsedRetailerProduct = {
    externalItemCode,
    externalStoreId,
    name,
    nameHe,
    barcode,
    brand,
    unitLabel,
    packDescription,
    raw,
  };

  const price: ParsedRetailerPrice = {
    externalItemCode,
    externalStoreId,
    amountMinor: priceMinor ?? 0,
    currency: 'ILS',
    effectiveFrom: effectiveFrom?.toISOString(),
    effectiveTo: effectiveTo?.toISOString(),
    observedAt: observedAt.toISOString(),
    isCurrent: true,
    raw,
  };

  if (priceMinor === undefined) {
    return undefined;
  }

  return { product, price, warnings };
}

export type DetectedOnlineStore = {
  store: ParsedStore;
  confidence: number;
  reasons: string[];
};

/**
 * Score every store and return ranked candidates that look like online /
 * delivery storefronts. Highest-confidence first.
 */
export function detectOnlineStores(stores: readonly ParsedStore[]): DetectedOnlineStore[] {
  const scored: DetectedOnlineStore[] = [];
  for (const s of stores) {
    const reasons: string[] = [];
    let score = 0;
    const lower = `${s.displayName} ${s.city ?? ''}`.toLowerCase();
    for (const w of ONLINE_ENGLISH) {
      if (lower.includes(w)) {
        score += 0.4;
        reasons.push(`name contains "${w}"`);
      }
    }
    for (const w of ONLINE_HEBREW) {
      if (s.displayName.includes(w) || (s.city ?? '').includes(w)) {
        score += 0.5;
        reasons.push(`name contains "${w}"`);
      }
    }
    if (s.deliveryOffered === true) {
      score += 0.2;
      reasons.push('deliveryOffered=true');
    }
    if (/^(rami|ramilevi|ramilevy)/i.test(s.displayName.replace(/\s+/g, ''))) {
      score += 0.2;
      reasons.push('contains "rami"');
    }
    if (score > 0) {
      scored.push({ store: s, confidence: Math.min(1, score), reasons });
    }
  }
  return scored.sort((a, b) => b.confidence - a.confidence);
}
