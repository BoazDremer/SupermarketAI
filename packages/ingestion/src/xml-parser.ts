import { XMLParser } from 'fast-xml-parser';

const defaultParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  parseTagValue: true,
  parseAttributeValue: true,
  // fast-xml-parser defaults this to 100 as a stack-overflow guard against
  // adversarial XML. Israeli transparency files (notably RL's Stores XML) are
  // trusted government feeds with deeper nesting; bump well past anything
  // we've observed in practice but still finite to avoid pathological input.
  maxNestedTags: 100_000,
});

export type ParseXmlOptions = ConstructorParameters<typeof XMLParser>[0];

/**
 * Decode an XML byte buffer to a string, honoring the BOM and any encoding
 * declared in the `<?xml encoding="…"?>` prolog.
 *
 * Israeli transparency feeds are inconsistent: Shufersal serves UTF-8,
 * Rami Levy serves UTF-16 LE (with a `0xFF 0xFE` BOM), and some legacy chains
 * still ship `windows-1255` (Hebrew). Reading any of those as UTF-8 unconditionally
 * silently turns every tag name into garbage, so all our store/price extractors
 * return empty arrays.
 */
function decodeXmlBuffer(buffer: Buffer): string {
  // 1) BOM sniff — the cheapest and most reliable signal.
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return buffer.subarray(3).toString('utf8');
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    // Node Buffer can't decode UTF-16 BE directly; TextDecoder handles it.
    return new TextDecoder('utf-16be').decode(buffer.subarray(2));
  }

  // 2) Look at the XML declaration for an explicit encoding hint.
  const headAscii = buffer.subarray(0, Math.min(200, buffer.length)).toString('ascii');
  const declMatch = /<\?xml[^>]*encoding=["']([^"']+)["']/i.exec(headAscii);
  if (declMatch) {
    const enc = declMatch[1]!.toLowerCase();
    if (enc === 'utf-8' || enc === 'utf8') return buffer.toString('utf8');
    if (enc === 'utf-16' || enc === 'utf-16le' || enc === 'utf16le') {
      return buffer.toString('utf16le');
    }
    if (enc === 'utf-16be') return new TextDecoder('utf-16be').decode(buffer);
    // Legacy Hebrew encodings — supported by TextDecoder via WHATWG names.
    if (enc === 'windows-1255' || enc === 'iso-8859-8' || enc === 'hebrew') {
      try {
        return new TextDecoder(enc).decode(buffer);
      } catch {
        // Some Node versions need the canonical label; fall through to utf-8.
      }
    }
  }

  // 3) Default to UTF-8.
  return buffer.toString('utf8');
}

/**
 * Parse XML bytes to a plain JS object tree (tags become keys; attributes merge on nodes).
 */
export function parseXmlToObject(buffer: Buffer, options?: ParseXmlOptions): unknown {
  const parser = options ? new XMLParser(options) : defaultParser;
  return parser.parse(decodeXmlBuffer(buffer));
}

/**
 * Read the `<StoreID>` from a PriceFull XML header without parsing the full
 * document. Israeli transparency PriceFull files declare the store once at
 * the top (`<Root><StoreID>070</StoreID>…`) and every `<Item>` belongs to
 * that store. Used to match subchain-level filenames (no branch in the name)
 * to a requested store id.
 */
export function peekPriceFullStoreId(buffer: Buffer): string | undefined {
  const head = decodeXmlBuffer(buffer).slice(0, 4_000);
  const m = /<StoreID>\s*([^<]+?)\s*<\/StoreID>/i.exec(head);
  if (!m) return undefined;
  const id = m[1]!.trim();
  return id.length > 0 ? id : undefined;
}

// ---------------------------------------------------------------------------
// Defensive extractors used by the price-import CLI. Israeli transparency
// XMLs from different chains use different tag casings (PriceFull/Items/Item
// vs Root/Products/Product), and some files mix attributes with child text
// nodes. The helpers below find the first matching shape and return a flat
// list of plain JS row objects (kept untouched as `rawData`).
// ---------------------------------------------------------------------------

export type RawRow = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function findFirstNode(
  root: unknown,
  candidates: readonly string[],
  maxDepth = 6,
): { node: Record<string, unknown>; key: string } | undefined {
  if (!isPlainObject(root) || maxDepth <= 0) return undefined;
  for (const key of candidates) {
    if (key in root && isPlainObject(root[key])) {
      return { node: root[key] as Record<string, unknown>, key };
    }
    const lc = key.toLowerCase();
    for (const k of Object.keys(root)) {
      if (k.toLowerCase() === lc && isPlainObject(root[k])) {
        return { node: root[k] as Record<string, unknown>, key: k };
      }
    }
  }
  for (const k of Object.keys(root)) {
    const child = root[k];
    if (isPlainObject(child)) {
      const found = findFirstNode(child, candidates, maxDepth - 1);
      if (found) return found;
    }
  }
  return undefined;
}

function findFirstArray(
  root: unknown,
  candidates: readonly string[],
  maxDepth = 6,
): RawRow[] {
  if (!isPlainObject(root) || maxDepth <= 0) return [];
  for (const key of candidates) {
    const lc = key.toLowerCase();
    for (const k of Object.keys(root)) {
      if (k === key || k.toLowerCase() === lc) {
        const v = root[k];
        const arr = asArray<unknown>(v as RawRow | RawRow[] | undefined);
        const rows = arr.filter(isPlainObject) as RawRow[];
        if (rows.length > 0) return rows;
        if (isPlainObject(v)) {
          const inner = findFirstArray(v, candidates, maxDepth - 1);
          if (inner.length > 0) return inner;
        }
      }
    }
  }
  for (const k of Object.keys(root)) {
    const child = root[k];
    if (isPlainObject(child)) {
      const inner = findFirstArray(child, candidates, maxDepth - 1);
      if (inner.length > 0) return inner;
    } else if (Array.isArray(child)) {
      for (const c of child) {
        if (isPlainObject(c)) {
          const inner = findFirstArray(c, candidates, maxDepth - 1);
          if (inner.length > 0) return inner;
        }
      }
    }
  }
  return [];
}

const PRICE_ROW_TAGS = [
  'Item',
  'Product',
  'Row',
  'Price',
  'item',
  'product',
  'row',
  'price',
] as const;

const PRICE_ROOT_TAGS = [
  'Items',
  'Products',
  'Prices',
  'PriceFull',
  'Root',
  'PriceUpdate',
  'items',
  'products',
  'prices',
  'priceFull',
  'priceUpdate',
] as const;

const STORE_ROW_TAGS = ['Store', 'SubChain', 'Branch', 'store', 'branch'] as const;
const STORE_ROOT_TAGS = [
  'Stores',
  'StoresFull',
  'SubChains',
  'Root',
  'stores',
  'storesFull',
  'subChains',
] as const;

/**
 * Find rows representing a single product+price entry. Tries the most
 * common Israeli transparency layouts (Items > Item, Products > Product,
 * PriceFull > Row, etc.) and falls back to depth-first search.
 */
export function extractPriceRowsFromUnknownSchema(doc: unknown): RawRow[] {
  if (!isPlainObject(doc)) return [];
  // 1) Try root containers first.
  for (const rootTag of PRICE_ROOT_TAGS) {
    const root = findFirstNode(doc, [rootTag]);
    if (!root) continue;
    const rows = findFirstArray(root.node, PRICE_ROW_TAGS);
    if (rows.length > 0) return rows;
  }
  // 2) Generic depth-first search.
  return findFirstArray(doc, PRICE_ROW_TAGS);
}

/**
 * Find rows representing an individual store / branch.
 */
export function extractStoreRowsFromUnknownSchema(doc: unknown): RawRow[] {
  if (!isPlainObject(doc)) return [];
  for (const rootTag of STORE_ROOT_TAGS) {
    const root = findFirstNode(doc, [rootTag]);
    if (!root) continue;
    const rows = findFirstArray(root.node, STORE_ROW_TAGS);
    if (rows.length > 0) return rows;
  }
  return findFirstArray(doc, STORE_ROW_TAGS);
}

/**
 * Read a value from an XML row regardless of whether the source used
 * attributes (`@_Foo`) or child elements (`<Foo>...</Foo>`), and try a
 * list of candidate names case-insensitively.
 */
export function pickField(row: RawRow, ...candidates: string[]): unknown {
  for (const name of candidates) {
    if (name in row) return row[name];
    const attrKey = `@_${name}`;
    if (attrKey in row) return row[attrKey];
  }
  const lcMap = new Map<string, string>();
  for (const k of Object.keys(row)) lcMap.set(k.toLowerCase(), k);
  for (const name of candidates) {
    const key = lcMap.get(name.toLowerCase()) ?? lcMap.get(`@_${name.toLowerCase()}`);
    if (key) return row[key];
  }
  return undefined;
}

/** Coerce a parsed XML scalar to a string (or undefined when empty). */
export function pickString(row: RawRow, ...candidates: string[]): string | undefined {
  const v = pickField(row, ...candidates);
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'string') return v.trim() === '' ? undefined : v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object' && '#text' in (v as Record<string, unknown>)) {
    const t = (v as Record<string, unknown>)['#text'];
    if (typeof t === 'string' || typeof t === 'number') return String(t).trim();
  }
  return undefined;
}

export function pickNumber(row: RawRow, ...candidates: string[]): number | undefined {
  const s = pickString(row, ...candidates);
  if (!s) return undefined;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}
