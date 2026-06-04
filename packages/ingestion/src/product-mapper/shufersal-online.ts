/**
 * Shufersal Online shop JSON API (discovered via `pnpm probe:shufersal-api`).
 *
 * Primary endpoint (SAP Commerce / miglog):
 *   GET /online/he/search/results?q={query}&limit={n}&page={page}
 *
 * Full-catalog trick: `q=:relevance` returns ~24k products (paginated).
 * Per-barcode: `q={gtin}:relevance` returns exact matches when online.
 *
 * HTML fragments (more cards per request, harder to parse):
 *   GET /online/he/search/fragment?q={term}:relevance&page={page}
 */

import { createProgress } from '../progress.js';
import type { ShufersalProductCard } from './shufersal.js';

const SHUFERSAL_ONLINE_BASE = 'https://www.shufersal.co.il';

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type ShufersalSearchPagination = {
  pageSize: number;
  currentPage: number;
  sort: string;
  numberOfPages: number;
  totalNumberOfResults: number;
};

export type ShufersalSearchProduct = {
  code: string;
  name: string;
  sku: string;
  baseProductImageMedium?: string;
  baseProductImageLarge?: string;
  allCategoryCodes?: string[];
  commercialDepartment?: string | null;
  commercialCategoryGroup?: string | null;
  commercialCategorySubGroup?: string | null;
  brandName?: string;
  manufacturer?: string;
};

export type ShufersalSearchResultsResponse = {
  results: ShufersalSearchProduct[];
  pagination: ShufersalSearchPagination;
  facets?: unknown;
};

export type FetchShufersalSearchOptions = {
  /** Search text; use `:` or `:relevance` alone to list the whole online catalog. */
  query: string;
  page?: number;
  limit?: number;
  fetchImpl?: typeof fetch;
};

/** Build the `q` parameter Shufersal expects (`term:relevance`). */
export function shufersalSearchQuery(term: string, sort = 'relevance'): string {
  const t = term.trim();
  if (!t || t === ':') return `:${sort}`;
  if (t.includes(':')) return t;
  return `${t}:${sort}`;
}

export function searchResultsUrl(options: {
  query: string;
  page?: number;
  limit?: number;
}): string {
  const params = new URLSearchParams({
    q: shufersalSearchQuery(options.query),
    limit: String(options.limit ?? 50),
    page: String(options.page ?? 0),
  });
  return `${SHUFERSAL_ONLINE_BASE}/online/he/search/results?${params.toString()}`;
}

/**
 * Fetch one page of JSON search results. Works without login for public assortment
 * (same session the probe used).
 */
export async function fetchShufersalSearchResults(
  options: FetchShufersalSearchOptions,
): Promise<ShufersalSearchResultsResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = searchResultsUrl({
    query: options.query,
    page: options.page ?? 0,
    limit: options.limit ?? 50,
  });
  const res = await fetchImpl(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SupermarketAI-ShufersalOnline/1.0',
    },
  });
  if (!res.ok) {
    throw new Error(`Shufersal search/results failed: HTTP ${res.status} (${url})`);
  }
  return (await res.json()) as ShufersalSearchResultsResponse;
}

/** Map API `allCategoryCodes` onto RetailerProduct chain columns (most-specific first). */
export function chainCodesFromSearchProduct(product: ShufersalSearchProduct): string[] {
  const codes = (product.allCategoryCodes ?? []).filter(
    (c) => c && c !== 'categories',
  );
  return [...codes].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

/** Convert a search API row into the same shape as HTML-harvested cards. */
export function searchProductToCard(product: ShufersalSearchProduct): ShufersalProductCard {
  const { productCode, chainImageUrl } = catalogFieldsFromSearchProduct(product);
  return {
    productCode,
    name: product.name?.trim() || undefined,
    imageUrl: chainImageUrl ?? undefined,
    chainCodes: chainCodesFromSearchProduct(product),
  };
}

export function catalogFieldsFromSearchProduct(product: ShufersalSearchProduct): {
  chainDepartmentId: string | null;
  chainGroupId: string | null;
  chainSubGroupId: string | null;
  chainImageUrl: string | null;
  productCode: string;
} {
  const codes = chainCodesFromSearchProduct(product);
  const productCode = (product.code ?? '').replace(/^P_/, '') || product.sku;
  return {
    productCode,
    chainSubGroupId: codes[0] ?? null,
    chainGroupId: codes.length >= 2 ? (codes[1] ?? null) : null,
    chainDepartmentId: codes.length >= 2 ? (codes[codes.length - 1] ?? null) : null,
    chainImageUrl:
      product.baseProductImageMedium?.trim() ||
      product.baseProductImageLarge?.trim() ||
      null,
  };
}

export type EnumerateShufersalOnlineOptions = {
  /**
   * Search term passed to `q=…:relevance`. Use `:` (default) for the full
   * online catalog (~24k products).
   */
  query?: string;
  pageSize?: number;
  /** Stop after this many pages (default: all pages reported by the API). */
  maxPages?: number;
  /** Pause between page fetches (ms). Default 400. */
  delayMs?: number;
  fetchImpl?: typeof fetch;
  log?: (msg: string) => void;
};

export type EnumerateShufersalOnlineResult = {
  cards: ShufersalProductCard[];
  pagesFetched: number;
  totalReported: number;
  rawResultCount: number;
};

/**
 * Page through `/online/he/search/results` and collect unique products.
 * This is the RL `/api/catalog`-equivalent path for Shufersal Online.
 */
export async function enumerateShufersalOnlineProducts(
  options: EnumerateShufersalOnlineOptions = {},
): Promise<EnumerateShufersalOnlineResult> {
  const query = options.query ?? ':';
  const pageSize = options.pageSize ?? 100;
  const delayMs = options.delayMs ?? 400;
  const log = options.log ?? ((m) => process.stderr.write(`${m}\n`));

  const first = await fetchShufersalSearchResults({
    query,
    page: 0,
    limit: pageSize,
    fetchImpl: options.fetchImpl,
  });
  const totalPages = options.maxPages ?? first.pagination.numberOfPages;
  const byCode = new Map<string, ShufersalProductCard>();
  let rawResultCount = 0;

  const progress = createProgress({
    label: 'shufersal-online',
    total: totalPages,
    intervalMs: 2_000,
    extra: () => ({ unique: byCode.size }),
  });

  function absorb(page: ShufersalSearchResultsResponse): void {
    for (const row of page.results) {
      rawResultCount += 1;
      const card = searchProductToCard(row);
      if (!card.productCode) continue;
      const prev = byCode.get(card.productCode);
      if (!prev) {
        byCode.set(card.productCode, card);
        continue;
      }
      if ((card.name?.length ?? 0) > (prev.name?.length ?? 0)) {
        prev.name = card.name;
      }
      if (card.imageUrl && !prev.imageUrl) prev.imageUrl = card.imageUrl;
      prev.chainCodes = [...new Set([...prev.chainCodes, ...card.chainCodes])].sort(
        (a, b) => b.length - a.length || a.localeCompare(b),
      );
    }
  }

  absorb(first);
  progress.tick();

  for (let page = 1; page < totalPages; page += 1) {
    if (delayMs > 0) await delay(delayMs);
    const res = await fetchShufersalSearchResults({
      query,
      page,
      limit: pageSize,
      fetchImpl: options.fetchImpl,
    });
    absorb(res);
    progress.tick();
  }

  progress.finish(
    `enumerated ${byCode.size} unique products (${rawResultCount} rows) from ${totalPages} pages`,
  );
  log(
    `  online catalog: ${byCode.size} unique / ${first.pagination.totalNumberOfResults} reported`,
  );

  return {
    cards: [...byCode.values()],
    pagesFetched: totalPages,
    totalReported: first.pagination.totalNumberOfResults,
    rawResultCount,
  };
}
