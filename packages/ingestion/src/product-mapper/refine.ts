/**
 * Name-aware refinement of backbone category assignment.
 *
 * The first-pass mapping (`assign.ts`) resolves a `CanonicalProduct` to a
 * backbone leaf by walking the chain's category tree (`RetailerCategoryAlias`).
 * That works well for tightly-named chain leaves (e.g. RL "ביצים" → dairy/eggs)
 * but produces false positives whenever the chain category itself is broad,
 * e.g.:
 *
 *   - RL dept "חלב ביצים וסלטים" matches "ביצים" → every salad / cold-food
 *     subgroup ends up under `dairy/eggs`.
 *   - Shufersal dept `F` "שופרסל גרין" inherits to the entire green-store
 *     subtree → bread, dairy, and produce all become `produce/organic`.
 *   - Inherited aliases assigned at low confidence get applied to every
 *     descendant code regardless of relevance.
 *
 * This module corroborates the chain-derived leaf against the **product's own
 * name** (Hebrew display + brand). Decision rules:
 *
 *   1. **Strict leaves** (`STRICT_LEAVES`): the product name MUST contain a
 *      synonym for that leaf. If not, we look for a better leaf via the
 *      name-only matcher; failing that, we drop the assignment (safer than a
 *      visibly wrong "eggs" tag).
 *   2. **Cross-group conflict**: if the name strongly suggests a different
 *      backbone group than the alias did, the name wins. If the alias was
 *      inherited (low confidence), even a moderate name signal wins.
 *   3. **Same-group leaf refinement**: if the alias picked a leaf and the
 *      name matches a *different* leaf in the *same group* with a moderate
 *      score, switch to the name-derived leaf (e.g. `dairy/eggs` → `dairy/cheese`
 *      when the product name is "גבינת שמנת").
 *   4. Otherwise, keep the alias.
 *
 * The function is pure — no DB access — so it can run both at write-time
 * inside `assign.ts` and as a standalone backfill pass.
 */

import { COMMON_BY_ID, terminalLeafFor } from '../category-mapper/backbone.js';
import {
  bestLeafFor,
  normalizeHe,
  scoreGroupsForChainName,
  scoreLeavesForChainName,
  type LeafScore,
} from '../category-mapper/similarity.js';
import { GROUP_SYNONYMS, LEAF_SYNONYMS } from '../category-mapper/synonyms.js';

/**
 * Leaves whose meaning is narrow enough that a chain-category alias alone
 * (which often inherits from a broad ancestor) is not safe — the product name
 * itself must contain a corroborating keyword.
 *
 * With the chainHints-based mapper most aliases are high-confidence direct
 * matches (1.0) or inherited (0.8); the legacy strict-leaf demotion only
 * helps for low-confidence inherits, and the new tree's leaf ids differ
 * enough from the old 2-depth ones that retiring this list is simplest.
 * Reintroduce specific leaves here when concrete false-positives surface.
 */
const STRICT_LEAVES: ReadonlySet<string> = new Set<string>();

/** Score thresholds tuned for product-name length (≈20–60 chars). */
const STRONG_NAME_SCORE = 0.18;
const MODERATE_NAME_SCORE = 0.1;
const LOW_ALIAS_CONFIDENCE = 0.25;

export type RefineReason =
  | 'no-name'
  | 'no-alias-no-name-signal'
  | 'name-only-leaf'
  | 'name-only-group'
  | 'agree'
  | 'kept-alias'
  | 'leaf-refined-same-group'
  | 'cross-group-name-overrides'
  | 'cross-group-low-alias-overridden'
  | 'cross-group-demote-to-alias-group'
  | 'strict-leaf-overridden-by-name'
  | 'strict-leaf-demoted-to-other-group'
  | 'strict-leaf-demoted-to-alias-group'
  | 'strict-leaf-no-support';

export type RefineDecision = {
  finalLeafId?: string;
  reason: RefineReason;
  aliasLeafId?: string;
  aliasConfidence?: number;
  nameLeafId?: string;
  nameLeafScore?: number;
  nameGroupId?: string;
  nameGroupScore?: number;
};

export type RefineInput = {
  /** Primary text to score (product Hebrew display name). */
  name: string | undefined;
  /** Optional brand string folded into the haystack. */
  brand?: string;
  /** Optional secondary names (transparency name, English display) folded in for a longer haystack. */
  extraNames?: ReadonlyArray<string | undefined | null>;
  /** Backbone leaf id resolved from chain-category alias; may be undefined when the alias map yielded nothing. */
  aliasLeafId?: string;
  /** 0..1 confidence reported by the alias row (lower → easier to override). */
  aliasConfidence?: number;
};

function groupOfId(id: string): string {
  const idx = id.indexOf('/');
  return idx === -1 ? id : id.slice(0, idx);
}

function isLeafId(id: string): boolean {
  return id.includes('/');
}

/**
 * Safety net for stale synonyms.ts keys: the legacy matcher may still emit
 * ids that no longer exist in the 3-depth backbone (renames like
 * `dairy/yogurt` → `dairy/yogurt-desserts`). Strip those before writing
 * them onto a CanonicalProduct.
 */
function isKnownBackboneId(id: string | undefined | null): id is string {
  if (!id) return false;
  return COMMON_BY_ID.has(id);
}

function nameMatchesAnySynonym(
  synonyms: readonly string[] | undefined,
  normalizedHaystack: string,
): boolean {
  if (!synonyms || synonyms.length === 0) return false;
  for (const syn of synonyms) {
    const n = normalizeHe(syn);
    if (n.length === 0) continue;
    if (normalizedHaystack.includes(n)) return true;
  }
  return false;
}

/**
 * Collect every candidate name we want to score against. We score each
 * variant *independently* (rather than concatenating) so a strong hit in
 * `displayNameHe` isn't diluted by appending an English `displayName` and a
 * brand string — division by haystack length would otherwise crush the score.
 *
 * Brand is appended to each variant because brand-only matches (e.g. "אלפרו"
 * → dairy/plant-based) only carry signal when seen alongside the product
 * text, not as a standalone token.
 */
function buildHaystackVariants(input: RefineInput): string[] {
  const variants: string[] = [];
  const brand = input.brand?.trim();
  const push = (text: string | undefined | null) => {
    if (!text) return;
    const t = text.trim();
    if (t.length === 0) return;
    variants.push(brand ? `${t} ${brand}` : t);
  };
  push(input.name);
  for (const extra of input.extraNames ?? []) push(extra);
  if (variants.length === 0 && brand) variants.push(brand);
  return Array.from(new Set(variants));
}

/** Best (highest-scoring) leaf across all haystack variants. */
function bestAcross(
  variants: readonly string[],
  scorer: (text: string) => LeafScore[],
): { top?: LeafScore; allFromBest: LeafScore[] } {
  let top: LeafScore | undefined;
  let allFromBest: LeafScore[] = [];
  for (const v of variants) {
    const scores = scorer(v);
    const candidate = scores[0];
    if (!candidate) continue;
    if (!top || candidate.score > top.score) {
      top = candidate;
      allFromBest = scores;
    }
  }
  return { top, allFromBest };
}

/**
 * Refine an alias-resolved backbone assignment using the product name.
 *
 * Returns `{ finalLeafId }` (may be undefined) plus a `reason` tag for
 * diagnostics. Pure / side-effect free.
 *
 * Post-condition: `finalLeafId`, when set, is always a terminal backbone id.
 * Any internal path that produced an intermediate (e.g. a group-level demote)
 * is coerced through {@link terminalLeafFor} so callers can write the result
 * straight into `CanonicalProduct.commonCategoryId` without re-checking.
 */
export function refineAssignment(input: RefineInput): RefineDecision {
  const decision = computeRefineDecision(input);
  if (!decision.finalLeafId) return decision;
  const terminal = terminalLeafFor(decision.finalLeafId);
  if (terminal === decision.finalLeafId) return decision;
  if (terminal) return { ...decision, finalLeafId: terminal };
  // No safe terminal under the proposed parent — drop the assignment rather
  // than persist a non-leaf id. This keeps the "every product on a leaf"
  // invariant intact even when the backbone is incomplete.
  return { ...decision, finalLeafId: undefined };
}

function computeRefineDecision(input: RefineInput): RefineDecision {
  const aliasLeafId = input.aliasLeafId?.trim() || undefined;
  const aliasConfidence = input.aliasConfidence;
  const variants = buildHaystackVariants(input);

  const baseDecision: RefineDecision = {
    finalLeafId: aliasLeafId,
    reason: 'no-name',
    aliasLeafId,
    aliasConfidence,
  };

  if (variants.length === 0) return baseDecision;

  const { top: topLeaf } = bestAcross(variants, scoreLeavesForChainName);
  const { top: topGroup } = bestAcross(variants, scoreGroupsForChainName);
  // Strict-leaf "name supports alias" check uses union of all variants —
  // any single variant containing a synonym is enough.
  const normalizedUnion = variants.map((v) => normalizeHe(v)).join(' ');
  const normalized = normalizedUnion;
  // Pick the best leaf from `bestLeafFor` (which has its own thresholds) —
  // we use this for the "no alias" fallback path to mirror chain-mapper logic.
  let nameBest: { leafId: string; score: number } | undefined;
  for (const v of variants) {
    const candidate = bestLeafFor(v).best;
    if (candidate && (!nameBest || candidate.score > nameBest.score)) nameBest = candidate;
  }

  baseDecision.nameLeafId = topLeaf?.leafId;
  baseDecision.nameLeafScore = topLeaf ? Number(topLeaf.score.toFixed(3)) : undefined;
  baseDecision.nameGroupId = topGroup?.leafId;
  baseDecision.nameGroupScore = topGroup ? Number(topGroup.score.toFixed(3)) : undefined;

  // 1) No alias at all — fall back to name-only.
  if (!aliasLeafId) {
    if (nameBest && isKnownBackboneId(nameBest.leafId)) {
      const reason: RefineReason = isLeafId(nameBest.leafId)
        ? 'name-only-leaf'
        : 'name-only-group';
      return { ...baseDecision, finalLeafId: nameBest.leafId, reason };
    }
    return { ...baseDecision, finalLeafId: undefined, reason: 'no-alias-no-name-signal' };
  }

  // 2) Name's top leaf agrees with alias — done.
  if (topLeaf && topLeaf.leafId === aliasLeafId) {
    return { ...baseDecision, finalLeafId: aliasLeafId, reason: 'agree' };
  }

  const aliasIsLeaf = isLeafId(aliasLeafId);
  const aliasGroup = groupOfId(aliasLeafId);
  const aliasGroupExists = COMMON_BY_ID.has(aliasGroup);
  // For LEAF aliases: name must contain that leaf's own synonym.
  // For GROUP aliases: any of the group's synonyms OR any synonym from any
  // leaf BELONGING to that group counts as support — otherwise a category
  // like "personal-care" would never be considered "supported" by names like
  // "שפתון" (which is a leaf-level cosmetics keyword).
  const aliasNameSupports = aliasIsLeaf
    ? nameMatchesAnySynonym(LEAF_SYNONYMS[aliasLeafId], normalized)
    : nameMatchesAnySynonym(GROUP_SYNONYMS[aliasLeafId], normalized) ||
      Object.entries(LEAF_SYNONYMS).some(
        ([leafId, syns]) =>
          groupOfId(leafId) === aliasLeafId && nameMatchesAnySynonym(syns, normalized),
      );

  // 3) Strict leaf without name corroboration — try harder, demote, or null.
  if (aliasIsLeaf && STRICT_LEAVES.has(aliasLeafId) && !aliasNameSupports) {
    if (topLeaf && topLeaf.score >= MODERATE_NAME_SCORE) {
      return {
        ...baseDecision,
        finalLeafId: topLeaf.leafId,
        reason: 'strict-leaf-overridden-by-name',
      };
    }
    if (
      topGroup &&
      topGroup.score >= MODERATE_NAME_SCORE &&
      topGroup.leafId !== aliasGroup
    ) {
      return {
        ...baseDecision,
        finalLeafId: topGroup.leafId,
        reason: 'strict-leaf-demoted-to-other-group',
      };
    }
    if (aliasGroupExists && nameMatchesAnySynonym(GROUP_SYNONYMS[aliasGroup], normalized)) {
      return {
        ...baseDecision,
        finalLeafId: aliasGroup,
        reason: 'strict-leaf-demoted-to-alias-group',
      };
    }
    return { ...baseDecision, finalLeafId: undefined, reason: 'strict-leaf-no-support' };
  }

  // 4) Cross-group conflict — pick the name's group when its signal is strong
  //    or the alias was clearly inherited. But if the name *also* supports the
  //    alias's leaf (e.g. "ממרח לוטוס ביסקויט" matches both `breakfast/spreads`
  //    via "ממרח" and `snacks/cookies` via "ביסקויט"), we keep the alias —
  //    cross-group disagreement is only real when the name truly does NOT
  //    corroborate the alias.
  const nameTopGroup = topLeaf ? groupOfId(topLeaf.leafId) : topGroup?.leafId;
  if (nameTopGroup && nameTopGroup !== aliasGroup && !aliasNameSupports) {
    if (topLeaf && topLeaf.score >= STRONG_NAME_SCORE && isKnownBackboneId(topLeaf.leafId)) {
      return {
        ...baseDecision,
        finalLeafId: topLeaf.leafId,
        reason: 'cross-group-name-overrides',
      };
    }
    if (
      (aliasConfidence ?? 1) < LOW_ALIAS_CONFIDENCE &&
      ((topLeaf && topLeaf.score >= MODERATE_NAME_SCORE) ||
        (topGroup && topGroup.score >= MODERATE_NAME_SCORE))
    ) {
      const winner =
        topLeaf && topLeaf.score >= MODERATE_NAME_SCORE
          ? topLeaf.leafId
          : (topGroup as { leafId: string }).leafId;
      if (isKnownBackboneId(winner)) {
        return {
          ...baseDecision,
          finalLeafId: winner,
          reason: 'cross-group-low-alias-overridden',
        };
      }
    }
    if (aliasIsLeaf && aliasGroupExists) {
      return {
        ...baseDecision,
        finalLeafId: aliasGroup,
        reason: 'cross-group-demote-to-alias-group',
      };
    }
  }

  // 5) Same-group leaf refinement: if alias picked a leaf and the product
  //    name fits a *different* leaf in the same group, switch — BUT never
  //    demote a specific sibling to a `/general` fallback. The fallback only
  //    exists to absorb assignments that have no better target; it must not
  //    win over a more-specific leaf the chain already picked.
  if (
    aliasIsLeaf &&
    topLeaf &&
    topLeaf.leafId !== aliasLeafId &&
    !topLeaf.leafId.endsWith('/general') &&
    groupOfId(topLeaf.leafId) === aliasGroup &&
    topLeaf.score >= MODERATE_NAME_SCORE &&
    isKnownBackboneId(topLeaf.leafId)
  ) {
    return {
      ...baseDecision,
      finalLeafId: topLeaf.leafId,
      reason: 'leaf-refined-same-group',
    };
  }

  return { ...baseDecision, finalLeafId: aliasLeafId, reason: 'kept-alias' };
}

/**
 * Aggregated counts of how often each refinement reason fired during a run —
 * useful for the CLI summary so we can spot regressions.
 */
export type RefineSummary = Record<RefineReason, number>;

export function emptyRefineSummary(): RefineSummary {
  return {
    'no-name': 0,
    'no-alias-no-name-signal': 0,
    'name-only-leaf': 0,
    'name-only-group': 0,
    agree: 0,
    'kept-alias': 0,
    'leaf-refined-same-group': 0,
    'cross-group-name-overrides': 0,
    'cross-group-low-alias-overridden': 0,
    'cross-group-demote-to-alias-group': 0,
    'strict-leaf-overridden-by-name': 0,
    'strict-leaf-demoted-to-other-group': 0,
    'strict-leaf-demoted-to-alias-group': 0,
    'strict-leaf-no-support': 0,
  };
}

/**
 * Re-evaluate every already-categorised `CanonicalProduct` against its own
 * Hebrew name. This is the backfill counterpart of `refineAssignment` —
 * useful after the synonyms / strict-leaf list change, or to clean up rows
 * that were tagged by a previous run that didn't have name-aware refinement.
 *
 * Reads only `CanonicalProduct` rows (no chain harvest needed) and writes
 * only when the refined value differs from the stored one.
 */
export type BackfillResult = {
  considered: number;
  updated: number;
  cleared: number;
  unchanged: number;
  reasonCounts: RefineSummary;
  samples: Array<{
    productName: string;
    before?: string;
    after?: string;
    reason: RefineReason;
  }>;
};

type BackfillRow = {
  id: string;
  displayName: string;
  displayNameHe: string | null;
  transparencyNameHe: string | null;
  brand: string | null;
  commonCategoryId: string | null;
};

type BackfillPrisma = {
  canonicalProduct: {
    findMany: (args: {
      where: {
        commonCategoryId: { not: null };
        id?: { gt: string };
      };
      select: {
        id: true;
        displayName: true;
        displayNameHe: true;
        transparencyNameHe: true;
        brand: true;
        commonCategoryId: true;
      };
      take?: number;
      orderBy?: { id: 'asc' };
    }) => Promise<BackfillRow[]>;
    update: (args: {
      where: { id: string };
      data: { commonCategoryId: string | null };
    }) => Promise<unknown>;
  };
};

export async function refineExistingCanonicalProducts(
  prisma: BackfillPrisma,
  options: {
    dryRun?: boolean;
    batchSize?: number;
    /**
     * Invoked after each batch with the running totals so a CLI can render
     * progress. The library deliberately doesn't print anything itself.
     */
    onBatch?: (state: {
      considered: number;
      updated: number;
      cleared: number;
      unchanged: number;
    }) => void;
  } = {},
): Promise<BackfillResult> {
  const batchSize = options.batchSize ?? 500;
  const dryRun = options.dryRun ?? false;
  const reasonCounts = emptyRefineSummary();
  const samples: BackfillResult['samples'] = [];
  let considered = 0;
  let updated = 0;
  let cleared = 0;
  let unchanged = 0;
  let cursor: string | undefined;
  while (true) {
    const rows: BackfillRow[] = await prisma.canonicalProduct.findMany({
      where: {
        commonCategoryId: { not: null },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: {
        id: true,
        displayName: true,
        displayNameHe: true,
        transparencyNameHe: true,
        brand: true,
        commonCategoryId: true,
      },
      take: batchSize,
      orderBy: { id: 'asc' },
    });
    if (rows.length === 0) break;
    const last = rows[rows.length - 1];
    cursor = last ? last.id : cursor;
    for (const row of rows) {
      considered += 1;
      const decision = refineAssignment({
        name: row.displayNameHe ?? row.displayName,
        extraNames: [row.transparencyNameHe, row.displayName],
        brand: row.brand ?? undefined,
        aliasLeafId: row.commonCategoryId ?? undefined,
        // We don't know the original alias confidence here. Treat existing
        // assignments as moderately confident so cross-group conflicts only
        // override on STRONG name signal, not on borderline matches.
        aliasConfidence: 0.5,
      });
      reasonCounts[decision.reason] += 1;
      const final = decision.finalLeafId ?? null;
      const before = row.commonCategoryId;
      if (before === final) {
        unchanged += 1;
        continue;
      }
      if (final === null) cleared += 1;
      else updated += 1;
      // Keep up to 4 samples per reason so the CLI summary surfaces a mix
      // (instead of saturating with the first reason encountered).
      const samplesPerReason = samples.filter((s) => s.reason === decision.reason).length;
      if (samplesPerReason < 4) {
        samples.push({
          productName: row.displayNameHe ?? row.displayName,
          before: before ?? undefined,
          after: final ?? undefined,
          reason: decision.reason,
        });
      }
      if (!dryRun) {
        await prisma.canonicalProduct.update({
          where: { id: row.id },
          data: { commonCategoryId: final },
        });
      }
    }
    options.onBatch?.({ considered, updated, cleared, unchanged });
    if (rows.length < batchSize) break;
  }
  return { considered, updated, cleared, unchanged, reasonCounts, samples };
}
