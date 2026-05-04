/**
 * One-shot cleanup that removes the fixture-seeded rows previously inserted
 * by `prisma/seed.ts`. Real ingested data (Shufersal, Rami Levy, …) uses
 * Prisma-generated cuids and is left untouched.
 *
 * Identification strategy (overlapping for safety):
 *  - Retailers: slug IN ('freshmart', 'citycart') OR id starting with `fix_retailer_`.
 *  - Stores:    id starting with `fix_store_`.
 *  - Canonical products: id starting with `fp_`.
 *  - Retailer products: id starting with `rp_fix_retailer_`.
 *  - Retailer prices:   id starting with `price_fix_retailer_`.
 *  - Promotions:        id starting with `promo_` AND retailer is fixture.
 *  - Promotion items:   id starting with `pi_promo_`.
 *
 * Run:
 *   pnpm --filter @supermarket-price-compare/db db:cleanup-fixtures
 *   pnpm --filter @supermarket-price-compare/db db:cleanup-fixtures -- --dry-run
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FIXTURE_RETAILER_SLUGS = ['freshmart', 'citycart'];

type Counts = Record<string, number>;

function parseFlags(argv: readonly string[]): { dryRun: boolean } {
  return { dryRun: argv.includes('--dry-run') };
}

async function findFixtureRetailerIds(): Promise<string[]> {
  const rows = await prisma.retailer.findMany({
    where: {
      OR: [
        { slug: { in: FIXTURE_RETAILER_SLUGS } },
        { id: { startsWith: 'fix_retailer_' } },
      ],
    },
    select: { id: true, slug: true, displayName: true },
  });
  if (rows.length > 0) {
    console.log('Fixture retailers detected:');
    console.table(rows);
  }
  return rows.map((r) => r.id);
}

async function preview(retailerIds: readonly string[]): Promise<Counts> {
  const [
    retailers,
    stores,
    retailerProducts,
    retailerPrices,
    promotions,
    promotionItems,
    canonicalProducts,
    productMatches,
    basketComparisonRetailerResults,
    ingestionFiles,
    shoppingBagItems,
  ] = await Promise.all([
    prisma.retailer.count({
      where: { OR: [{ id: { in: [...retailerIds] } }, { slug: { in: FIXTURE_RETAILER_SLUGS } }] },
    }),
    prisma.retailerStore.count({
      where: {
        OR: [
          { retailerId: { in: [...retailerIds] } },
          { id: { startsWith: 'fix_store_' } },
        ],
      },
    }),
    prisma.retailerProduct.count({
      where: {
        OR: [
          { retailerId: { in: [...retailerIds] } },
          { id: { startsWith: 'rp_fix_retailer_' } },
        ],
      },
    }),
    prisma.retailerPrice.count({
      where: {
        OR: [
          { retailerId: { in: [...retailerIds] } },
          { id: { startsWith: 'price_fix_retailer_' } },
        ],
      },
    }),
    prisma.retailerPromotion.count({
      where: {
        OR: [
          { retailerId: { in: [...retailerIds] } },
          { id: { startsWith: 'promo_' } },
        ],
      },
    }),
    prisma.retailerPromotionItem.count({
      where: { id: { startsWith: 'pi_promo_' } },
    }),
    prisma.canonicalProduct.count({
      where: { id: { startsWith: 'fp_' } },
    }),
    prisma.productMatch.count({
      where: {
        OR: [
          { canonicalProductId: { startsWith: 'fp_' } },
          { retailerProductId: { startsWith: 'rp_fix_retailer_' } },
        ],
      },
    }),
    prisma.basketComparisonRetailerResult.count({
      where: { retailerId: { in: [...retailerIds] } },
    }),
    prisma.ingestionFile.count({
      where: { retailerId: { in: [...retailerIds] } },
    }),
    prisma.shoppingBagItem.count({
      where: {
        OR: [
          { canonicalProductId: { startsWith: 'fp_' } },
          { retailerId: { in: [...retailerIds] } },
          { retailerProductId: { startsWith: 'rp_fix_retailer_' } },
        ],
      },
    }),
  ]);

  return {
    retailers,
    stores,
    retailerProducts,
    retailerPrices,
    promotions,
    promotionItems,
    canonicalProducts,
    productMatches,
    basketComparisonRetailerResults,
    ingestionFiles,
    shoppingBagItems,
  };
}

async function removeFixtures(retailerIds: readonly string[]): Promise<Counts> {
  return prisma.$transaction(async (tx) => {
    const out: Counts = {};

    // 1) Detach line results referencing comparison results we're about to drop.
    //    The FK from BasketComparisonItemResult -> BasketComparisonRetailerResult
    //    is `Cascade`, so deleting the parents below will remove these rows
    //    automatically. We still count them for visibility.
    out.basketComparisonItemResults = await tx.basketComparisonItemResult.count({
      where: {
        basketComparisonRetailerResult: { retailerId: { in: [...retailerIds] } },
      },
    });

    // 2) BasketComparisonRetailerResult uses Restrict FK to Retailer, so we
    //    must remove these before deleting fixture retailers.
    const cmpRes = await tx.basketComparisonRetailerResult.deleteMany({
      where: { retailerId: { in: [...retailerIds] } },
    });
    out.basketComparisonRetailerResults = cmpRes.count;

    // 2b) Remove now-orphaned BasketComparison rows that have zero retailer
    //     results (they cannot be displayed and `retailerResults.min(1)` is
    //     enforced only at the API DTO layer).
    const orphanCmp = await tx.basketComparison.deleteMany({
      where: { retailerResults: { none: {} } },
    });
    out.orphanBasketComparisons = orphanCmp.count;

    // 3) Detach shopping bag items pointing at fixture data so they don't
    //    block deletes (FKs are SetNull, but stale rows are noisy).
    const bagItems = await tx.shoppingBagItem.deleteMany({
      where: {
        OR: [
          { canonicalProductId: { startsWith: 'fp_' } },
          { retailerId: { in: [...retailerIds] } },
          { retailerProductId: { startsWith: 'rp_fix_retailer_' } },
        ],
      },
    });
    out.shoppingBagItems = bagItems.count;

    // 4) Ingestion files attached to fixture retailers.
    const ingFiles = await tx.ingestionFile.deleteMany({
      where: { retailerId: { in: [...retailerIds] } },
    });
    out.ingestionFiles = ingFiles.count;

    // 5) Promotion items + promotions for fixture retailers.
    const promoItems = await tx.retailerPromotionItem.deleteMany({
      where: {
        OR: [
          { id: { startsWith: 'pi_promo_' } },
          { promotion: { retailerId: { in: [...retailerIds] } } },
        ],
      },
    });
    out.promotionItems = promoItems.count;

    const promos = await tx.retailerPromotion.deleteMany({
      where: {
        OR: [
          { id: { startsWith: 'promo_' } },
          { retailerId: { in: [...retailerIds] } },
        ],
      },
    });
    out.promotions = promos.count;

    // 6) Product matches for fixture canonicals or fixture retailer products.
    const matches = await tx.productMatch.deleteMany({
      where: {
        OR: [
          { canonicalProductId: { startsWith: 'fp_' } },
          { retailerProductId: { startsWith: 'rp_fix_retailer_' } },
        ],
      },
    });
    out.productMatches = matches.count;

    // 7) Prices then retailer products (FKs Cascade from retailer, but be
    //    explicit to be safe with id-prefix targeting).
    const prices = await tx.retailerPrice.deleteMany({
      where: {
        OR: [
          { retailerId: { in: [...retailerIds] } },
          { id: { startsWith: 'price_fix_retailer_' } },
        ],
      },
    });
    out.retailerPrices = prices.count;

    const retailerProducts = await tx.retailerProduct.deleteMany({
      where: {
        OR: [
          { retailerId: { in: [...retailerIds] } },
          { id: { startsWith: 'rp_fix_retailer_' } },
        ],
      },
    });
    out.retailerProducts = retailerProducts.count;

    // 8) Stores + retailers.
    const stores = await tx.retailerStore.deleteMany({
      where: {
        OR: [
          { retailerId: { in: [...retailerIds] } },
          { id: { startsWith: 'fix_store_' } },
        ],
      },
    });
    out.stores = stores.count;

    const retailers = await tx.retailer.deleteMany({
      where: {
        OR: [
          { id: { in: [...retailerIds] } },
          { slug: { in: FIXTURE_RETAILER_SLUGS } },
        ],
      },
    });
    out.retailers = retailers.count;

    // 9) Canonical products.
    const canonicals = await tx.canonicalProduct.deleteMany({
      where: { id: { startsWith: 'fp_' } },
    });
    out.canonicalProducts = canonicals.count;

    return out;
  });
}

async function main(): Promise<void> {
  const { dryRun } = parseFlags(process.argv.slice(2));
  if (dryRun) console.log('DRY RUN — no rows will be deleted.');

  const retailerIds = await findFixtureRetailerIds();

  const before = await preview(retailerIds);
  console.log('Rows that match fixture identifiers:');
  console.table(before);

  if (dryRun) return;

  if (Object.values(before).every((v) => v === 0)) {
    console.log('Nothing to clean up — fixture data already absent.');
    return;
  }

  const removed = await removeFixtures(retailerIds);
  console.log('Rows removed:');
  console.table(removed);

  const after = await preview(retailerIds);
  console.log('Remaining matches (expect all zero):');
  console.table(after);
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
