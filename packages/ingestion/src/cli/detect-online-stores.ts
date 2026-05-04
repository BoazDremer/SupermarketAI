import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { detectLikelyOnlineDeliveryStore } from '../normalizers.js';
import { LocalFixtureProvider } from '../providers/local-fixture-provider.js';
import { defaultFixtureRootForKey } from '../retailer-sources.js';

async function main(): Promise<void> {
  const inputPath =
    process.argv[2] ??
    path.join(defaultFixtureRootForKey('sample'), 'stores.xml');

  const buf = await readFile(inputPath);
  const fixtureRoot = path.dirname(inputPath);
  const provider = new LocalFixtureProvider({
    retailerKey: 'sample',
    providerKind: 'LOCAL_FIXTURE',
    fixtureRoot,
  });
  const stores = await provider.parseStores(buf);

  for (const store of stores) {
    const likely = detectLikelyOnlineDeliveryStore(store);
    console.log(
      JSON.stringify({
        externalStoreId: store.externalStoreId,
        displayName: store.displayName,
        city: store.city,
        deliveryOffered: store.deliveryOffered,
        likelyOnlineDelivery: likely,
      }),
    );
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
