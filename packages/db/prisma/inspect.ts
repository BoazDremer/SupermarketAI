/**
 * Quick sanity report of the current DB contents. Useful to confirm the
 * remaining rows are real ingested data after running cleanup.
 *
 * Run:
 *   pnpm --filter @supermarket-price-compare/db db:inspect
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const [
    retailers,
    stores,
    canonicalProducts,
    retailerProducts,
    retailerPrices,
    productMatches,
    promotions,
    promotionItems,
    ingestionRuns,
    ingestionFiles,
    shoppingBags,
    shoppingBagItems,
    basketComparisons,
  ] = await Promise.all([
    prisma.retailer.findMany({
      select: { id: true, slug: true, displayName: true, displayNameHe: true, isActive: true },
      orderBy: { displayName: 'asc' },
    }),
    prisma.retailerStore.count(),
    prisma.canonicalProduct.count(),
    prisma.retailerProduct.count(),
    prisma.retailerPrice.count(),
    prisma.productMatch.count(),
    prisma.retailerPromotion.count(),
    prisma.retailerPromotionItem.count(),
    prisma.ingestionRun.count(),
    prisma.ingestionFile.count(),
    prisma.shoppingBag.count(),
    prisma.shoppingBagItem.count(),
    prisma.basketComparison.count(),
  ]);

  console.log('Retailers:');
  console.table(retailers);

  console.log('Row counts:');
  console.table({
    stores,
    canonicalProducts,
    retailerProducts,
    retailerPrices,
    productMatches,
    promotions,
    promotionItems,
    ingestionRuns,
    ingestionFiles,
    shoppingBags,
    shoppingBagItems,
    basketComparisons,
  });
}

main()
  .catch((err) => {
    console.error('Inspect failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
