/**
 * Persist Shufersal HTML catalog enrichment onto matching `RetailerProduct`
 * rows: chain category codes (from `data-all-categories`) + card image URL.
 */

import { getPrismaClient } from '@supermarket-price-compare/db';

import {
  expandShufersalCardLookupKeys,
  expandShufersalHarvestLookupKeys,
} from './shufersal-lookup-keys.js';
import type { ShufersalProductCard } from './shufersal.js';
import { createProgress } from '../progress.js';

export type PersistShufersalCatalogResult = {
  retailerProductsMatched: number;
  retailerProductsUpdated: number;
};

type CatalogFields = {
  chainDepartmentId: string | null;
  chainGroupId: string | null;
  chainSubGroupId: string | null;
  chainImageUrl: string | null;
};

/**
 * Shufersal `chainCodes` are ordered most-specific → least-specific. We map
 * them onto the same columns as Rami Levy: narrowest code in
 * `chainSubGroupId`, next in `chainGroupId`, root in `chainDepartmentId`.
 */
function catalogFieldsFromCard(card: ShufersalProductCard): CatalogFields {
  const codes = card.chainCodes.filter((c) => c.trim().length > 0);
  return {
    chainSubGroupId: codes[0] ?? null,
    chainGroupId: codes.length >= 2 ? (codes[1] ?? null) : null,
    chainDepartmentId:
      codes.length >= 2 ? (codes[codes.length - 1] ?? null) : null,
    chainImageUrl: card.imageUrl?.trim() ? card.imageUrl.trim() : null,
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
 * Write Shufersal chain category codes and image URL onto `RetailerProduct`
 * rows for `shufersal`, matched by barcode / externalItemCode variants.
 */
export async function persistShufersalCatalog(
  cards: readonly ShufersalProductCard[],
  options: { dryRun?: boolean; batchSize?: number } = {},
): Promise<PersistShufersalCatalogResult> {
  const { dryRun = false, batchSize = 500 } = options;
  const prisma = getPrismaClient();

  const keyToCatalog = new Map<string, CatalogFields>();
  for (const card of cards) {
    const fields = catalogFieldsFromCard(card);
    for (const k of expandShufersalCardLookupKeys(card)) {
      keyToCatalog.set(k, fields);
    }
  }

  const keys = [...keyToCatalog.keys()];
  let retailerProductsMatched = 0;
  let retailerProductsUpdated = 0;

  console.log(
    `[shufersal-catalog] joining ${keys.length} card keys against RetailerProduct (batch=${batchSize})…`,
  );
  const progress = createProgress({
    label: 'shufersal-catalog',
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
        retailer: { slug: 'shufersal' },
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
      const tryKeys = new Set<string>();
      if (row.barcode) {
        for (const k of expandShufersalHarvestLookupKeys('shufersal', row.barcode)) {
          tryKeys.add(k);
        }
      }
      for (const k of expandShufersalHarvestLookupKeys(
        'shufersal',
        row.externalItemCode,
      )) {
        tryKeys.add(k);
      }
      let next: CatalogFields | undefined;
      for (const k of tryKeys) {
        const hit = keyToCatalog.get(k);
        if (hit) {
          next = hit;
          break;
        }
      }
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
