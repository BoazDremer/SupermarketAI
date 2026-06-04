/**
 * Shufersal product → category harvester.
 *
 * Reuses the HTML pages already cached by the category scraper at
 * `data/processed/categories/.cache/shufersal/`. Each product card on a
 * category page carries:
 *   data-product-name="<full hebrew name>"
 *   data-product-code="P_<gtin-or-sku>"
 *   data-all-categories="[<leaf>, <parent>, …, <root>]"
 *
 * One card may be repeated across many cached pages (a product appears in
 * multiple of its ancestor categories), so we collect the union of
 * `all-categories` per product code and keep the longest (most informative)
 * `data-product-name` we ever see, then later resolve to the most-specific
 * code that has a `RetailerCategoryAlias` row.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export type ShufersalProductCard = {
  /** What appears in `data-product-code` minus the `P_` prefix (typically a GTIN). */
  productCode: string;
  /** Full untruncated Hebrew name from `data-product-name`, when available. */
  name?: string;
  /** Absolute image URL from the card's `<img class="pic" src="…">`. */
  imageUrl?: string;
  /**
   * Union of all chain category codes referenced from this product across
   * every cached page it appears on, ordered most-specific (deepest, longest
   * code) → least-specific.
   */
  chainCodes: string[];
};

export type ShufersalHarvestResult = {
  cards: ShufersalProductCard[];
  /** Diagnostics: distinct cached files visited. */
  filesScanned: number;
  /** Diagnostics: total raw card occurrences across all files. */
  cardOccurrences: number;
};

export type ShufersalCacheSummary = {
  htmlFiles: number;
  emptyFiles: number;
  pagesWithProductCards: number;
};

/** Count how many cached category pages actually contain product cards. */
export async function summarizeShufersalCache(
  cacheDir: string,
): Promise<ShufersalCacheSummary> {
  const dirStat = await stat(cacheDir).catch(() => undefined);
  if (!dirStat?.isDirectory()) {
    return { htmlFiles: 0, emptyFiles: 0, pagesWithProductCards: 0 };
  }
  const files = (await readdir(cacheDir)).filter((f) => f.endsWith('.html'));
  let emptyFiles = 0;
  let pagesWithProductCards = 0;
  for (const f of files) {
    const html = await readFile(path.join(cacheDir, f), 'utf8');
    if (html.length === 0) {
      emptyFiles += 1;
      continue;
    }
    if (/data-product-code="P_/.test(html)) pagesWithProductCards += 1;
  }
  return { htmlFiles: files.length, emptyFiles, pagesWithProductCards };
}

/** Internal accumulator while harvesting cards across many HTML pages. */
type CardAccumulator = {
  chainCodes: Set<string>;
  name?: string;
  imageUrl?: string;
};

/**
 * Walk every cached HTML page, parse all product cards, and union per-product
 * chain-category codes + names.
 */
export async function harvestShufersalCachedCards(
  cacheDir: string,
): Promise<ShufersalHarvestResult> {
  const dirStat = await stat(cacheDir).catch(() => undefined);
  if (!dirStat || !dirStat.isDirectory()) {
    return { cards: [], filesScanned: 0, cardOccurrences: 0 };
  }
  const files = (await readdir(cacheDir)).filter((f) => f.endsWith('.html'));

  const byProduct = new Map<string, CardAccumulator>();
  let cardOccurrences = 0;

  for (const f of files) {
    const html = await readFile(path.join(cacheDir, f), 'utf8');
    if (html.length === 0) continue;
    parseCardsInto(html, byProduct, () => {
      cardOccurrences += 1;
    });
  }

  return {
    cards: accumulatorToCards(byProduct),
    filesScanned: files.length,
    cardOccurrences,
  };
}

/**
 * Convert an accumulator map into the public {@link ShufersalProductCard}
 * shape, sorting each product's chain codes from longest (most specific) to
 * shortest.
 */
export function accumulatorToCards(
  byProduct: Map<string, CardAccumulator>,
): ShufersalProductCard[] {
  const cards: ShufersalProductCard[] = [];
  for (const [code, acc] of byProduct) {
    const sorted = [...acc.chainCodes].sort(
      (a, b) => b.length - a.length || a.localeCompare(b),
    );
    cards.push({
      productCode: code,
      name: acc.name,
      imageUrl: acc.imageUrl,
      chainCodes: sorted,
    });
  }
  return cards;
}

// Cards always emit `data-product-name` BEFORE `data-product-code` and then
// `data-all-categories` within the same div opening tag, separated by other
// attributes/whitespace. The bounded `[\s\S]{0,N}?` jumps stay loose enough to
// tolerate Shufersal adding new attributes between them.
const CARD_RE =
  /data-product-name="([^"]*)"[\s\S]{0,2000}?data-product-code="P_([^"]+)"[\s\S]{0,1500}?data-all-categories="\[([^\]]+)\]"/g;

// Some legacy or non-search cards omit `data-product-name`. Keep the original,
// narrower fallback so we still capture the category mapping for those.
const CARD_RE_NO_NAME =
  /data-product-code="P_([^"]+)"[\s\S]{0,1500}?data-all-categories="\[([^\]]+)\]"/g;

// Within ~3 KB after each card we look for the product thumbnail. Two attribute
// orders are valid in Shufersal's markup (`src` before `class` and vice versa).
const IMG_AFTER_CARD_RE =
  /<img[^>]*?(?:class="[^"]*\bpic\b[^"]*"[^>]*?src="([^"]+)"|src="([^"]+)"[^>]*?class="[^"]*\bpic\b[^"]*")/;
const IMG_LOOKAHEAD_BYTES = 3000;

/** Visible for testing. */
export function parseCardsInto(
  html: string,
  out: Map<string, CardAccumulator>,
  onCard?: () => void,
): void {
  // First pass: full cards with names. Track which codes were claimed so the
  // fallback pass below can skip duplicates.
  const claimedSpans: Array<[number, number]> = [];
  CARD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CARD_RE.exec(html)) !== null) {
    const tagEnd = m.index + m[0].length;
    claimedSpans.push([m.index, tagEnd]);
    const name = (m[1] ?? '').trim();
    const code = (m[2] ?? '').trim();
    const codes = (m[3] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!code || codes.length === 0) continue;
    onCard?.();
    const imageUrl = findCardImage(html, tagEnd);
    upsertCard(out, code, codes, name.length > 0 ? name : undefined, imageUrl);
  }

  // Fallback pass: cards without `data-product-name`.
  CARD_RE_NO_NAME.lastIndex = 0;
  while ((m = CARD_RE_NO_NAME.exec(html)) !== null) {
    if (claimedSpans.some(([s, e]) => m!.index >= s && m!.index < e)) continue;
    const tagEnd = m.index + m[0].length;
    const code = (m[1] ?? '').trim();
    const codes = (m[2] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!code || codes.length === 0) continue;
    onCard?.();
    const imageUrl = findCardImage(html, tagEnd);
    upsertCard(out, code, codes, undefined, imageUrl);
  }
}

/**
 * Look for the product thumbnail in the HTML window that follows the card's
 * data-attributes. Returns the absolute URL or undefined if no `<img class="pic">`
 * is present (e.g. cards rendered as a placeholder for out-of-stock items).
 */
function findCardImage(html: string, fromIndex: number): string | undefined {
  const slice = html.slice(fromIndex, fromIndex + IMG_LOOKAHEAD_BYTES);
  const m = IMG_AFTER_CARD_RE.exec(slice);
  if (!m) return undefined;
  const url = (m[1] ?? m[2] ?? '').trim();
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return undefined; // ignore data-uri placeholders / relative paths
}

function upsertCard(
  out: Map<string, CardAccumulator>,
  code: string,
  chainCodes: readonly string[],
  name: string | undefined,
  imageUrl: string | undefined,
): void {
  let bucket = out.get(code);
  if (!bucket) {
    bucket = { chainCodes: new Set<string>() };
    out.set(code, bucket);
  }
  for (const c of chainCodes) bucket.chainCodes.add(c);
  if (name && (!bucket.name || name.length > bucket.name.length)) {
    bucket.name = name;
  }
  if (imageUrl && !bucket.imageUrl) bucket.imageUrl = imageUrl;
}
