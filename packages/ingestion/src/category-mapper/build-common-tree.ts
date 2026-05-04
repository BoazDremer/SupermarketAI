/**
 * Builds the common category tree by mapping every leaf-ish node from each
 * chain's scraped tree onto a backbone leaf using the synonym matcher.
 *
 * Inputs:  ChainCategoryTree[] (one per chain).
 * Outputs: { backbone, aliases, unmapped } — see `types.ts` for shapes.
 *
 * Mapping rules:
 *   - For Rami Levy we prefer the deepest available level (subgroup if
 *     present, otherwise group).
 *   - For Shufersal we use depth==3 leaves (the 4th level), falling back to
 *     depth==2 when a depth-3 child is missing.
 *   - We pass the parent name to the matcher so generic leaf names like
 *     "טבעי" (natural) get disambiguated by their parent's context.
 */

import type {
  ChainCategoryNode,
  ChainCategoryTree,
  CommonCategoryAlias,
  CommonTreeBuildResult,
} from '../scrapers/types.js';
import { backboneAsTree } from './backbone.js';
import { bestLeafFor } from './similarity.js';

type LeafIteration = {
  retailerSlug: 'shufersal' | 'rami-levy';
  node: ChainCategoryNode;
  parentName?: string;
};

function* iterateChainLeaves(tree: ChainCategoryTree): Generator<LeafIteration> {
  // For each chain we want the most specific (deepest) named node. We yield
  // each node, but parent context lets the matcher disambiguate.
  function walk(node: ChainCategoryNode, parents: string[]): Generator<LeafIteration> {
    return (function* () {
      // Skip nodes whose name is just an unresolved code (e.g. "G020402").
      const looksLikeCode = /^[A-Z]\d+$/.test(node.nameHe);
      if (!looksLikeCode) {
        yield {
          retailerSlug: tree.retailerSlug,
          node,
          parentName: parents.length > 0 ? parents[parents.length - 1] : undefined,
        };
      }
      for (const child of node.children) yield* walk(child, [...parents, node.nameHe]);
    })();
  }
  for (const root of tree.roots) yield* walk(root, []);
}

export function buildCommonTree(
  chainTrees: readonly ChainCategoryTree[],
): CommonTreeBuildResult {
  const aliases: CommonCategoryAlias[] = [];
  const unmapped: CommonTreeBuildResult['unmapped'] = [];

  // Track which (retailer, chain id) we've already emitted so we don't
  // double-count nodes that appear via multiple ancestor paths.
  const seen = new Set<string>();

  for (const tree of chainTrees) {
    for (const it of iterateChainLeaves(tree)) {
      const key = `${it.retailerSlug}:${it.node.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const { best, top3 } = bestLeafFor(it.node.nameHe, it.parentName);
      if (best) {
        aliases.push({
          commonId: best.leafId,
          retailerSlug: it.retailerSlug,
          chainCategoryId: it.node.id,
          chainCategoryName: it.node.nameHe,
          chainCategoryDepth: it.node.depth,
          confidence: best.score,
          matchedSynonym: best.matchedSynonym,
          auto: true,
        });
      } else {
        unmapped.push({
          retailerSlug: it.retailerSlug,
          chainCategoryId: it.node.id,
          chainCategoryName: it.node.nameHe,
          chainCategoryDepth: it.node.depth,
          nearMisses: top3.map((t) => ({ commonId: t.leafId, score: t.score })),
        });
      }
    }
  }

  // Sort aliases for deterministic JSON output.
  aliases.sort((a, b) => {
    if (a.commonId !== b.commonId) return a.commonId.localeCompare(b.commonId);
    if (a.retailerSlug !== b.retailerSlug) return a.retailerSlug.localeCompare(b.retailerSlug);
    return a.chainCategoryId.localeCompare(b.chainCategoryId);
  });
  unmapped.sort((a, b) => {
    if (a.retailerSlug !== b.retailerSlug) return a.retailerSlug.localeCompare(b.retailerSlug);
    return a.chainCategoryId.localeCompare(b.chainCategoryId);
  });

  return {
    builtAt: new Date().toISOString(),
    backbone: backboneAsTree(),
    aliases,
    unmapped,
  };
}

/** Produce a small text summary for the CLI. */
export function summarizeBuildResult(result: CommonTreeBuildResult): string {
  const total = result.aliases.length + result.unmapped.length;
  const perRetailer = new Map<string, { mapped: number; unmapped: number }>();
  for (const a of result.aliases) {
    const k = a.retailerSlug;
    const e = perRetailer.get(k) ?? { mapped: 0, unmapped: 0 };
    e.mapped += 1;
    perRetailer.set(k, e);
  }
  for (const u of result.unmapped) {
    const k = u.retailerSlug;
    const e = perRetailer.get(k) ?? { mapped: 0, unmapped: 0 };
    e.unmapped += 1;
    perRetailer.set(k, e);
  }
  const lines: string[] = [];
  lines.push(`Common tree built — ${total} chain nodes processed.`);
  for (const [retailer, counts] of perRetailer) {
    const pct = total === 0 ? 0 : Math.round((counts.mapped / (counts.mapped + counts.unmapped)) * 100);
    lines.push(`  ${retailer}: ${counts.mapped} mapped, ${counts.unmapped} unmapped (${pct}% coverage)`);
  }
  // Per-leaf counts for easy spot-check.
  const perLeaf = new Map<string, number>();
  for (const a of result.aliases) {
    perLeaf.set(a.commonId, (perLeaf.get(a.commonId) ?? 0) + 1);
  }
  const top = [...perLeaf.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  lines.push('  top backbone leaves by alias count:');
  for (const [id, n] of top) lines.push(`    ${id}: ${n}`);
  return lines.join('\n');
}
