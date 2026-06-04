/**
 * Builds the common category tree by mapping every chain category node onto a
 * backbone node.
 *
 * Mapping algorithm (in priority order):
 *   1. **chainHints (direct)** — if the chain node's id is listed in a
 *      backbone node's `chainHints` for this retailer, that's the binding.
 *      Confidence = 1.0, `matchedSynonym = 'chainHint:direct'`.
 *   2. **chainHints (inherited)** — walk up the chain's own parent codes; the
 *      first ancestor that is a direct hint propagates its commonId down to
 *      the descendant. Confidence = 0.8, `matchedSynonym = 'chainHint:inherited'`.
 *   3. **Synonym matcher (legacy fallback)** — runs only for nodes still
 *      unresolved after the hints pass. Mirrors the previous logic but is
 *      now rarely needed because the backbone covers both chains end-to-end.
 *   4. **Catch-all** — anything still unresolved maps to `other/misc` (or
 *      stays in `unmapped` if even that's missing). Confidence = 0.05.
 *
 * Inputs:  ChainCategoryTree[] (one per chain).
 * Outputs: { backbone, aliases, unmapped } — see `types.ts` for shapes.
 */

import type {
  ChainCategoryNode,
  ChainCategoryTree,
  CommonCategoryAlias,
  CommonTreeBuildResult,
} from '../scrapers/types.js';
import { backboneAsTree, COMMON_BY_ID, terminalLeafFor, walkBackbone } from './backbone.js';
import { bestLeafFor } from './similarity.js';

const CATCH_ALL_ID = 'other/misc';

/**
 * Shufersal codes are structurally hierarchical: depth-N code is depth-(N-1)
 * + 2 chars (e.g. A0107 → child of A01 → child of A). The BFS scraper can
 * legitimately visit the same code under multiple parents (a "fresh milk"
 * code may appear both under dairy and under a health-products department),
 * so the tree-derived `parent` reference is ambiguous. The code's own prefix
 * is unambiguous, so we use that for walk-up.
 */
function shufersalCodeParent(code: string): string | undefined {
  if (!/^[A-Z]\d*$/.test(code)) return undefined;
  if (code.length <= 1) return undefined;
  return code.slice(0, code.length - 2);
}

/** Shufersal-style bare category codes in `nameHe` before titles are resolved. */
const LOOKS_LIKE_CODE = /^[A-Z]\d+$/;

function isCodeName(name: string): boolean {
  return LOOKS_LIKE_CODE.test(name);
}

function ancestorHint(ancestors: readonly ChainCategoryNode[]): string | undefined {
  const parts = ancestors.map((a) => a.nameHe).filter((n) => !isCodeName(n));
  const s = parts.join(' ').trim();
  return s.length > 0 ? s : undefined;
}

function nonCodePathParts(
  ancestors: readonly ChainCategoryNode[],
  node: ChainCategoryNode,
): string[] {
  const parts: string[] = [];
  for (const a of ancestors) if (!isCodeName(a.nameHe)) parts.push(a.nameHe);
  if (!isCodeName(node.nameHe)) parts.push(node.nameHe);
  return parts;
}

type FlatNode = {
  retailerSlug: 'shufersal' | 'rami-levy';
  node: ChainCategoryNode;
  parent: ChainCategoryNode | undefined;
  ancestors: ChainCategoryNode[];
};

function chainKey(retailerSlug: 'shufersal' | 'rami-levy', nodeId: string): string {
  return `${retailerSlug}:${nodeId}`;
}

function collectFlatNodes(sortedTrees: readonly ChainCategoryTree[]): FlatNode[] {
  const out: FlatNode[] = [];
  function walk(
    retailerSlug: 'shufersal' | 'rami-levy',
    node: ChainCategoryNode,
    parent: ChainCategoryNode | undefined,
    ancestors: ChainCategoryNode[],
  ): void {
    out.push({ retailerSlug, node, parent, ancestors });
    for (const child of node.children) walk(retailerSlug, child, node, [...ancestors, node]);
  }
  for (const tree of sortedTrees) {
    for (const root of tree.roots) walk(tree.retailerSlug, root, undefined, []);
  }
  return out;
}

/**
 * Build a `chainCode -> { commonId, depth }` map from the backbone hints,
 * keeping only the deepest commonId for each chain code (most specific wins).
 */
function collectHintMaps(): {
  shufersal: Map<string, { commonId: string; depth: number }>;
  ramiLevy: Map<string, { commonId: string; depth: number }>;
} {
  const shufersal = new Map<string, { commonId: string; depth: number }>();
  const ramiLevy = new Map<string, { commonId: string; depth: number }>();
  walkBackbone((node, depth) => {
    const hints = node.chainHints;
    if (!hints) return;
    if (hints.shufersal) {
      for (const code of hints.shufersal) {
        const prev = shufersal.get(code);
        if (!prev || depth > prev.depth) shufersal.set(code, { commonId: node.id, depth });
      }
    }
    if (hints.ramiLevy) {
      for (const code of hints.ramiLevy) {
        const prev = ramiLevy.get(code);
        if (!prev || depth > prev.depth) ramiLevy.set(code, { commonId: node.id, depth });
      }
    }
  });
  return { shufersal, ramiLevy };
}

export function buildCommonTree(
  chainTrees: readonly ChainCategoryTree[],
): CommonTreeBuildResult {
  const sortedTrees = [...chainTrees].sort((a, b) => {
    if (a.retailerSlug === b.retailerSlug) return 0;
    if (a.retailerSlug === 'shufersal') return -1;
    if (b.retailerSlug === 'shufersal') return 1;
    return a.retailerSlug.localeCompare(b.retailerSlug);
  });

  const flatNodes = collectFlatNodes(sortedTrees);

  // Map chainKey -> parent chainNode for ancestor walks.
  const parentByChildKey = new Map<string, ChainCategoryNode | undefined>();
  for (const it of flatNodes) {
    parentByChildKey.set(chainKey(it.retailerSlug, it.node.id), it.parent);
  }

  const hintMaps = collectHintMaps();

  const resolved = new Map<string, CommonCategoryAlias>();
  const seen = new Set<string>();

  function lookupHint(
    retailerSlug: 'shufersal' | 'rami-levy',
    code: string,
  ): { commonId: string; depth: number } | undefined {
    return retailerSlug === 'shufersal'
      ? hintMaps.shufersal.get(code)
      : hintMaps.ramiLevy.get(code);
  }

  // Pass 1: direct chainHints
  for (const it of flatNodes) {
    const k = chainKey(it.retailerSlug, it.node.id);
    if (seen.has(k)) continue;
    seen.add(k);
    const hit = lookupHint(it.retailerSlug, it.node.id);
    if (hit) {
      resolved.set(k, {
        commonId: hit.commonId,
        retailerSlug: it.retailerSlug,
        chainCategoryId: it.node.id,
        chainCategoryName: it.node.nameHe,
        chainCategoryDepth: it.node.depth,
        confidence: 1.0,
        matchedSynonym: 'chainHint:direct',
        auto: false,
      });
    }
  }

  // Pass 2: inherited via chain-parent walk-up.
  // For Shufersal we walk via code-structure prefix (drop last 2 chars) so a
  // node that the BFS scraper reached under the "wrong" parent (e.g. a
  // recommendation panel under a different department) still inherits from
  // its canonical ancestor. For Rami Levy we use the tree parent — RL ids
  // are flat numbers with no prefix relation, so the tree is the only source.
  function chainParentCode(
    retailer: 'shufersal' | 'rami-levy',
    nodeId: string,
    treeParent: ChainCategoryNode | undefined,
  ): string | undefined {
    if (retailer === 'shufersal') return shufersalCodeParent(nodeId);
    return treeParent?.id;
  }
  for (const it of flatNodes) {
    const k = chainKey(it.retailerSlug, it.node.id);
    if (resolved.has(k)) continue;
    let walkerId = chainParentCode(it.retailerSlug, it.node.id, it.parent);
    while (walkerId) {
      const wk = chainKey(it.retailerSlug, walkerId);
      const ancHit = resolved.get(wk);
      const directAncHit = lookupHint(it.retailerSlug, walkerId);
      const commonId = ancHit?.commonId ?? directAncHit?.commonId;
      if (commonId) {
        resolved.set(k, {
          commonId,
          retailerSlug: it.retailerSlug,
          chainCategoryId: it.node.id,
          chainCategoryName: it.node.nameHe,
          chainCategoryDepth: it.node.depth,
          confidence: 0.8,
          matchedSynonym: 'chainHint:inherited',
          auto: false,
        });
        break;
      }
      const parentNode = parentByChildKey.get(wk);
      walkerId = chainParentCode(it.retailerSlug, walkerId, parentNode);
    }
  }

  // Pass 3: legacy synonym matcher (rarely needed; covers chain nodes that
  // somehow slipped through the backbone hints).
  const nearMissByKey = new Map<string, Array<{ commonId: string; score: number }>>();
  for (const it of flatNodes) {
    const k = chainKey(it.retailerSlug, it.node.id);
    if (resolved.has(k)) continue;
    const { best, top3 } = isCodeName(it.node.nameHe)
      ? bestLeafFor(nonCodePathParts(it.ancestors, it.node).join(' ').trim() || it.node.nameHe)
      : bestLeafFor(it.node.nameHe, ancestorHint(it.ancestors));
    nearMissByKey.set(
      k,
      top3.map((t) => ({ commonId: t.leafId, score: t.score })),
    );
    if (best && COMMON_BY_ID.has(best.leafId)) {
      resolved.set(k, {
        commonId: best.leafId,
        retailerSlug: it.retailerSlug,
        chainCategoryId: it.node.id,
        chainCategoryName: it.node.nameHe,
        chainCategoryDepth: it.node.depth,
        confidence: best.score,
        matchedSynonym: best.matchedSynonym,
        auto: true,
      });
    }
  }

  // Pass 4: catch-all → other/misc
  const unmapped: CommonTreeBuildResult['unmapped'] = [];
  for (const it of flatNodes) {
    const k = chainKey(it.retailerSlug, it.node.id);
    if (resolved.has(k)) continue;
    // Sanity check: the backbone must contain `other/misc`. If not, leave the
    // node in `unmapped` for visibility.
    let hasCatchAll = false;
    walkBackbone((n) => {
      if (n.id === CATCH_ALL_ID) hasCatchAll = true;
    });
    if (hasCatchAll) {
      resolved.set(k, {
        commonId: CATCH_ALL_ID,
        retailerSlug: it.retailerSlug,
        chainCategoryId: it.node.id,
        chainCategoryName: it.node.nameHe,
        chainCategoryDepth: it.node.depth,
        confidence: 0.05,
        matchedSynonym: 'catchAll',
        auto: false,
      });
    } else {
      unmapped.push({
        retailerSlug: it.retailerSlug,
        chainCategoryId: it.node.id,
        chainCategoryName: it.node.nameHe,
        chainCategoryDepth: it.node.depth,
        nearMisses: nearMissByKey.get(k) ?? [],
      });
    }
  }

  // Pass 5: enforce leaf-only assignments. The deepest-wins logic in
  // `collectHintMaps()` plus the synthesised `*/general` leaves usually keep
  // every alias on a terminal already; this pass is the safety net for any
  // alias that still lands on an intermediate (e.g. via Pass 3 synonyms).
  let redirectsApplied = 0;
  const redirectFailures: Array<{ retailerSlug: string; chainCategoryId: string; commonId: string }> = [];
  for (const [k, alias] of resolved) {
    const target = terminalLeafFor(alias.commonId);
    if (target === alias.commonId) continue;
    if (target) {
      resolved.set(k, { ...alias, commonId: target });
      redirectsApplied += 1;
    } else {
      // No fallback child available — record the failure but don't crash the
      // build. The caller surfaces these in the summary so authors can add a
      // `<id>/general` leaf to the backbone.
      redirectFailures.push({
        retailerSlug: alias.retailerSlug,
        chainCategoryId: alias.chainCategoryId,
        commonId: alias.commonId,
      });
    }
  }
  if (redirectsApplied > 0) {
    console.log(
      `[build-common-tree] redirected ${redirectsApplied} aliases from intermediates to their /general leaf`,
    );
  }
  if (redirectFailures.length > 0) {
    console.warn(
      `[build-common-tree] WARNING: ${redirectFailures.length} aliases still on a non-terminal (no fallback leaf available):`,
    );
    for (const f of redirectFailures.slice(0, 10)) {
      console.warn(`  ${f.retailerSlug}:${f.chainCategoryId} -> ${f.commonId}`);
    }
  }

  const aliases: CommonCategoryAlias[] = [...resolved.values()];
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
  const perRetailer = new Map<string, { mapped: number; unmapped: number; byKind: Record<string, number> }>();
  for (const a of result.aliases) {
    const k = a.retailerSlug;
    const e =
      perRetailer.get(k) ??
      ({ mapped: 0, unmapped: 0, byKind: {} } as { mapped: number; unmapped: number; byKind: Record<string, number> });
    e.mapped += 1;
    const kind = a.matchedSynonym ?? 'unknown';
    e.byKind[kind] = (e.byKind[kind] ?? 0) + 1;
    perRetailer.set(k, e);
  }
  for (const u of result.unmapped) {
    const k = u.retailerSlug;
    const e =
      perRetailer.get(k) ??
      ({ mapped: 0, unmapped: 0, byKind: {} } as { mapped: number; unmapped: number; byKind: Record<string, number> });
    e.unmapped += 1;
    perRetailer.set(k, e);
  }
  const lines: string[] = [];
  lines.push(`Common tree built — ${total} chain nodes processed.`);
  for (const [retailer, counts] of perRetailer) {
    const denom = counts.mapped + counts.unmapped;
    const pct = denom === 0 ? 0 : Math.round((counts.mapped / denom) * 100);
    const breakdown = Object.entries(counts.byKind)
      .sort((a, b) => b[1] - a[1])
      .map(([kind, n]) => `${kind}=${n}`)
      .join(', ');
    lines.push(
      `  ${retailer}: ${counts.mapped} mapped, ${counts.unmapped} unmapped (${pct}% coverage)` +
        (breakdown ? ` — ${breakdown}` : ''),
    );
  }
  const perLeaf = new Map<string, number>();
  for (const a of result.aliases) {
    perLeaf.set(a.commonId, (perLeaf.get(a.commonId) ?? 0) + 1);
  }
  const top = [...perLeaf.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  lines.push('  top backbone nodes by alias count:');
  for (const [id, n] of top) lines.push(`    ${id}: ${n}`);
  return lines.join('\n');
}
