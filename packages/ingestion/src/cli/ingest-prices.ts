import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Some Israeli transparency portals (notably PublishedPrices/Cerberus) ship an
// incomplete TLS certificate chain. Operators can opt-in to skip strict
// verification via `INGESTION_INSECURE_TLS=1` for ingestion runs only.
if (process.env.INGESTION_INSECURE_TLS === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('[ingestion] INGESTION_INSECURE_TLS=1 — TLS certificate verification disabled.');
}

import {
  calculateChecksum,
  decompressIfGzip,
  ensureDir,
  saveBuffer,
} from '../file-utils.js';
import {
  detectOnlineStores,
  normalizePriceFullRow,
  type NormalizedPriceFullRow,
} from '../normalizers.js';
import { PublishedPricesProvider } from '../providers/published-prices-provider.js';
import { ShufersalProvider } from '../providers/shufersal-provider.js';
import {
  getRealRetailerSource,
  REAL_RETAILER_SOURCES,
  type RealRetailerSource,
} from '../retailer-sources.js';
import type { ParsedStore } from '../types.js';
import {
  extractPriceRowsFromUnknownSchema,
  extractStoreRowsFromUnknownSchema,
  parseXmlToObject,
  pickString,
} from '../xml-parser.js';
import { importPriceFull } from '../db/import-pricefull.js';

// ---------------------------------------------------------------------------
// CLI argument parsing (simple --key=value / --flag style; no extra deps).
// ---------------------------------------------------------------------------

type CliOptions = {
  retailer: string;
  storeId?: string;
  localPriceFull?: string;
  localStores?: string;
  dryRun: boolean;
  limit?: number;
  help: boolean;
};

function parseArgs(argv: readonly string[]): CliOptions {
  const opts: CliOptions = { retailer: '', dryRun: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok || !tok.startsWith('--')) continue;
    const [keyRaw, valueInline] = tok.slice(2).split('=', 2);
    const key = (keyRaw ?? '').trim();
    let value = valueInline;
    if (value === undefined) {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        value = next;
        i++;
      }
    }
    switch (key) {
      case 'retailer':
        opts.retailer = (value ?? '').trim();
        break;
      case 'storeId':
        opts.storeId = (value ?? '').trim();
        break;
      case 'localPriceFull':
        opts.localPriceFull = (value ?? '').trim();
        break;
      case 'localStores':
        opts.localStores = (value ?? '').trim();
        break;
      case 'dryRun':
      case 'dry-run':
        opts.dryRun = value === undefined || value === 'true' || value === '1';
        break;
      case 'limit':
        if (value !== undefined) {
          const n = Number(value);
          opts.limit = Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
        }
        break;
      case 'help':
      case 'h':
        opts.help = true;
        break;
      default:
        // Unknown flags are ignored to keep the CLI forgiving.
        break;
    }
  }
  return opts;
}

function printUsage(): void {
  const supported = Object.keys(REAL_RETAILER_SOURCES).join(', ');
  console.log(`Usage: pnpm ingest:prices -- --retailer=<key> [options]

Required:
  --retailer=<key>           One of: ${supported}

Options:
  --storeId=<id>             Override the store id (e.g. 413, 001-070).
  --localPriceFull=<path>    Skip download; parse a local *.gz/*.xml PriceFull file.
  --localStores=<path>       Skip Stores download; use a local Stores file for detection.
  --limit=<n>                Limit the number of normalized rows imported (testing).
  --dryRun                   Parse + summarize but do not write to the database.
  --help                     Show this help text.

Examples:
  pnpm ingest:prices -- --retailer=shufersal
  pnpm ingest:prices -- --retailer=shufersal --storeId=413
  pnpm ingest:prices -- --retailer=rami-levy
  pnpm ingest:prices -- --retailer=rami-levy --storeId=001-070
  pnpm ingest:prices -- --retailer=shufersal --localPriceFull=./data/raw/shufersal/PriceFull....gz --dryRun
`);
}

// ---------------------------------------------------------------------------
// Filesystem layout helpers.
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function repoRoot(): string {
  // packages/ingestion/src/cli -> ../../../../ = monorepo root
  return path.resolve(__dirname, '../../../..');
}

function rawDirFor(retailerKey: string): string {
  return path.join(repoRoot(), 'data', 'raw', retailerKey);
}

function processedDirFor(retailerKey: string): string {
  return path.join(repoRoot(), 'data', 'processed', retailerKey);
}

function debugDirFor(retailerKey: string): string {
  return path.join(repoRoot(), 'data', 'debug', retailerKey);
}

// ---------------------------------------------------------------------------
// Main flow.
// ---------------------------------------------------------------------------

type ResolvedFile = {
  buffer: Buffer;
  fileName: string;
  sourceUrl?: string;
  /** Path on disk where the gzipped raw bytes were saved. */
  rawPath: string;
};

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.retailer) {
    printUsage();
    if (!opts.help && !opts.retailer) process.exitCode = 1;
    return;
  }

  const source = getRealRetailerSource(opts.retailer);
  if (!source) {
    console.error(`Unknown retailer: "${opts.retailer}". Supported: ${Object.keys(REAL_RETAILER_SOURCES).join(', ')}`);
    process.exitCode = 1;
    return;
  }

  console.log(`▶ Ingesting prices for ${source.displayName} (${source.retailerKey})`);
  console.log(`  Provider: ${source.providerType}`);
  if (opts.dryRun) console.log('  Mode: DRY RUN (no DB writes)');

  // 1) Resolve the price-full bytes (network or local file).
  const { buffer, fileName, rawPath, sourceUrl, storeIdResolved } = await resolvePriceFull(source, opts);
  const sha256 = calculateChecksum(buffer);
  const sizeBytes = buffer.length;

  // 2) Decompress + persist XML for inspection.
  const xml = await decompressIfGzip(buffer);
  const xmlBaseName = fileName
    .replace(/\.gz$/i, '')
    .replace(/\.xml$/i, '')
    .concat('.xml');
  const xmlPath = path.join(processedDirFor(source.retailerKey), xmlBaseName);
  await saveBuffer(xmlPath, xml);

  // 3) Parse + normalize.
  const doc = parseXmlToObject(xml);
  const rawRows = extractPriceRowsFromUnknownSchema(doc);
  if (rawRows.length === 0) {
    console.error(
      `No item rows could be extracted from ${fileName}. The XML schema may have changed; XML saved to ${xmlPath} for inspection.`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(`  Raw rows extracted: ${rawRows.length}`);

  const limited = opts.limit ? rawRows.slice(0, opts.limit) : rawRows;
  const normalized: NormalizedPriceFullRow[] = [];
  let unusable = 0;
  for (const r of limited) {
    const out = normalizePriceFullRow(r, { fallbackStoreId: storeIdResolved });
    if (!out) {
      unusable++;
      continue;
    }
    normalized.push(out);
  }
  console.log(`  Normalized rows: ${normalized.length} (unusable: ${unusable})`);

  if (opts.dryRun) {
    console.log('Dry run summary:');
    console.log(
      JSON.stringify(
        {
          retailer: source.retailerKey,
          storeId: storeIdResolved,
          fileName,
          sourceUrl,
          rawPath,
          xmlPath,
          rawRows: rawRows.length,
          normalizedRows: normalized.length,
          unusableRows: unusable,
          sampleRow: normalized[0]?.product,
        },
        null,
        2,
      ),
    );
    return;
  }

  // 4) DB import.
  const summary = await importPriceFull({
    retailer: {
      slug: source.retailerKey,
      displayName: source.displayName,
      displayNameHe: source.displayNameHe,
      websiteUrl: source.transparencyUrl,
    },
    store: {
      externalStoreId: storeIdResolved,
      displayName: `${source.displayName} #${storeIdResolved}`,
      deliveryOffered: true,
    },
    file: {
      fileName,
      storagePath: rawPath,
      sha256,
      sizeBytes,
    },
    rows: normalized,
  });

  console.log('✓ Import complete:');
  console.log(JSON.stringify(summary, null, 2));
}

// ---------------------------------------------------------------------------
// Provider-specific resolution of the PriceFull buffer + store id.
// ---------------------------------------------------------------------------

async function resolvePriceFull(
  source: RealRetailerSource,
  opts: CliOptions,
): Promise<ResolvedFile & { storeIdResolved: string }> {
  if (opts.localPriceFull) {
    const filePath = path.resolve(opts.localPriceFull);
    const buffer = await readFile(filePath);
    const fileName = path.basename(filePath);
    const rawDir = rawDirFor(source.retailerKey);
    await ensureDir(rawDir);
    const rawPath = path.join(rawDir, fileName);
    await saveBuffer(rawPath, buffer);
    const storeIdResolved =
      opts.storeId ??
      detectStoreIdFromFilename(fileName) ??
      source.knownOnlineStoreIds[0] ??
      'unknown';
    console.log(`  Using local PriceFull file: ${filePath}`);
    console.log(`  Resolved store id: ${storeIdResolved}`);
    return { buffer, fileName, rawPath, storeIdResolved };
  }

  if (source.providerType === 'SHUFERSAL_PORTAL') {
    return resolveShufersal(source, opts);
  }
  if (source.providerType === 'PUBLISHED_PRICES') {
    return resolvePublishedPrices(source, opts);
  }
  throw new Error(`Unsupported providerType: ${source.providerType}`);
}

async function resolveShufersal(
  source: RealRetailerSource,
  opts: CliOptions,
): Promise<ResolvedFile & { storeIdResolved: string }> {
  const provider = new ShufersalProvider({
    retailerKey: source.retailerKey,
    providerKind: 'DEDICATED_PORTAL',
    baseUrl: source.transparencyUrl,
  });

  const storeId = opts.storeId ?? source.knownOnlineStoreIds[0];
  if (!storeId) throw new Error('Shufersal: no storeId provided and no default known');

  console.log(`  Discovering PriceFull files for store ${storeId}…`);
  const { matches, nearest } = await provider.listLatestPriceFullForStore(storeId);
  if (matches.length === 0) {
    if (nearest.length > 0) {
      console.error(
        `Shufersal: no PriceFull files found for storeId=${storeId}. Nearest entries on the listing:`,
      );
      for (const f of nearest) console.error(`  - ${f.fileName}`);
    }
    throw new Error(
      `No Shufersal PriceFull files found for store ${storeId}. Pass --storeId or use --localPriceFull.`,
    );
  }
  const latest = matches[0];
  if (!latest) throw new Error('Shufersal: discovery returned an empty match list');
  console.log(`  Latest file: ${latest.fileName}`);
  console.log(`  Source URL : ${latest.downloadUrl}`);

  const buffer = await provider.fetchFile(latest);
  const rawDir = rawDirFor(source.retailerKey);
  await ensureDir(rawDir);
  const rawPath = path.join(rawDir, latest.fileName);
  await saveBuffer(rawPath, buffer);

  return {
    buffer,
    fileName: latest.fileName,
    rawPath,
    sourceUrl: latest.downloadUrl,
    storeIdResolved: latest.storeId || storeId,
  };
}

async function resolvePublishedPrices(
  source: RealRetailerSource,
  opts: CliOptions,
): Promise<ResolvedFile & { storeIdResolved: string }> {
  // Derive the host origin from any configured URL so that endpoint paths
  // like `/login`, `/file`, `/file/json/dir` resolve correctly.
  const originSource = source.loginUrl ?? source.transparencyUrl;
  const baseUrl = originSource ? new URL(originSource).origin : undefined;

  const provider = new PublishedPricesProvider({
    retailerKey: source.retailerKey,
    providerKind: 'PUBLISHED_PRICES',
    baseUrl,
    username: source.loginUsername,
    password: source.loginPassword,
    debugDir: debugDirFor(source.retailerKey),
  });

  await provider.login();
  console.log('  Authenticated.');

  // 1) Determine the store id (CLI override > known > stores-file detection).
  let storeId = opts.storeId ?? source.knownOnlineStoreIds[0];
  if (!storeId) {
    storeId = await detectStoreIdViaStoresFile(provider, source, opts);
  }
  if (!storeId) {
    throw new Error(
      'Could not detect an online store id automatically. Pass --storeId=<id> (e.g. --storeId=001-070).',
    );
  }
  console.log(`  Resolved store id: ${storeId}`);

  // 2) List PriceFull files and filter by storeId.
  const all = await provider.listFiles('PriceFull');
  if (all.length === 0) {
    throw new Error('PublishedPrices: no PriceFull files visible after login.');
  }
  const filtered = provider.filterByStoreId(all, storeId);
  if (filtered.length === 0) {
    console.error('PublishedPrices: no PriceFull files matched the given store id. Closest entries:');
    for (const f of all.slice(0, 10)) console.error(`  - ${f.fileName}`);
    throw new Error(`No PriceFull file matched storeId=${storeId}. Use --localPriceFull as a fallback.`);
  }
  const sorted = provider.sortByFilenameTimestampDesc(filtered);
  const latest = sorted[0];
  if (!latest) throw new Error('PublishedPrices: discovery returned an empty match list');
  console.log(`  Latest file: ${latest.fileName}`);

  const buffer = await provider.fetchFile(latest);
  const rawDir = rawDirFor(source.retailerKey);
  await ensureDir(rawDir);
  const rawPath = path.join(rawDir, latest.fileName);
  await saveBuffer(rawPath, buffer);

  return {
    buffer,
    fileName: latest.fileName,
    rawPath,
    sourceUrl: latest.downloadUrl,
    storeIdResolved: storeId,
  };
}

async function detectStoreIdViaStoresFile(
  provider: PublishedPricesProvider,
  source: RealRetailerSource,
  opts: CliOptions,
): Promise<string | undefined> {
  let storesXml: Buffer | undefined;
  if (opts.localStores) {
    storesXml = await readFile(path.resolve(opts.localStores));
    console.log(`  Using local Stores file: ${opts.localStores}`);
  } else {
    const storeFiles = await provider.listFiles('Stores');
    if (storeFiles.length === 0) return undefined;
    const sorted = provider.sortByFilenameTimestampDesc(storeFiles);
    const latest = sorted[0];
    if (!latest) return undefined;
    console.log(`  Stores file: ${latest.fileName}`);
    storesXml = await provider.fetchFile(latest);
    const rawDir = rawDirFor(source.retailerKey);
    await ensureDir(rawDir);
    await saveBuffer(path.join(rawDir, latest.fileName), storesXml);
  }
  const xml = await decompressIfGzip(storesXml);
  const doc = parseXmlToObject(xml);
  const storeRows = extractStoreRowsFromUnknownSchema(doc);
  const stores: ParsedStore[] = storeRows
    .map((r) => ({
      externalStoreId:
        pickString(r, 'StoreId', 'externalStoreId', 'storeId', 'BranchId', 'Branch') ?? '',
      displayName:
        pickString(r, 'StoreName', 'displayName', 'name') ?? '',
      city: pickString(r, 'City', 'city'),
      deliveryOffered: false,
      raw: r,
    }))
    .filter((s) => s.externalStoreId.length > 0);

  const detected = detectOnlineStores(stores);
  if (detected.length === 0) return undefined;
  const [top] = detected;
  if (!top || top.confidence < 0.7) {
    console.error('Online-store detection was not confident enough. Top candidates:');
    for (const c of detected.slice(0, 5)) {
      console.error(`  - ${c.store.externalStoreId}  ${c.store.displayName}  (confidence ${c.confidence.toFixed(2)})`);
    }
    return undefined;
  }
  return top.store.externalStoreId;
}

function detectStoreIdFromFilename(fileName: string): string | undefined {
  const m = fileName.match(/^[A-Za-z]+\d+-(\d{1,4})(?:-(\d{1,4}))?-\d{8,14}/);
  if (!m) return undefined;
  if (m[2]) return `${m[1]}-${m[2]}`;
  return m[1];
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exitCode = 1;
});
