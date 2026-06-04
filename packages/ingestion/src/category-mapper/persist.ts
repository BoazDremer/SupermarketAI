/**
 * Idempotent persistence of the common backbone + aliases into Postgres.
 *
 * Order:
 *   1. Recursively upsert backbone nodes (root departments first, then their
 *      categories, then sub-categories). `parentId` is taken from the node's
 *      position in the tree; only true terminal nodes (no children) get
 *      `isLeaf: true` so the API can distinguish navigation tiers from
 *      user-selectable filters.
 *   2. Delete any pre-existing `Category` rows whose id is no longer in the
 *      backbone.
 *   3. Replace aliases for each retailer in a transaction (delete-then-insert
 *      keyed by retailerSlug). This keeps `--persist=db` re-runnable without
 *      leaving stale mappings if the backbone changed between runs.
 */

import { getPrismaClient } from '@supermarket-price-compare/db';
import type { CommonTreeBuildResult } from '../scrapers/types.js';
import { COMMON_BACKBONE, walkBackbone, type BackboneNode } from './backbone.js';
import { remapCanonicalCategoryIds } from './remap-canonical-categories.js';
import { createProgress } from '../progress.js';

export type PersistOptions = {
  /** Limit alias replacement to these retailers. Defaults to all retailers in the result. */
  retailerSlugs?: ReadonlyArray<'shufersal' | 'rami-levy'>;
};

function backboneCategoryIds(): Set<string> {
  const ids = new Set<string>();
  walkBackbone((n) => {
    ids.add(n.id);
  });
  return ids;
}

export async function persistCommonTree(
  result: CommonTreeBuildResult,
  options: PersistOptions = {},
): Promise<{
  nodesUpserted: number;
  terminals: number;
  aliasesByRetailer: Record<string, number>;
  removedStaleCategories: number;
}> {
  const prisma = getPrismaClient();

  let nodesUpserted = 0;
  let terminals = 0;

  // Count all nodes up-front so the progress bar has a real total.
  const totalNodes = (() => {
    let n = 0;
    walkBackbone(() => {
      n += 1;
    });
    return n;
  })();
  const progress = createProgress({
    label: 'persist:categories',
    total: totalNodes,
    intervalMs: 1_000,
    extra: () => ({ upserted: nodesUpserted, terminals }),
  });

  async function upsertNode(node: BackboneNode, parent: BackboneNode | undefined, sortOrder: number): Promise<void> {
    const isTerminal = node.children.length === 0;
    const icon = parent === undefined ? (node.icon ?? null) : null;
    await prisma.category.upsert({
      where: { id: node.id },
      create: {
        id: node.id,
        parentId: parent?.id ?? null,
        nameHe: node.nameHe,
        nameEn: node.nameEn,
        icon,
        sortOrder,
        isLeaf: isTerminal,
      },
      update: {
        parentId: parent?.id ?? null,
        nameHe: node.nameHe,
        nameEn: node.nameEn,
        icon,
        sortOrder,
        isLeaf: isTerminal,
      },
    });
    nodesUpserted += 1;
    if (isTerminal) terminals += 1;
    progress.tick();
    for (const [idx, child] of node.children.entries()) {
      await upsertNode(child, node, idx);
    }
  }

  console.log(`[persist] upserting ${totalNodes} backbone nodes…`);
  for (const [idx, root] of COMMON_BACKBONE.entries()) {
    await upsertNode(root, undefined, idx);
  }
  progress.finish(`${nodesUpserted} upserted (${terminals} terminals)`);

  // Remove backbone rows dropped from `COMMON_BACKBONE` (upserts alone never
  // delete; stale ids would otherwise keep showing in GET /categories/tree).
  console.log('[persist] sweeping stale Category rows…');
  const validIds = backboneCategoryIds();
  const removed = await prisma.category.deleteMany({
    where: { id: { notIn: [...validIds] } },
  });
  console.log(`[persist] removed ${removed.count} stale Category rows`);

  console.log('[persist] remapping canonical products for backbone rule packs…');
  const remapped = await remapCanonicalCategoryIds(prisma);
  console.log(`[persist] remapped ${remapped} canonical product category ids`);

  // Aliases — replace per-retailer in one transaction.
  const retailerSlugs =
    options.retailerSlugs ??
    Array.from(new Set(result.aliases.map((a) => a.retailerSlug)));

  const aliasesByRetailer: Record<string, number> = {};
  for (const slug of retailerSlugs) {
    const rows = result.aliases.filter((a) => a.retailerSlug === slug);
    aliasesByRetailer[slug] = rows.length;
    console.log(`[persist] aliases[${slug}]: deleting old rows + inserting ${rows.length}…`);
    const tx0 = Date.now();
    await prisma.$transaction([
      prisma.retailerCategoryAlias.deleteMany({ where: { retailerSlug: slug } }),
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
    console.log(`[persist] aliases[${slug}] done in ${((Date.now() - tx0) / 1000).toFixed(1)}s`);
  }

  return { nodesUpserted, terminals, aliasesByRetailer, removedStaleCategories: removed.count };
}
