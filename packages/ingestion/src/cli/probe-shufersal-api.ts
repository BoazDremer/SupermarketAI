/**
 * CLI: `pnpm probe:shufersal-api`
 *
 * Playwright spike — open Shufersal Online, browse search + category pages,
 * record XHR/fetch responses that look like product/catalog JSON.
 *
 * Output: `data/processed/shufersal-api-probe/report.json` (+ sample bodies).
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stat } from 'node:fs/promises';

type CapturedResponse = {
  url: string;
  method: string;
  status: number;
  contentType: string;
  bodyBytes: number;
  /** Parsed JSON when response is application/json */
  jsonKeys?: string[];
  /** Product-like field names seen at top level or in first array element */
  productHints?: string[];
  sampleFile?: string;
};

type Args = {
  headed: boolean;
  slowMo: number;
  outDir: string;
  searchTerm: string;
  categoryCode: string;
  barcode: string;
  timeoutMs: number;
};

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    headed: false,
    slowMo: 0,
    outDir: '',
    searchTerm: 'חלב',
    categoryCode: 'A04',
    barcode: '7290112843951',
    timeoutMs: 60_000,
  };
  for (const a of argv) {
    if (a === '--') continue;
    if (a === '--headed') args.headed = true;
    else if (a === '--help' || a === '-h') {
      printHelpAndExit(0);
    } else if (a.startsWith('--out=')) {
      args.outDir = path.resolve(process.cwd(), a.slice('--out='.length));
    } else if (a.startsWith('--search=')) args.searchTerm = a.slice('--search='.length);
    else if (a.startsWith('--category=')) args.categoryCode = a.slice('--category='.length);
    else if (a.startsWith('--barcode=')) args.barcode = a.slice('--barcode='.length);
    else if (a.startsWith('--slow-ms=')) args.slowMo = Number(a.slice('--slow-ms='.length));
    else if (a.startsWith('--timeout-ms=')) args.timeoutMs = Number(a.slice('--timeout-ms='.length));
    else {
      console.error(`Unknown argument: ${a}`);
      printHelpAndExit(2);
    }
  }
  return args;
}

function printHelpAndExit(code: number): never {
  console.log(
    [
      'Usage: pnpm probe:shufersal-api [-- opts]',
      '',
      'First time: pnpm playwright:install   (from repo root)',
      '',
      '  --headed              Show browser window',
      '  --slow-ms=N           Playwright slowMo',
      '  --out=PATH            Report directory (default: <repo>/data/processed/shufersal-api-probe)',
      '  --search=TERM         Search query (default: חלב)',
      '  --category=CODE       Category page code (default: A04)',
      '  --barcode=GTIN        Second search by barcode',
      '  --timeout-ms=N        Navigation timeout (default 60000)',
    ].join('\n'),
  );
  process.exit(code);
}

async function findRepoRoot(start: string): Promise<string> {
  let dir = path.resolve(start);
  while (true) {
    try {
      await stat(path.join(dir, 'pnpm-workspace.yaml'));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return start;
      dir = parent;
    }
  }
}

const PRODUCT_FIELD_RE =
  /product|barcode|itemcode|gtin|sku|category|department|image|price|namehe|all-categories/i;

function collectHints(obj: unknown, depth = 0): string[] {
  if (depth > 4 || obj === null || obj === undefined) return [];
  const hints = new Set<string>();
  if (Array.isArray(obj)) {
    if (obj[0] && typeof obj[0] === 'object') {
      for (const k of Object.keys(obj[0] as object)) {
        if (PRODUCT_FIELD_RE.test(k)) hints.add(k);
      }
    }
    return [...hints];
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (PRODUCT_FIELD_RE.test(k)) hints.add(k);
      if (typeof v === 'object') {
        for (const h of collectHints(v, depth + 1)) hints.add(h);
      }
    }
  }
  return [...hints];
}

function slugifyUrl(url: string): string {
  try {
    const u = new URL(url);
    return (
      u.pathname.replace(/\//g, '_').replace(/^_/, '') +
      (u.search ? '_' + Buffer.from(u.search).toString('base64url').slice(0, 24) : '')
    ).slice(0, 120);
  } catch {
    return 'invalid_url';
  }
}

function isInterestingUrl(url: string): boolean {
  const lc = url.toLowerCase();
  if (!lc.includes('shufersal')) return false;
  if (lc.match(/\.(png|jpg|jpeg|gif|svg|woff2?|css|ico)(\?|$)/)) return false;
  if (lc.includes('google') || lc.includes('facebook') || lc.includes('doubleclick')) {
    return false;
  }
  return (
    lc.includes('json') ||
    lc.includes('/api/') ||
    lc.includes('/search') ||
    lc.includes('/catalog') ||
    lc.includes('/product') ||
    lc.includes('/facet') ||
    lc.includes('/recommendation') ||
    lc.includes('/assortment') ||
    lc.includes('autocomplete') ||
    lc.includes('/online/he/') && lc.includes('?')
  );
}

async function dismissBlockingModals(page: import('playwright').Page): Promise<void> {
  const selectors = [
    'button:has-text("סגור")',
    'button:has-text("אישור")',
    'button:has-text("המשך")',
    'button:has-text("לא תודה")',
    '.modal .close',
    '[data-dismiss="modal"]',
    '#assortmentModal button.close',
    '.cookie-accept',
  ];
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
      await el.click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(500);
    }
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = await findRepoRoot(process.cwd());
  const outDir =
    args.outDir || path.join(repoRoot, 'data/processed/shufersal-api-probe');
  const samplesDir = path.join(outDir, 'samples');
  await mkdir(samplesDir, { recursive: true });

  const { chromium } = await import('playwright');

  const captured: CapturedResponse[] = [];
  const seenUrls = new Set<string>();

  console.log('— Shufersal API probe (Playwright) —');
  console.log(`  out: ${outDir}`);

  const browser = await chromium.launch({
    headless: !args.headed,
    slowMo: args.slowMo,
  });

  const context = await browser.newContext({
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(args.timeoutMs);

  page.on('response', async (response) => {
    const url = response.url();
    const method = response.request().method();
    const key = `${method} ${url}`;
    if (seenUrls.has(key)) return;
    if (!isInterestingUrl(url)) return;

    const status = response.status();
    const headers = response.headers();
    const contentType = headers['content-type'] ?? '';
    let body: Buffer | undefined;
    try {
      body = await response.body();
    } catch {
      return;
    }
    seenUrls.add(key);

    const entry: CapturedResponse = {
      url,
      method,
      status,
      contentType,
      bodyBytes: body.length,
    };

    const isJson =
      contentType.includes('json') ||
      (body.length > 2 && body[0] === 0x7b) ||
      (body.length > 2 && body[0] === 0x5b);

    if (isJson && body.length > 0 && body.length < 5_000_000) {
      try {
        const text = body.toString('utf8');
        const parsed = JSON.parse(text) as unknown;
        if (parsed && typeof parsed === 'object') {
          entry.jsonKeys = Object.keys(parsed as object).slice(0, 40);
          entry.productHints = collectHints(parsed);
        }
        const fname = `${String(captured.length).padStart(3, '0')}_${slugifyUrl(url)}.json`;
        const samplePath = path.join(samplesDir, fname);
        await writeFile(samplePath, text, 'utf8');
        entry.sampleFile = path.relative(outDir, samplePath);
      } catch {
        // not JSON
      }
    } else if (
      contentType.includes('html') &&
      body.includes('data-product-code') &&
      body.length < 3_000_000
    ) {
      const fname = `${String(captured.length).padStart(3, '0')}_${slugifyUrl(url)}.html`;
      const samplePath = path.join(samplesDir, fname);
      await writeFile(samplePath, body);
      entry.sampleFile = path.relative(outDir, samplePath);
      entry.productHints = ['html:data-product-code'];
    }

    captured.push(entry);
    const tag = entry.productHints?.length ? ` [${entry.productHints.slice(0, 5).join(', ')}]` : '';
    console.log(`  ${method} ${status} ${body.length}b ${url.slice(0, 100)}${tag}`);
  });

  const base = 'https://www.shufersal.co.il';

  async function gotoAndSettle(url: string, label: string): Promise<void> {
    console.log(`\n→ ${label}: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await dismissBlockingModals(page);
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
  }

  await gotoAndSettle(`${base}/online/he/S`, 'home / promotions');
  await gotoAndSettle(`${base}/online/he/${args.categoryCode}`, `category ${args.categoryCode}`);
  await gotoAndSettle(
    `${base}/online/he/search?text=${encodeURIComponent(args.searchTerm)}`,
    `search "${args.searchTerm}"`,
  );
  await gotoAndSettle(
    `${base}/online/he/search?text=${encodeURIComponent(args.barcode)}`,
    `search barcode ${args.barcode}`,
  );

  // Try triggering autocomplete (often a separate XHR).
  console.log('\n→ autocomplete interaction');
  await page.goto(`${base}/online/he/A`, { waitUntil: 'domcontentloaded' });
  await dismissBlockingModals(page);
  const searchInput = page.locator('input[type="search"], input[name="text"], #js-site-search-input, .mainSearch input').first();
  if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await searchInput.fill(args.searchTerm);
    await page.waitForTimeout(3000);
  }

  const withProducts = captured.filter(
    (c) => (c.productHints?.length ?? 0) > 0 || (c.jsonKeys?.length ?? 0) > 0,
  );
  const jsonOnly = captured.filter((c) => c.contentType.includes('json') || c.sampleFile?.endsWith('.json'));

  const report = {
    probedAt: new Date().toISOString(),
    searchTerm: args.searchTerm,
    categoryCode: args.categoryCode,
    barcode: args.barcode,
    totalCaptured: captured.length,
    jsonResponses: jsonOnly.length,
    productLikeResponses: withProducts.length,
    captured: captured.sort((a, b) => (b.productHints?.length ?? 0) - (a.productHints?.length ?? 0)),
    recommendations: buildRecommendations(captured),
  };

  const apiValidation = await validateDiscoveredApis();
  const reportWithApis = { ...report, discoveredApis: apiValidation };
  await writeFile(
    path.join(outDir, 'report.json'),
    JSON.stringify(reportWithApis, null, 2),
  );

  console.log('\n— Validated JSON APIs (no browser) —');
  for (const v of apiValidation) {
    console.log(`  ${v.name}: ${v.ok ? 'OK' : 'FAIL'} — ${v.detail}`);
  }

  console.log('\n— Summary —');
  console.log(`  captured: ${captured.length} responses (${jsonOnly.length} JSON)`);
  console.log(`  product-like: ${withProducts.length}`);
  console.log(`  report: ${path.join(outDir, 'report.json')}`);
  if (report.recommendations.length > 0) {
    console.log('\n  Top candidates for catalog API:');
    for (const r of report.recommendations) {
      console.log(`    • ${r.method} ${r.url}`);
      console.log(`      ${r.reason}`);
    }
  }

  const full = apiValidation.find((v) => v.name === 'full-catalog');
  if (full?.ok) {
    console.log(
      '\n  → Implement `enumerateShufersalProducts()` using search/results with q=:relevance',
    );
    console.log('    See packages/ingestion/src/product-mapper/shufersal-online.ts');
  }

  await browser.close();
}

type ApiValidation = {
  name: string;
  ok: boolean;
  detail: string;
  sampleUrl?: string;
};

async function validateDiscoveredApis(): Promise<ApiValidation[]> {
  const out: ApiValidation[] = [];
  try {
    const { fetchShufersalSearchResults } = await import(
      '../product-mapper/shufersal-online.js'
    );
    const milk = await fetchShufersalSearchResults({ query: 'חלב', limit: 10, page: 0 });
    out.push({
      name: 'search-by-term',
      ok: milk.results.length > 0,
      detail: `${milk.results.length} products, total=${milk.pagination.totalNumberOfResults}`,
      sampleUrl: '/online/he/search/results?q=חלב:relevance&limit=10&page=0',
    });
    const full = await fetchShufersalSearchResults({ query: ':', limit: 1, page: 0 });
    out.push({
      name: 'full-catalog',
      ok: full.pagination.totalNumberOfResults > 10_000,
      detail: `totalNumberOfResults=${full.pagination.totalNumberOfResults}, pages=${full.pagination.numberOfPages} @ limit=1`,
      sampleUrl: '/online/he/search/results?q=:relevance&limit=100&page=0',
    });
    const barcode = await fetchShufersalSearchResults({
      query: '7290112843951',
      limit: 5,
      page: 0,
    });
    const hit = barcode.results[0];
    out.push({
      name: 'search-by-barcode',
      ok: Boolean(hit?.sku?.includes('7290112843951') || hit?.code?.includes('7290112843951')),
      detail: hit
        ? `${hit.code} categories=${(hit.allCategoryCodes ?? []).slice(0, 4).join(',')}`
        : 'no hit',
      sampleUrl: '/online/he/search/results?q=7290112843951:relevance&limit=5',
    });
  } catch (err) {
    out.push({
      name: 'validation-error',
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }
  return out;
}

function buildRecommendations(
  captured: CapturedResponse[],
): Array<{ url: string; method: string; reason: string }> {
  const out: Array<{ url: string; method: string; reason: string; score: number }> = [];
  for (const c of captured) {
    if (!c.sampleFile?.endsWith('.json')) continue;
    const hints = c.productHints ?? [];
    if (hints.length < 2) continue;
    let score = hints.length;
    const lc = c.url.toLowerCase();
    if (lc.includes('search')) score += 3;
    if (lc.includes('product')) score += 3;
    if (lc.includes('catalog')) score += 3;
    if (lc.includes('facet')) score += 2;
    if (c.bodyBytes > 5000) score += 2;
    if (c.status !== 200) score -= 5;
    out.push({
      url: c.url,
      method: c.method,
      reason: `JSON fields: ${hints.slice(0, 12).join(', ')} (${c.bodyBytes} bytes)`,
      score,
    });
  }
  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ url, method, reason }) => ({ url, method, reason }));
}

main().catch((err) => {
  console.error('probe-shufersal-api failed:', err);
  process.exit(1);
});
