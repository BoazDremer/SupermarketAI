/**
 * Idempotent persistence of the common backbone + aliases into Postgres.
 *
 * Order:
 *   1. Upsert backbone groups (parentId IS NULL) first, then leaves.
 *   2. Replace aliases for each retailer in a transaction (delete-then-insert
 *      keyed by retailerSlug). This keeps `--persist=db` re-runnable without
 *      leaving stale mappings if the synonyms file changed between runs.
 */

import { getPrismaClient } from '@supermarket-price-compare/db';
import type { CommonTreeBuildResult } from '../scrapers/types.js';
import { COMMON_BACKBONE } from './backbone.js';

export type PersistOptions = {
  /** Limit alias replacement to these retailers. Defaults to all retailers in the result. */
  retailerSlugs?: ReadonlyArray<'shufersal' | 'rami-levy'>;
};

export async function persistCommonTree(
  result: CommonTreeBuildResult,
  options: PersistOptions = {},
): Promise<{ groups: number; leaves: number; aliasesByRetailer: Record<string, number> }> {
  const prisma = getPrismaClient();

  // 1. Backbone — upsert groups, then leaves.
  let groups = 0;
  let leaves = 0;
  for (const [groupIdx, g] of COMMON_BACKBONE.entries()) {
    await prisma.category.upsert({
      where: { id: g.id },
      create: {
        id: g.id,
        parentId: null,
        nameHe: g.nameHe,
        nameEn: g.nameEn,
        icon: g.icon,
        sortOrder: groupIdx,
        isLeaf: false,
      },
      update: {
        parentId: null,
        nameHe: g.nameHe,
        nameEn: g.nameEn,
        icon: g.icon,
        sortOrder: groupIdx,
        isLeaf: false,
      },
    });
    groups += 1;
    for (const [leafIdx, l] of g.leaves.entries()) {
      await prisma.category.upsert({
        where: { id: l.id },
        create: {
          id: l.id,
          parentId: g.id,
          nameHe: l.nameHe,
          nameEn: l.nameEn,
          icon: null,
          sortOrder: leafIdx,
          isLeaf: true,
        },
        update: {
          parentId: g.id,
          nameHe: l.nameHe,
          nameEn: l.nameEn,
          icon: null,
          sortOrder: leafIdx,
          isLeaf: true,
        },
      });
      leaves += 1;
    }
  }

  // 2. Aliases — replace per-retailer in one transaction.
  const retailerSlugs =
    options.retailerSlugs ??
    Array.from(new Set(result.aliases.map((a) => a.retailerSlug)));

  const aliasesByRetailer: Record<string, number> = {};
  for (const slug of retailerSlugs) {
    const rows = result.aliases.filter((a) => a.retailerSlug === slug);
    aliasesByRetailer[slug] = rows.length;
    await prisma.$transaction([
      prisma.retailerCategoryAlias.deleteMany({ where: { retailerSlug: slug, auto: true } }),
      ...(rows.length > 0
        ? [
            prisma.retailerCategoryAlias.createMany({
              data: rows.map((a) => ({
                retailerSlug: a.retailerSlug,
                chainCategoryId: a.chainCategoryId,
                chainCategoryName: a.chainCategoryName,
                chainCategoryDepth: a.chainCategoryDepth,
                categoryId: a.commonId,
                confidence: a.confidence,
                matchedSynonym: a.matchedSynonym,
                auto: a.auto,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);
  }

  return { groups, leaves, aliasesByRetailer };
}
