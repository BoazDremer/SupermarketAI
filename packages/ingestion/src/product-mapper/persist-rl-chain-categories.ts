/**
 * Persist Rami Levy `/api/catalog` enrichment onto matching `RetailerProduct`
 * rows (by barcode / externalItemCode): native category ids + image URL.
 */

import { getPrismaClient } from '@supermarket-price-compare/db';

import type { RamiLevyEnumeratedProduct } from './rami-levy.js';
import { createProgress } from '../progress.js';

export type PersistRamiLevyChainCategoriesResult = {
  retailerProductsMatched: number;
  retailerProductsUpdated: number;
};

type CatalogFields = {
  chainDepartmentId: string | null;
  chainGroupId: string | null;
  chainSubGroupId: string | null;
  chainImageUrl: string | null;
};

function catalogFieldsFromProduct(p: RamiLevyEnumeratedProduct): CatalogFields {
  return {
    chainDepartmentId: p.departmentId > 0 ? String(p.departmentId) : null,
    chainGroupId: p.groupId != null && p.groupId > 0 ? String(p.groupId) : null,
    chainSubGroupId:
      p.subGroupId != null && p.subGroupId > 0 ? String(p.subGroupId) : null,
    chainImageUrl: p.imageUrl?.trim() ? p.imageUrl.trim() : null,
  };
}

function needsCatalogUpdate(
  existing: CatalogFields,
  next: CatalogFields,
): boolean {
  return (
    existing.chainDepartmentId !== next.chainDepartmentId ||
    existing.chainGroupId !== next.chainGroupId ||
    existing.chainSubGroupId !== next.chainSubGroupId ||
    existing.chainImageUrl !== next.chainImageUrl
  );
}

/**
 * Write RL department / group / sub-group ids and catalog image URL onto
 * `RetailerProduct` rows for `rami-levy`. Refreshes when catalog values differ.
 */
export async function persistRamiLevyChainCategories(
  products: readonly RamiLevyEnumeratedProduct[],
  options: { dryRun?: boolean; batchSize?: number } = {},
): Promise<PersistRamiLevyChainCategoriesResult> {
  const { dryRun = false, batchSize = 500 } = options;
  const prisma = getPrismaClient();

  const keyToCatalog = new Map<string, CatalogFields>();
  for (const p of products) {
    const barcode = p.barcode?.trim();
    if (!barcode) continue;
    keyToCatalog.set(barcode, catalogFieldsFromProduct(p));
  }

  const keys = [...keyToCatalog.keys()];
  let retailerProductsMatched = 0;
  let retailerProductsUpdated = 0;

  console.log(
    `[rami-levy-catalog] joining ${keys.length} catalog barcodes against RetailerProduct (batch=${batchSize})…`,
  );
  const progress = createProgress({
    label: 'rami-levy-catalog',
    total: keys.length,
    intervalMs: 1_000,
    extra: () => ({
      matched: retailerProductsMatched,
      updated: retailerProductsUpdated,
    }),
  });

  for (let i = 0; i < keys.length; i += batchSize) {
    const batchKeys = keys.slice(i, i + batchSize);
    const rows = await prisma.retailerProduct.findMany({
      where: {
        retailer: { slug: 'rami-levy' },
        OR: [
          { barcode: { in: batchKeys } },
          { externalItemCode: { in: batchKeys } },
        ],
      },
      select: {
        id: true,
        barcode: true,
        externalItemCode: true,
        chainDepartmentId: true,
        chainGroupId: true,
        chainSubGroupId: true,
        chainImageUrl: true,
      },
    });

    retailerProductsMatched += rows.length;

    const updates: Array<{ id: string; data: CatalogFields }> = [];
    for (const row of rows) {
      const lookupKey = row.barcode?.trim() || row.externalItemCode.trim();
      const next = keyToCatalog.get(lookupKey);
      if (!next) continue;
      const existing: CatalogFields = {
        chainDepartmentId: row.chainDepartmentId,
        chainGroupId: row.chainGroupId,
        chainSubGroupId: row.chainSubGroupId,
        chainImageUrl: row.chainImageUrl,
      };
      if (!needsCatalogUpdate(existing, next)) continue;
      updates.push({ id: row.id, data: next });
    }

    retailerProductsUpdated += updates.length;

    if (!dryRun && updates.length > 0) {
      for (let j = 0; j < updates.length; j += batchSize) {
        const chunk = updates.slice(j, j + batchSize);
        await prisma.$transaction(
          chunk.map((u) =>
            prisma.retailerProduct.update({ where: { id: u.id }, data: u.data }),
          ),
        );
      }
    }
    progress.tick(batchKeys.length);
  }
  progress.finish(
    `matched ${retailerProductsMatched} | updated ${retailerProductsUpdated}`,
  );

  return { retailerProductsMatched, retailerProductsUpdated };
}
