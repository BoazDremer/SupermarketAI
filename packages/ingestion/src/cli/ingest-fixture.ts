import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { saveProcessedJson } from '../file-utils.js';
import { LocalFixtureProvider } from '../providers/local-fixture-provider.js';
import { defaultFixtureRootForKey, getIngestionPackageRoot } from '../retailer-sources.js';
import type { DiscoveredRetailerFile, RetailerFileKind } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function repoRootFromCli(): string {
  // packages/ingestion/src/cli -> ../../../../ = monorepo root
  return path.resolve(__dirname, '../../../..');
}

async function ingestKind(
  provider: LocalFixtureProvider,
  kind: RetailerFileKind,
  discover: () => Promise<DiscoveredRetailerFile[]>,
): Promise<unknown[]> {
  const files = await discover();
  const out: unknown[] = [];
  for (const f of files) {
    const raw = await provider.downloadFile(f);
    switch (kind) {
      case 'STORE':
        out.push({ file: f, stores: await provider.parseStores(raw) });
        break;
      case 'PRICE_FULL':
        out.push({ file: f, ...(await provider.parsePriceFull(raw)) });
        break;
      case 'PRICE_UPDATE':
        out.push({ file: f, prices: await provider.parsePriceUpdate(raw) });
        break;
      case 'PROMO_FULL':
        out.push({ file: f, ...(await provider.parsePromoFull(raw)) });
        break;
      case 'PROMO_UPDATE':
        out.push({ file: f, ...(await provider.parsePromoUpdate(raw)) });
        break;
      default:
        out.push({ file: f, note: 'unhandled kind' });
    }
  }
  return out;
}

async function main(): Promise<void> {
  const retailerKey = process.argv[2] ?? 'sample';
  const fixtureRoot = process.env.FIXTURE_ROOT ?? defaultFixtureRootForKey(retailerKey);

  const provider = new LocalFixtureProvider({
    retailerKey,
    providerKind: 'LOCAL_FIXTURE',
    fixtureRoot,
  });

  const payload = {
    retailerKey,
    fixtureRoot,
    generatedAt: new Date().toISOString(),
    stores: await ingestKind(provider, 'STORE', () => provider.discoverStoreFiles()),
    priceFull: await ingestKind(provider, 'PRICE_FULL', () => provider.discoverPriceFullFiles()),
    priceUpdate: await ingestKind(provider, 'PRICE_UPDATE', () => provider.discoverPriceUpdateFiles()),
    promoFull: await ingestKind(provider, 'PROMO_FULL', () => provider.discoverPromoFullFiles()),
    promoUpdate: await ingestKind(provider, 'PROMO_UPDATE', () => provider.discoverPromoUpdateFiles()),
  };

  const outDir = path.join(
    process.env.INGESTION_OUTPUT_ROOT ?? path.join(repoRootFromCli(), 'data', 'processed', 'ingestion'),
    retailerKey,
  );
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `fixture-ingest-${Date.now()}.json`);
  await saveProcessedJson(outPath, payload);
  console.log(`Wrote ${outPath}`);
  console.log(`Package root (fixtures): ${getIngestionPackageRoot()}`);
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
