import * as cheerio from 'cheerio';
import { downloadFile } from '../file-utils.js';
import type { IngestionProviderConfig } from '../types.js';
import { BaseRetailerIngestionProvider } from './base-provider.js';

/**
 * Catalog category ids exposed by the Shufersal transparency portal.
 * Verified against the live portal HTML on 2026-04-28.
 */
const SHUFERSAL_CATEGORY = {
  ALL: 0,
  PRICE_UPDATE: 1,
  PRICE_FULL: 2,
  PROMO_UPDATE: 3,
  PROMO_FULL: 4,
  STORES: 5,
} as const;

export type ShufersalDiscoveredFile = {
  /** Absolute URL to the GZ file (Azure blob storage in practice). */
  downloadUrl: string;
  /** Basename (e.g. `PriceFull7290027600007-002-413-20260428-034000.gz`). */
  fileName: string;
  /** Trailing date+time parsed from the filename. */
  fileTimestamp: string;
  /** Sub-chain id parsed from the filename (`002`). */
  subChainId: string;
  /** Store id parsed from the filename (`413`). */
  storeId: string;
};

/**
 * Provider for the public Shufersal transparency portal.
 *
 * The portal exposes a paged HTML listing at
 * `/FileObject/UpdateCategory?catID=<n>&storeId=<n>` where each row contains
 * a download link to an Azure blob holding a gzipped XML.
 *
 * Filename format:
 *   `PriceFull<chainId>-<storeId>-<YYYYMMDDHHMM[SS]>.gz`
 * The same convention is used for `PriceFull`, `Price`, `PromoFull`, `Promo`
 * and `StoresFull` files.
 */
export class ShufersalProvider extends BaseRetailerIngestionProvider {
  readonly baseUrl: string;

  constructor(config: IngestionProviderConfig) {
    super({
      ...config,
      retailerKey: config.retailerKey || 'shufersal',
      providerKind: 'DEDICATED_PORTAL',
    });
    this.baseUrl = (config.baseUrl ?? 'https://prices.shufersal.co.il').replace(/\/$/, '');
  }

  /**
   * Fetch a category listing as HTML. Sorted newest-first when the portal
   * honors the sort hints; we re-sort by parsed filename timestamp to be
   * resilient to layout changes.
   */
  private async fetchCategoryHtml(
    catId: number,
    storeId: string | undefined,
    page: number,
  ): Promise<string> {
    const params = new URLSearchParams({
      catID: String(catId),
      sort: 'Time',
      sortDir: 'DESC',
      page: String(page),
    });
    if (storeId) params.set('storeId', storeId);
    const url = `${this.baseUrl}/FileObject/UpdateCategory?${params.toString()}`;
    const buf = await downloadFile(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    return buf.toString('utf8');
  }

  private parseListingPage(
    html: string,
    fileTypePrefix: string,
    storeIdFilter: string | undefined,
  ): ShufersalDiscoveredFile[] {
    const $ = cheerio.load(html);
    const out: ShufersalDiscoveredFile[] = [];
    const lcPrefix = fileTypePrefix.toLowerCase();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const lcHref = href.toLowerCase();
      if (!lcHref.endsWith('.gz') && !lcHref.includes('.gz?')) return;

      const fileName = decodeURIComponent(
        href.split('?')[0]?.split('/').pop() ?? '',
      ).trim();
      // Reject incremental "Price..." files when caller asked for "PriceFull"
      // (the listing for catID=2 has been observed to also include some
      // incremental rows when sort=Time is honored loosely).
      if (!fileName.toLowerCase().startsWith(lcPrefix)) return;

      const match = fileName.match(
        /^(?<prefix>[A-Za-z]+)\d+-(?<sub>\d{1,4})-(?<store>\d{1,4})-(?<date>\d{8})-(?<time>\d{4,6})\.gz$/i,
      );
      if (!match || !match.groups) return;
      const { sub, store, date, time } = match.groups;
      if (storeIdFilter) {
        const candidates = new Set<string>([store ?? '', `${sub}-${store}`]);
        if (!candidates.has(storeIdFilter)) return;
      }

      const downloadUrl = absolutizeUrl(href, this.baseUrl);
      out.push({
        downloadUrl,
        fileName,
        fileTimestamp: `${date}${time}`,
        subChainId: sub ?? '',
        storeId: store ?? '',
      });
    });

    return out;
  }

  /**
   * List the latest PriceFull files for a given store, sorted newest first.
   *
   * If the listing for the requested store is empty we still pull the first
   * unfiltered page back so the caller can log "closest matches" instead of
   * a bare empty list.
   */
  async listLatestPriceFullForStore(storeId: string): Promise<{
    matches: ShufersalDiscoveredFile[];
    nearest: ShufersalDiscoveredFile[];
  }> {
    const filtered: ShufersalDiscoveredFile[] = [];
    for (let page = 1; page <= 5; page++) {
      const html = await this.fetchCategoryHtml(SHUFERSAL_CATEGORY.PRICE_FULL, storeId, page);
      const onPage = this.parseListingPage(html, 'PriceFull', storeId);
      if (onPage.length === 0) break;
      filtered.push(...onPage);
    }
    if (filtered.length > 0) {
      const dedup = dedupeByFilename(filtered);
      dedup.sort((a, b) => b.fileTimestamp.localeCompare(a.fileTimestamp));
      return { matches: dedup, nearest: [] };
    }

    // No matches — collect the first page unfiltered so callers can show hints.
    const fallbackHtml = await this.fetchCategoryHtml(
      SHUFERSAL_CATEGORY.PRICE_FULL,
      undefined,
      1,
    );
    const nearest = dedupeByFilename(
      this.parseListingPage(fallbackHtml, 'PriceFull', undefined),
    ).sort((a, b) => b.fileTimestamp.localeCompare(a.fileTimestamp));
    return { matches: [], nearest: nearest.slice(0, 10) };
  }

  /**
   * Latest StoresFull listing across all stores.
   */
  async listLatestStoresFile(): Promise<ShufersalDiscoveredFile | undefined> {
    const html = await this.fetchCategoryHtml(SHUFERSAL_CATEGORY.STORES, undefined, 1);
    const all = this.parseListingPage(html, 'Stores', undefined);
    if (all.length === 0) return undefined;
    all.sort((a, b) => b.fileTimestamp.localeCompare(a.fileTimestamp));
    return all[0];
  }

  /** Fetch the bytes of a discovered file. */
  async fetchFile(file: ShufersalDiscoveredFile): Promise<Buffer> {
    return downloadFile(file.downloadUrl, {
      timeoutMs: 120_000,
      headers: { Accept: 'application/octet-stream,application/gzip,*/*' },
    });
  }
}

function dedupeByFilename(rows: ShufersalDiscoveredFile[]): ShufersalDiscoveredFile[] {
  const seen = new Set<string>();
  const out: ShufersalDiscoveredFile[] = [];
  for (const r of rows) {
    if (seen.has(r.fileName)) continue;
    seen.add(r.fileName);
    out.push(r);
  }
  return out;
}

/**
 * Some links on the Shufersal portal are protocol-relative (`//host/...`).
 * `new URL()` resolves them correctly when given an https base.
 */
function absolutizeUrl(href: string, base: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('//')) return `https:${href}`;
  return new URL(href, base.endsWith('/') ? base : `${base}/`).toString();
}
