import * as cheerio from 'cheerio';
import path from 'node:path';
import { ensureDir, saveBuffer, type FetchRedirectMode } from '../file-utils.js';
import type { IngestionProviderConfig } from '../types.js';
import { BaseRetailerIngestionProvider } from './base-provider.js';

/**
 * Cookie jar tied to a single host. Stores cookies indexed by name and
 * replays them on every subsequent request via the `Cookie` header.
 *
 * The PublishedPrices portal is a simple PHP/Perl-style site that relies on
 * a session cookie + an anti-CSRF token. A handful of cookies is enough.
 */
class HostCookieJar {
  private readonly cookies = new Map<string, string>();

  ingestSetCookie(headers: Headers): void {
    // Node fetch coalesces multiple Set-Cookie headers via headers.getSetCookie()
    // when available. Fall back to .get() for older runtimes.
    const all = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    if (all.length === 0) {
      const single = headers.get('set-cookie');
      if (single) all.push(single);
    }
    for (const raw of all) {
      const [pair] = raw.split(';');
      if (!pair) continue;
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (name) this.cookies.set(name, value);
    }
  }

  cookieHeader(): string | undefined {
    if (this.cookies.size === 0) return undefined;
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  get(name: string): string | undefined {
    return this.cookies.get(name);
  }

  hasAny(): boolean {
    return this.cookies.size > 0;
  }
}

export type PublishedPricesDiscoveredFile = {
  fileName: string;
  /** Absolute URL we can later GET to retrieve the file. */
  downloadUrl: string;
  /** Last-modified hint, when available. */
  lastModified?: string;
  /** Size in bytes when reported by the listing. */
  sizeBytes?: number;
};

export type PublishedPricesProviderOptions = IngestionProviderConfig & {
  username?: string;
  password?: string;
  /** Where to drop debug HTML / JSON when the listing layout is unfamiliar. */
  debugDir?: string;
};

/**
 * Israeli government **PublishedPrices** / Cerberus-style transparency portal.
 * Used by Rami Levy and several other chains.
 */
export class PublishedPricesProvider extends BaseRetailerIngestionProvider {
  readonly baseUrl: string;
  readonly username: string;
  readonly password: string;
  private readonly jar = new HostCookieJar();
  private readonly debugDir: string;
  private loggedIn = false;

  constructor(options: PublishedPricesProviderOptions) {
    super({
      ...options,
      providerKind: 'PUBLISHED_PRICES',
    });
    this.baseUrl = (options.baseUrl ?? 'https://url.retail.publishedprices.co.il').replace(/\/$/, '');
    this.username = options.username ?? '';
    this.password = options.password ?? '';
    this.debugDir = options.debugDir ?? path.resolve(process.cwd(), 'data/debug', this.config.retailerKey);
  }

  private async request(
    pathname: string,
    init: { method?: 'GET' | 'POST'; body?: string; headers?: Record<string, string>; redirect?: FetchRedirectMode } = {},
  ): Promise<{ status: number; headers: Headers; text: () => Promise<string>; buffer: () => Promise<Buffer> }> {
    const url = pathname.startsWith('http') ? pathname : `${this.baseUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
    const headers: Record<string, string> = {
      'User-Agent': 'SupermarketAI-Ingestion/1.0 (+https://github.com/)',
      Accept: '*/*',
      ...init.headers,
    };
    const cookie = this.jar.cookieHeader();
    if (cookie) headers.Cookie = cookie;

    const res = await fetch(url, {
      method: init.method ?? 'GET',
      headers,
      body: init.body,
      redirect: (init.redirect ?? 'follow') as RequestInit['redirect'],
    });
    this.jar.ingestSetCookie(res.headers);
    const arr = await res.arrayBuffer();
    const buf = Buffer.from(arr);
    return {
      status: res.status,
      headers: res.headers,
      text: async () => buf.toString('utf8'),
      buffer: async () => buf,
    };
  }

  /** CSRF token captured from the most recent HTML page rendered by the portal. */
  private csrfToken?: string;

  async login(): Promise<void> {
    if (this.loggedIn) return;
    // Step 1: GET /login to seed cookies + csrftoken. (`/login/user` is POST-only.)
    const initial = await this.request('/login');
    const initialHtml = await initial.text();
    this.csrfToken = this.extractCsrfToken(initialHtml);

    // Step 2: POST credentials. The portal expects the csrftoken in BOTH the
    // body AND the `X-CSRFTOKEN` header.
    const body = new URLSearchParams({
      username: this.username,
      password: this.password,
      csrftoken: this.csrfToken ?? '',
      Submit: 'Sign in',
    }).toString();

    // We use `redirect: 'manual'` so the `Set-Cookie` header on the 302
    // (which carries the *post-login* `cftpSID`) is visible to our jar.
    // When `fetch` auto-follows the redirect, that header is dropped and
    // every subsequent request fails with 401.
    const post = await this.request('/login/user', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: this.baseUrl,
        Referer: `${this.baseUrl}/login`,
        'X-CSRFTOKEN': this.csrfToken ?? '',
      },
      redirect: 'manual',
    });

    const isRedirect = post.status >= 300 && post.status < 400;
    if (!isRedirect && post.status >= 400) {
      const postHtml = await post.text();
      await this.dumpDebug('login-failed.html', postHtml);
      throw new Error(
        `PublishedPrices login failed for user "${this.username}": HTTP ${post.status}. ` +
          `Saved response to ${this.debugDir}/login-failed.html`,
      );
    }
    // Some deployments respond with 200 + the login form again on bad creds.
    if (!isRedirect) {
      const html = await post.text();
      if (/login-form|name="username"/i.test(html)) {
        await this.dumpDebug('login-rejected.html', html);
        throw new Error(
          `PublishedPrices login rejected (still on login page) for user "${this.username}". ` +
            `Saved response to ${this.debugDir}/login-rejected.html`,
        );
      }
    }

    // Step 3: GET /file once to confirm the session and refresh the token.
    const fileRes = await this.request('/file');
    const fileHtml = await fileRes.text();
    this.csrfToken = this.extractCsrfToken(fileHtml) ?? this.csrfToken;

    if (fileRes.status >= 400) {
      await this.dumpDebug('post-login-file.html', fileHtml);
      throw new Error(
        `PublishedPrices login appears to have failed: GET /file returned HTTP ${fileRes.status}.`,
      );
    }
    this.loggedIn = true;
  }

  private extractCsrfToken(html: string): string | undefined {
    const $ = cheerio.load(html);
    const meta = $('meta[name="csrftoken"]').attr('content');
    if (meta && meta.trim().length > 0) return meta.trim();
    const inputVal = $('input[name="csrftoken"]').attr('value') ?? $('input[name="_token"]').attr('value');
    return inputVal && inputVal.trim().length > 0 ? inputVal.trim() : undefined;
  }

  /**
   * List files, filtering by filename prefix (e.g. `PriceFull`, `Stores`).
   * Tries the JSON endpoint first; falls back to scraping the HTML page.
   */
  async listFiles(filenamePrefix: string): Promise<PublishedPricesDiscoveredFile[]> {
    await this.login();

    const json = await this.tryJsonListing(filenamePrefix, this.csrfToken);
    if (json && json.length > 0) return json;

    // HTML fallback — fetch /file and pluck `.gz` anchors.
    const res = await this.request('/file');
    const html = await res.text();
    if (res.status >= 400) {
      await this.dumpDebug('file-listing-error.html', html);
      throw new Error(
        `PublishedPrices /file listing returned HTTP ${res.status}. Saved to ${this.debugDir}/file-listing-error.html`,
      );
    }
    const found = this.parseListingHtml(html, filenamePrefix);
    if (found.length === 0) {
      await this.dumpDebug('file-listing-no-matches.html', html);
    }
    return found;
  }

  private async tryJsonListing(
    filenamePrefix: string,
    csrfToken: string | undefined,
  ): Promise<PublishedPricesDiscoveredFile[] | undefined> {
    try {
      // The Cerberus DataTables endpoint accepts a small subset of fields
      // (the full DataTables payload causes 4xx in some deployments).
      const body = new URLSearchParams({
        iDisplayStart: '0',
        iDisplayLength: '1000',
        sSearch: filenamePrefix,
        cd: '/',
        csrftoken: csrfToken ?? '',
      }).toString();

      const res = await this.request('/file/json/dir', {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFTOKEN': csrfToken ?? '',
          Accept: 'application/json,text/plain,*/*',
          Referer: `${this.baseUrl}/file`,
        },
      });
      if (res.status >= 400) return undefined;
      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        await this.dumpDebug('file-json-not-json.txt', text);
        return undefined;
      }
      const rows =
        (parsed as { aaData?: unknown[]; data?: unknown[] }).aaData ??
        (parsed as { aaData?: unknown[]; data?: unknown[] }).data ??
        [];
      const out: PublishedPricesDiscoveredFile[] = [];
      const lcPrefix = filenamePrefix.toLowerCase();
      for (const r of rows) {
        if (typeof r !== 'object' || r === null) continue;
        const row = r as Record<string, unknown>;
        const fname = String(row.fname ?? row.name ?? '').trim();
        if (!fname || !fname.toLowerCase().startsWith(lcPrefix)) continue;
        out.push({
          fileName: fname,
          downloadUrl: `${this.baseUrl}/file/d/${encodeURIComponent(fname)}`,
          sizeBytes: typeof row.size === 'number' ? row.size : undefined,
          lastModified: typeof row.time === 'string' ? row.time : undefined,
        });
      }
      return out;
    } catch {
      return undefined;
    }
  }

  private parseListingHtml(
    html: string,
    filenamePrefix: string,
  ): PublishedPricesDiscoveredFile[] {
    const $ = cheerio.load(html);
    const out: PublishedPricesDiscoveredFile[] = [];
    const lcPrefix = filenamePrefix.toLowerCase();
    $('a[href]').each((_, a) => {
      const href = $(a).attr('href');
      if (!href) return;
      const fileName = decodeURIComponent(href.split('?')[0]?.split('/').pop() ?? '').trim();
      if (!fileName) return;
      if (!fileName.toLowerCase().startsWith(lcPrefix)) return;
      if (!fileName.toLowerCase().endsWith('.gz')) return;
      const downloadUrl = href.startsWith('http')
        ? href
        : new URL(href, this.baseUrl).toString();
      out.push({ fileName, downloadUrl });
    });
    return out;
  }

  /**
   * Filter discovered files by an external store id (`001-070`, `070`, etc.).
   * Filenames look like `PriceFull7290058140886-001-070-20260428-120006.gz`.
   */
  filterByStoreId(
    files: readonly PublishedPricesDiscoveredFile[],
    storeId: string,
  ): PublishedPricesDiscoveredFile[] {
    const norm = storeId.trim();
    if (!norm) return [...files];
    const out: PublishedPricesDiscoveredFile[] = [];
    for (const f of files) {
      const m = f.fileName.match(
        /^[A-Za-z]+\d+-(?<sub>\d{1,4})-(?<branch>\d{1,4})-(?<date>\d{8})-(?<time>\d{4,6})\.gz$/i,
      );
      if (!m || !m.groups) continue;
      const sub = m.groups.sub ?? '';
      const branch = m.groups.branch ?? '';
      const candidates = new Set<string>([branch, `${sub}-${branch}`]);
      if (candidates.has(norm)) out.push(f);
    }
    return out;
  }

  /** Sort PriceFull-like files newest first using the trailing date+time tokens. */
  sortByFilenameTimestampDesc<T extends PublishedPricesDiscoveredFile>(files: readonly T[]): T[] {
    const out = [...files];
    out.sort((a, b) => extractFilenameTimestamp(b.fileName).localeCompare(extractFilenameTimestamp(a.fileName)));
    return out;
  }

  /** Fetch the file bytes for a discovered entry (auth cookies are attached). */
  async fetchFile(file: PublishedPricesDiscoveredFile): Promise<Buffer> {
    await this.login();
    const res = await this.request(file.downloadUrl, {
      headers: { Accept: 'application/octet-stream,application/gzip,*/*' },
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`PublishedPrices download failed: HTTP ${res.status} for ${file.fileName}`);
    }
    return res.buffer();
  }

  private async dumpDebug(name: string, body: string): Promise<void> {
    try {
      await ensureDir(this.debugDir);
      await saveBuffer(path.join(this.debugDir, name), Buffer.from(body, 'utf8'));
    } catch {
      // best-effort; never let debug-dumping crash an import
    }
  }
}

function extractFilenameTimestamp(name: string): string {
  const m = name.match(/(\d{8})-(\d{4,6})\.gz$/i);
  if (m) return `${m[1]}${m[2]}`;
  const m2 = name.match(/(\d{12,14})\.gz$/i);
  return m2 ? m2[1]! : '';
}
