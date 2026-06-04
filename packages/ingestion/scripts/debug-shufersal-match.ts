import path from 'node:path';
import { getPrismaClient } from '@supermarket-price-compare/db';
import { expandShufersalHarvestLookupKeys } from '../src/product-mapper/shufersal-lookup-keys.js';
import { harvestShufersalCachedCards } from '../src/product-mapper/shufersal.js';

const cacheDir = path.resolve(
  import.meta.dirname,
  '../../../data/processed/categories/.cache/shufersal',
);
const harvest = await harvestShufersalCachedCards(cacheDir);
const prisma = getPrismaClient();

const dbRows = await prisma.retailerProduct.findMany({
  where: { retailer: { slug: 'shufersal' } },
  select: { barcode: true, externalItemCode: true },
});

const dbKeySet = new Set<string>();
for (const r of dbRows) {
  for (const k of expandShufersalHarvestLookupKeys('shufersal', r.barcode ?? '')) {
    dbKeySet.add(k);
  }
  for (const k of expandShufersalHarvestLookupKeys('shufersal', r.externalItemCode)) {
    dbKeySet.add(k);
  }
}

let matched = 0;
const unmatchedSamples: string[] = [];
for (const c of harvest.cards) {
  const keys = expandShufersalHarvestLookupKeys('shufersal', c.productCode);
  if (keys.some((k) => dbKeySet.has(k))) matched += 1;
  else if (unmatchedSamples.length < 15) unmatchedSamples.push(c.productCode);
}

console.log(
  JSON.stringify(
    {
      cards: harvest.cards.length,
      dbRows: dbRows.length,
      dbKeyVariants: dbKeySet.size,
      matchedCards: matched,
      sampleCardCodes: harvest.cards.slice(0, 8).map((c) => c.productCode),
      sampleUnmatched: unmatchedSamples,
      cardLenDist: Object.fromEntries(
        [...new Set(harvest.cards.map((c) => c.productCode.length))].map((len) => [
          len,
          harvest.cards.filter((c) => c.productCode.length === len).length,
        ]),
      ),
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
