import type { PrismaClient } from '@supermarket-price-compare/db';
import {
  backboneProductCategoryIdRemaps,
  loadPrefixRemaps,
  remapCanonicalCategoryId,
} from './apply-backbone-rules.js';

/**
 * Migrate `CanonicalProduct.commonCategoryId` after backbone taxonomy fixes.
 * Safe to run repeatedly (idempotent when remaps are already applied).
 */
export async function remapCanonicalCategoryIds(prisma: PrismaClient): Promise<number> {
  const exact = backboneProductCategoryIdRemaps();
  const prefixes = loadPrefixRemaps();
  if (exact.length === 0 && prefixes.length === 0) return 0;

  const rows = await prisma.canonicalProduct.findMany({
    where: { commonCategoryId: { not: null } },
    select: { id: true, commonCategoryId: true },
  });

  let updated = 0;
  for (const row of rows) {
    const next = remapCanonicalCategoryId(row.commonCategoryId, exact, prefixes);
    if (next && next !== row.commonCategoryId) {
      await prisma.canonicalProduct.update({
        where: { id: row.id },
        data: { commonCategoryId: next },
      });
      updated += 1;
    }
  }
  return updated;
}
