/**
 * Hebrew-aware string normalization and synonym match scoring.
 *
 * The matcher is intentionally simple: for each backbone leaf we have a list
 * of Hebrew/English keyword synonyms. We "score" a chain category name by
 * counting how many synonyms occur as substrings of the normalized name and
 * how specific the longest hit is, with a small bonus when the synonym is at
 * a word boundary in the chain name (full-word match > prefix-match).
 *
 * Why not Jaccard / cosine over tokens? Hebrew has rich morphology
 * ("גבינה" vs "גבינות" vs "גבינת") and supermarket category names are very
 * short (1-3 tokens). Substring scanning of curated 3-letter Hebrew prefixes
 * gives better recall than tokenized similarity in this domain.
 */

import { GROUP_SYNONYMS, LEAF_SYNONYMS, STOP_WORDS } from './synonyms.js';

/** Strip niqqud, normalize Hebrew final-form letters, lower-case English, collapse whitespace. */
export function normalizeHe(input: string): string {
  let s = input.toLowerCase();
  // Remove combining marks (niqqud, dagesh, etc.).
  s = s.normalize('NFKD').replace(/[\u0591-\u05C7]/g, '');
  // Map final-form Hebrew letters to their non-final form so "פסח" matches "פסחים" etc.
  const finals: Record<string, string> = {
    ך: 'כ',
    ם: 'מ',
    ן: 'נ',
    ף: 'פ',
    ץ: 'צ',
  };
  s = s.replace(/[ךםןףץ]/g, (c) => finals[c] ?? c);
  // Replace punctuation with spaces.
  s = s.replace(/[.,;:!?"'()\\\/\u201C\u201D\u2018\u2019\u05F3\u05F4\-_]+/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function stripStopWords(s: string): string {
  let out = ` ${s} `;
  for (const w of STOP_WORDS) {
    const norm = normalizeHe(w);
    if (!norm) continue;
    out = out.replaceAll(` ${norm} `, ' ');
  }
  return out.trim();
}

/**
 * Score = (sum of synonym lengths that match) * boundary_bonus / chainNameLength
 * Boundary bonus: 1.0 if any matched synonym lands on a word boundary, else 0.6.
 *
 * Returns an object with the score, the matched synonyms, and the longest
 * matched synonym (used for explanation/auditing).
 */
export type LeafScore = {
  leafId: string;
  score: number;
  matchedSynonyms: string[];
  longestMatch?: string;
};

function scoreAgainst(
  haystack: string,
  synonymsByCategory: Readonly<Record<string, readonly string[]>>,
): LeafScore[] {
  if (!haystack) return [];
  const out: LeafScore[] = [];
  for (const [categoryId, syns] of Object.entries(synonymsByCategory)) {
    let totalHitLen = 0;
    let longest = 0;
    let longestStr: string | undefined;
    let boundaryBonus = 0.6;
    const matched: string[] = [];
    for (const synRaw of syns) {
      const syn = normalizeHe(synRaw);
      if (!syn) continue;
      const idx = haystack.indexOf(syn);
      if (idx === -1) continue;
      matched.push(synRaw);
      totalHitLen += syn.length;
      if (syn.length > longest) {
        longest = syn.length;
        longestStr = synRaw;
      }
      const before = idx === 0 ? ' ' : haystack[idx - 1] ?? ' ';
      const after =
        idx + syn.length >= haystack.length ? ' ' : haystack[idx + syn.length] ?? ' ';
      if (before === ' ' && (after === ' ' || /[ \-_]/.test(after))) {
        boundaryBonus = 1.0;
      }
    }
    if (totalHitLen === 0) continue;
    const score = (totalHitLen * boundaryBonus) / Math.max(haystack.length, 6);
    out.push({ leafId: categoryId, score, matchedSynonyms: matched, longestMatch: longestStr });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

export function scoreLeavesForChainName(chainName: string): LeafScore[] {
  const haystack = stripStopWords(normalizeHe(chainName));
  return scoreAgainst(haystack, LEAF_SYNONYMS);
}

export function scoreGroupsForChainName(chainName: string): LeafScore[] {
  const haystack = stripStopWords(normalizeHe(chainName));
  return scoreAgainst(haystack, GROUP_SYNONYMS);
}

/**
 * Resolve the best backbone target (leaf preferred, group as fallback) for a
 * chain category name. `parentChainName` (the chain's parent department) is
 * folded in to disambiguate generic leaf names ("טריות" → produce/vegetables
 * when the parent is "ירקות").
 *
 * Returns the best match plus the top-3 leaf candidates for audit, even when
 * the best match is a group.
 */
export function bestLeafFor(
  chainName: string,
  parentChainName?: string,
): {
  best?: { leafId: string; score: number; matchedSynonym?: string };
  top3: Array<{ leafId: string; score: number }>;
} {
  const haystacks = parentChainName ? [`${parentChainName} ${chainName}`, chainName] : [chainName];

  const mergedLeaves = new Map<string, LeafScore>();
  const mergedGroups = new Map<string, LeafScore>();
  for (const h of haystacks) {
    for (const ls of scoreLeavesForChainName(h)) {
      const prev = mergedLeaves.get(ls.leafId);
      if (!prev || ls.score > prev.score) mergedLeaves.set(ls.leafId, ls);
    }
    for (const ls of scoreGroupsForChainName(h)) {
      const prev = mergedGroups.get(ls.leafId);
      if (!prev || ls.score > prev.score) mergedGroups.set(ls.leafId, ls);
    }
  }
  const rankedLeaves = [...mergedLeaves.values()].sort((a, b) => b.score - a.score);
  const rankedGroups = [...mergedGroups.values()].sort((a, b) => b.score - a.score);

  const top3 = rankedLeaves
    .slice(0, 3)
    .map((r) => ({ leafId: r.leafId, score: Number(r.score.toFixed(3)) }));

  // Prefer a leaf match if it's confident enough (≥0.18), otherwise fall
  // back to the strongest group match (≥0.22 to compensate for the broader
  // group synonym set).
  const leafBest = rankedLeaves[0];
  if (leafBest && leafBest.score >= 0.18) {
    return {
      best: {
        leafId: leafBest.leafId,
        score: Number(leafBest.score.toFixed(3)),
        matchedSynonym: leafBest.longestMatch,
      },
      top3,
    };
  }
  const groupBest = rankedGroups[0];
  if (groupBest && groupBest.score >= 0.22) {
    return {
      best: {
        leafId: groupBest.leafId,
        score: Number(groupBest.score.toFixed(3)),
        matchedSynonym: groupBest.longestMatch,
      },
      top3,
    };
  }
  return { top3 };
}
