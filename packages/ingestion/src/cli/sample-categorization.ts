/**
 * One-shot sampler that picks N random items from each retailer's
 * processed PriceFull XML and looks each barcode up in:
 *   - Open Food Facts public API
 *   - GS1 GEPIR (https://gepir.gs1.org/) — the global GS1 lookup, which
 *     covers Israeli prefixes since GS1 Israel does not expose a separate
 *     programmable API.
 *
 * Output: a JSON dump on stdout for easy diffing.
 *
 * Run:
 *   pnpm --filter @supermarket-price-compare/ingestion exec \
 *     tsx src/cli/sample-categorization.ts \
 *     --shufersal=../../data/processed/shufersal/PriceFull...xml \
 *     --rami-levy=../../data/processed/rami-levy/PriceFull...xml \
 *     [--count=10] [--seed=42]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { XMLParser } from 'fast-xml-parser';

type ItemRow = {
  source: string;
  ItemCode: string;
  ItemName: string;
  ManufactureName?: string;
  ManufactureItemDescription?: string;
  UnitOfMeasure?: string;
  Quantity?: string;
  ItemPrice?: string;
};

type OpenFoodFactsLookup =
  | {
      status: 'found';
      productName?: string;
      brands?: string;
      genericName?: string;
      categories?: string;
      categoriesTags?: readonly string[];
      foodGroups?: string;
      mainCategory?: string;
      countries?: string;
    }
  | { status: 'not-found' }
  | { status: 'error'; reason: string };

type GepirLookup =
  | {
      status: 'found';
      licenseeName?: string;
      gepirGtinName?: string;
      countryCode?: string;
      brandName?: string;
      raw?: unknown;
    }
  | { status: 'not-found' }
  | { status: 'error'; reason: string }
  | { status: 'rate-limited' }
  | { status: 'no-public-api' };

type Sample = {
  item: ItemRow;
  openFoodFacts: OpenFoodFactsLookup;
  gepir: GepirLookup;
};

function parseArgs(argv: readonly string[]): {
  shufersal?: string;
  ramiLevy?: string;
  count: number;
  seed: number;
  skipGepir: boolean;
} {
  let shufersal: string | undefined;
  let ramiLevy: string | undefined;
  let count = 10;
  let seed = Date.now() % 0xffffffff;
  let skipGepir = false;
  for (const a of argv) {
    if (a.startsWith('--shufersal=')) shufersal = a.slice('--shufersal='.length);
    else if (a.startsWith('--rami-levy=')) ramiLevy = a.slice('--rami-levy='.length);
    else if (a.startsWith('--count=')) count = Math.max(1, Number(a.slice('--count='.length)));
    else if (a.startsWith('--seed=')) seed = Number(a.slice('--seed='.length));
    else if (a === '--skip-gepir') skipGepir = true;
  }
  return { shufersal, ramiLevy, count, seed, skipGepir };
}

/** Mulberry32 — small, fast deterministic PRNG. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isGtin(code: string): boolean {
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(code)) return false;
  // Strip leading "internal" 11-digit + check codes (10-digit Shufersal SKUs etc.)
  return true;
}

function loadItems(path: string, source: string): ItemRow[] {
  const xml = readFileSync(path, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
  });
  const doc = parser.parse(xml) as Record<string, unknown>;
  const root = (doc.Root ?? doc.root) as Record<string, unknown> | undefined;
  const itemsContainer = (root?.Items ?? (doc as Record<string, unknown>).Items) as
    | Record<string, unknown>
    | undefined;
  const rawItems = itemsContainer?.Item;
  const items: unknown[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  const out: ItemRow[] = [];
  for (const i of items) {
    if (!i || typeof i !== 'object') continue;
    const obj = i as Record<string, unknown>;
    const code = String(obj.ItemCode ?? '').trim();
    if (!code) continue;
    out.push({
      source,
      ItemCode: code,
      ItemName: String(obj.ItemName ?? '').trim(),
      ManufactureName: obj.ManufactureName ? String(obj.ManufactureName).trim() : undefined,
      ManufactureItemDescription: obj.ManufactureItemDescription
        ? String(obj.ManufactureItemDescription).trim()
        : undefined,
      UnitOfMeasure: obj.UnitOfMeasure ? String(obj.UnitOfMeasure).trim() : undefined,
      Quantity: obj.Quantity ? String(obj.Quantity).trim() : undefined,
      ItemPrice: obj.ItemPrice ? String(obj.ItemPrice).trim() : undefined,
    });
  }
  return out;
}

function pickRandom<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

async function lookupOpenFoodFacts(gtin: string): Promise<OpenFoodFactsLookup> {
  if (!isGtin(gtin)) return { status: 'not-found' };
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(gtin)}.json?fields=product_name,product_name_he,generic_name,brands,categories,categories_tags,food_groups,main_category,countries`;

  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Zolify-CategoryProbe/1.0 (research; contact: dev@zolify.local)',
          Accept: 'application/json',
        },
      });
      if (res.status === 404) return { status: 'not-found' };
      if (res.status === 429) {
        if (attempt === maxAttempts) return { status: 'error', reason: 'HTTP 429 (rate limit)' };
        // Exponential backoff: 1.5s, 4s, 9s
        await delay(1500 * attempt * attempt);
        continue;
      }
      if (!res.ok) return { status: 'error', reason: `HTTP ${res.status}` };
      const data = (await res.json()) as {
        status?: number;
        product?: {
          product_name?: string;
          product_name_he?: string;
          generic_name?: string;
          brands?: string;
          categories?: string;
          categories_tags?: readonly string[];
          food_groups?: string;
          main_category?: string;
          countries?: string;
        };
      };
      if (data.status !== 1 || !data.product) return { status: 'not-found' };
      return {
        status: 'found',
        productName: data.product.product_name_he || data.product.product_name,
        brands: data.product.brands,
        genericName: data.product.generic_name,
        categories: data.product.categories,
        categoriesTags: data.product.categories_tags?.slice(0, 6),
        foodGroups: data.product.food_groups,
        mainCategory: data.product.main_category,
        countries: data.product.countries,
      };
    } catch (err) {
      if (attempt === maxAttempts) return { status: 'error', reason: (err as Error).message };
      await delay(1500 * attempt);
    }
  }
  return { status: 'error', reason: 'unreachable' };
}

/**
 * GS1 Israel does not publish a free programmatic API for category data.
 * The closest globally-public lookup is GEPIR (https://gepir.gs1.org/).
 * Without an authenticated session GEPIR returns a CAPTCHA / rate-limited
 * page on programmatic access; we attempt a JSON call and fall through to
 * `no-public-api` when blocked. Real production use requires a paid GS1
 * licensee account.
 */
async function lookupGs1(gtin: string, skip: boolean): Promise<GepirLookup> {
  if (skip) return { status: 'no-public-api' };
  if (!isGtin(gtin)) return { status: 'not-found' };
  const url = `https://gepir.gs1.org/api/v2.0/api/GepirParty/Json?gtin=${encodeURIComponent(gtin)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Zolify-CategoryProbe/1.0',
        Accept: 'application/json',
      },
    });
    if (res.status === 429) return { status: 'rate-limited' };
    if (res.status === 401 || res.status === 403) return { status: 'no-public-api' };
    if (res.status === 404) return { status: 'not-found' };
    if (!res.ok) return { status: 'error', reason: `HTTP ${res.status}` };
    const data = (await res.json()) as {
      ResponderGLN?: string;
      Item?: Array<{
        GepirParty?: { LicenseeName?: string; CountryISOCode?: string };
        ItemDataLine?: { GepirGtinName?: string; BrandName?: string };
      }>;
    };
    const first = data.Item?.[0];
    if (!first) return { status: 'not-found' };
    return {
      status: 'found',
      licenseeName: first.GepirParty?.LicenseeName,
      countryCode: first.GepirParty?.CountryISOCode,
      gepirGtinName: first.ItemDataLine?.GepirGtinName,
      brandName: first.ItemDataLine?.BrandName,
      raw: data,
    };
  } catch (err) {
    return { status: 'error', reason: (err as Error).message };
  }
}

async function probeOne(item: ItemRow, skipGepir: boolean): Promise<Sample> {
  const [off, gepir] = await Promise.all([
    lookupOpenFoodFacts(item.ItemCode),
    lookupGs1(item.ItemCode, skipGepir),
  ]);
  return { item, openFoodFacts: off, gepir };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function probeBatch(
  rows: readonly ItemRow[],
  skipGepir: boolean,
): Promise<Sample[]> {
  const out: Sample[] = [];
  for (const r of rows) {
    out.push(await probeOne(r, skipGepir));
    // Be polite with the public APIs (Open Food Facts asks <= 100 req/min,
    // tighter for sustained scripts).
    await delay(900);
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.shufersal && !args.ramiLevy) {
    console.error(
      'Usage: tsx src/cli/sample-categorization.ts --shufersal=<path.xml> --rami-levy=<path.xml> [--count=10] [--seed=N] [--skip-gepir]',
    );
    process.exit(1);
  }

  const rng = makeRng(args.seed);
  console.log(`Seed: ${args.seed}; samples per source: ${args.count}`);

  const result: Record<string, Sample[]> = {};
  if (args.shufersal) {
    const path = resolve(process.cwd(), args.shufersal);
    const items = loadItems(path, 'shufersal').filter((i) => isGtin(i.ItemCode));
    console.log(`Shufersal: ${items.length} items with GTIN-shaped codes`);
    const picked = pickRandom(items, args.count, rng);
    result.shufersal = await probeBatch(picked, args.skipGepir);
  }
  if (args.ramiLevy) {
    const path = resolve(process.cwd(), args.ramiLevy);
    const items = loadItems(path, 'rami-levy').filter((i) => isGtin(i.ItemCode));
    console.log(`Rami Levy: ${items.length} items with GTIN-shaped codes`);
    const picked = pickRandom(items, args.count, rng);
    result['rami-levy'] = await probeBatch(picked, args.skipGepir);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('Sampler failed:', err);
  process.exit(1);
});
