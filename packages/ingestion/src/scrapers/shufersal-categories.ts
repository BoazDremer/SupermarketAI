/**
 * Shufersal category scraper.
 *
 * Shufersal does not expose a JSON catalog tree. We rely on three traits of
 * its public HTML pages:
 *
 *   - Top-level departments (depth 0): `/online/he/{code}` (e.g. `A`, `G`).
 *   - All descendants (depth ≥ 1), including direct children like `A16`:
 *     `/online/he/c/{code}` — some no longer respond on `/online/he/{code}`.
 *   - Each product card on those pages carries `data-all-categories` with
 *     the FULL ancestor chain, e.g. "[G020402, G0204, G02, G]". One page
 *     thus reveals dozens of leaf->root paths.
 *   - The page `<title>` contains the Hebrew name of that category.
 *
 * BFS strategy:
 *   1. Start with the 5 hard-coded top-level codes (S/A/F/B/G).
 *   2. Fetch each category page (cached on disk), harvest all paths from
 *      `data-all-categories`, accumulate into a tree.
 *   3. For every non-root code we have not visited yet, queue a fetch to
 *      learn its Hebrew name (via the `<title>`).
 *
 * Important: Shufersal's robots.txt mandates Crawl-delay: 10 seconds. The
 * default `delayMs` is 10000; pass a smaller value at your own discretion
 * for dev iteration.
 */

import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createProgress, type ProgressReporter } from '../progress.js';
import type { ChainCategoryNode, ChainCategoryTree } from './types.js';

export async function defaultShufersalCacheDir(): Promise<string> {
  // Walk up to the repo root (marker = pnpm-workspace.yaml) so the cache
  // ends up in <repo>/data/processed/categories/.cache regardless of cwd.
  let dir = path.resolve(process.cwd());
  while (true) {
    try {
      await stat(path.join(dir, 'pnpm-workspace.yaml'));
      return path.join(dir, 'data/processed/categories/.cache/shufersal');
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) {
        return path.resolve(process.cwd(), 'data/processed/categories/.cache/shufersal');
      }
      dir = parent;
    }
  }
}

const SHUFERSAL_BASE = 'https://www.shufersal.co.il';
const TOP_LEVEL: ReadonlyArray<{ code: string; nameHe: string }> = [
  { code: 'S', nameHe: 'מבצעים' },
  { code: 'A', nameHe: 'סופרמרקט' },
  { code: 'F', nameHe: 'green בריאות וטבע' },
  { code: 'B', nameHe: 'פארם וקוסמטיקה' },
  { code: 'G', nameHe: 'הקניון-הכל לבית' },
];

export type ShufersalScrapeOptions = {
  /** Where to cache fetched HTML pages. Default: `<repo>/data/processed/categories/.cache/shufersal`. */
  cacheDir?: string;
  /** Delay between HTTP requests in ms (default 10000 to respect robots.txt). */
  delayMs?: number;
  /** Max age of cached HTML before re-fetch, in ms. Default 7 days. */
  cacheMaxAgeMs?: number;
  /** Hard cap on total HTTP requests this run. Default 900. */
  maxRequests?: number;
  /**
   * Do not enqueue or HTTP-fetch category codes deeper than this.
   * Shufersal only embeds product cards on depth 0–1 pages; deeper URLs
   * typically 404 or return an empty body (see negative cache files).
   * Default 1 for product enrichment; category-tree scrapes may use 4+.
   */
  maxDepth?: number;
  /** When true, do NOT make any HTTP calls; only re-parse already-cached HTML. */
  cacheOnly?: boolean;
  /** When true, ignore on-disk HTML cache and re-fetch every category page. */
  refreshCache?: boolean;
  /** Optional fetch impl override (testing). */
  fetchImpl?: typeof fetch;
  /**
   * If true, print live progress (visited / queued / network requests, ETA)
   * to stderr while the BFS is running. Default `true`.
   */
  showProgress?: boolean;
};

/** Shufersal codes are hierarchical — 1 char top, +2 chars per level. */
export function codeDepth(code: string): number {
  return Math.max(0, Math.ceil((code.length - 1) / 2));
}

/**
 * Candidate category page URLs, best-first.
 * Depth 0: `/online/he/{code}` only.
 * Depth ≥ 1: `/online/he/c/{code}` first, then legacy `/online/he/{code}` for
 * departments that still respond on the old path (e.g. some `A04`-style codes).
 */
export function shufersalCategoryPageUrls(code: string): string[] {
  const encoded = encodeURIComponent(code);
  if (codeDepth(code) === 0) {
    return [`${SHUFERSAL_BASE}/online/he/${encoded}`];
  }
  return [
    `${SHUFERSAL_BASE}/online/he/c/${encoded}`,
    `${SHUFERSAL_BASE}/online/he/${encoded}`,
  ];
}

/** Canonical URL stored on tree nodes (first candidate). */
export function shufersalCategoryPageUrl(code: string): string {
  return shufersalCategoryPageUrls(code)[0]!;
}

type ShufersalParsedPage = {
  titleHe?: string;
  /** Each path is from leaf -> root, e.g. ['G020402','G0204','G02','G']. */
  paths: string[][];
};

const HE_DOMAIN_NAME = 'Shufersal';
const HE_DOMAIN_NAME_HE = 'שופרסל';
/**
 * Phrases that only appear on Shufersal's storefront homepage (served for
 * invalid category codes). After stripping branding, a real category title
 * should never contain "אונליין" or "משלוחים מהסופר".
 */
const HOMEPAGE_TITLE_HINTS: ReadonlyArray<string> = [
  'משלוחים מהסופר',
  'סופרמרקט שופרסל אונליין',
];
const TITLE_RE = /<title>\s*([\s\S]*?)\s*<\/title>/i;
const PATH_RE = /data-all-categories="\[([^\]]+)\]"/g;

/** Decodes simple HTML entities found in Shufersal titles (numeric Hebrew etc.). */
function decodeHtmlEntities(text: string): string {
  return text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

/**
 * Pull the category Hebrew name out of a Shufersal page title.
 *
 * Real-world title shapes seen in cached pages:
 *   - "<cat> | Shufersal"
 *   - "<cat> - shufersal online | Shufersal"
 *   - "<top> | <leaf description> - shufersal online | Shufersal"
 *   - "shufersal - שופרסל אונליין | <breadcrumb> | <leaf> | Shufersal"
 * We strip leading and trailing brand segments, then return the most-specific
 * remaining segment (last one for "shufersal -" prefix, first one otherwise).
 */
function extractTitleHe(rawDecoded: string): string | undefined {
  let raw = rawDecoded.replace(/\s+/g, ' ').trim();
  if (!raw) return undefined;

  // Strip trailing "| Shufersal", "| Shufersal online" etc.
  raw = raw.replace(/\s*[|\-]\s*shufersal(?:\s+online)?\s*$/i, '').trim();
  raw = raw.replace(/\s*[|\-]\s*שופרסל(?:\s+אונליין)?\s*$/u, '').trim();

  // Drop a leading "shufersal - שופרסל אונליין |" prefix (the leaf branding).
  const hasBrandPrefix = /^shufersal\s*[-|]\s*שופרסל(?:\s+אונליין)?\s*[|\-]/iu.test(raw);
  raw = raw.replace(/^shufersal\s*[-|]\s*שופרסל(?:\s+אונליין)?\s*[|\-]\s*/iu, '').trim();

  // Strip "- shufersal online" or "- שופרסל אונליין" appearing anywhere (they
  // decorate the cleanest segment with the site name).
  raw = raw
    .replace(/\s*-\s*shufersal\s+online\b/gi, '')
    .replace(/\s*-\s*שופרסל\s+אונליין\b/gu, '')
    .trim();

  if (!raw) return undefined;

  const segments = raw
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^shufersal$/i.test(s) && s !== HE_DOMAIN_NAME_HE);
  if (segments.length === 0) return undefined;

  // For brand-prefixed titles (G13/G15 shape) the leaf is the last segment.
  // For "<category> | <description>" titles the first segment is the cleanest.
  const candidate = hasBrandPrefix ? segments[segments.length - 1]! : segments[0]!;

  if (candidate === HE_DOMAIN_NAME || candidate === HE_DOMAIN_NAME_HE) return undefined;
  // After stripping branding, real category pages should not contain these
  // homepage-only phrases. If they do, this was the storefront homepage being
  // served (e.g. for invalid category codes).
  if (HOMEPAGE_TITLE_HINTS.some((h) => candidate.includes(h))) return undefined;
  return candidate;
}

function parseShufersalPage(html: string): ShufersalParsedPage {
  const titleMatch = TITLE_RE.exec(html);
  let titleHe: string | undefined;
  if (titleMatch) {
    titleHe = extractTitleHe(decodeHtmlEntities(titleMatch[1] ?? ''));
  }

  const paths: string[][] = [];
  PATH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PATH_RE.exec(html)) !== null) {
    const parts = (m[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) paths.push(parts);
  }
  return { titleHe, paths };
}

function categoryPageLooksUsable(html: string, code: string): boolean {
  if (!html || html.length < 200) return false;
  const parsed = parseShufersalPage(html);
  if (parsed.titleHe && parsed.titleHe !== code) return true;
  if (parsed.paths.length > 0) return true;
  return PATH_RE.test(html);
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

async function readCache(cacheDir: string, code: string, maxAgeMs: number): Promise<string | undefined> {
  const file = path.join(cacheDir, `${code}.html`);
  try {
    const s = await stat(file);
    if (Date.now() - s.mtimeMs > maxAgeMs) return undefined;
    return await readFile(file, 'utf8');
  } catch {
    return undefined;
  }
}

async function writeCache(cacheDir: string, code: string, html: string): Promise<void> {
  const file = path.join(cacheDir, `${code}.html`);
  await writeFile(file, html, 'utf8');
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type ShufersalCategoryFetchResult = {
  ok: boolean;
  status: number;
  html: string;
  /** URL that returned usable HTML, if any. */
  url?: string;
};

async function fetchCategoryPage(
  fetchImpl: typeof fetch,
  code: string,
): Promise<ShufersalCategoryFetchResult> {
  const headers = {
    Accept: 'text/html,application/xhtml+xml',
    'User-Agent':
      'Mozilla/5.0 (compatible; SupermarketAI-Categories/1.0; +https://github.com/)',
  };
  let lastStatus = 0;
  let lastHtml = '';
  for (const url of shufersalCategoryPageUrls(code)) {
    const res = await fetchImpl(url, { headers, redirect: 'follow' });
    const html = await res.text();
    lastStatus = res.status;
    lastHtml = html;
    if (res.ok && categoryPageLooksUsable(html, code)) {
      return { ok: true, status: res.status, html, url };
    }
  }
  return { ok: false, status: lastStatus, html: lastHtml };
}

/** Builds a tree from the union of paths discovered across all visited pages. */
function buildTree(
  knownNames: Map<string, string>,
  paths: string[][],
): ChainCategoryNode[] {
  // Each path is leaf -> root; reverse to root -> leaf for tree assembly.
  type Tmp = { node: ChainCategoryNode; childByCode: Map<string, Tmp> };
  const roots = new Map<string, Tmp>();
  function ensureNode(parent: Map<string, Tmp>, code: string, depth: number): Tmp {
    let cur = parent.get(code);
    if (!cur) {
      cur = {
        node: {
          id: code,
          nameHe: knownNames.get(code) ?? code,
          url: shufersalCategoryPageUrl(code),
          depth,
          children: [],
        },
        childByCode: new Map(),
      };
      parent.set(code, cur);
    }
    return cur;
  }
  for (const path of paths) {
    const fromRoot = [...path].reverse();
    let parent = roots;
    fromRoot.forEach((code, depth) => {
      const tmp = ensureNode(parent, code, depth);
      parent = tmp.childByCode;
    });
  }
  function flush(map: Map<string, Tmp>): ChainCategoryNode[] {
    return [...map.values()].map((t) => {
      t.node.children = flush(t.childByCode);
      return t.node;
    });
  }
  return flush(roots);
}

/** Recursively walk a node tree and yield all unique codes. */
function collectAllCodes(roots: ChainCategoryNode[]): string[] {
  const out: string[] = [];
  function walk(n: ChainCategoryNode): void {
    out.push(n.id);
    for (const c of n.children) walk(c);
  }
  for (const r of roots) walk(r);
  return out;
}

/** Count leaves (nodes with no children). */
function countLeaves(roots: ChainCategoryNode[]): number {
  let n = 0;
  function walk(node: ChainCategoryNode): void {
    if (node.children.length === 0) {
      n += 1;
      return;
    }
    for (const c of node.children) walk(c);
  }
  for (const r of roots) walk(r);
  return n;
}

export async function scrapeShufersalCategories(
  options: ShufersalScrapeOptions = {},
): Promise<ChainCategoryTree> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const delayMs = options.delayMs ?? 10_000;
  const maxRequests = options.maxRequests ?? 900;
  const maxDepth = options.maxDepth ?? 1;
  const cacheOnly = options.cacheOnly ?? false;
  const refreshCache = options.refreshCache ?? false;
  const cacheMaxAgeMs = options.cacheMaxAgeMs ?? 7 * 24 * 60 * 60 * 1000;
  const cacheDir =
    options.cacheDir ??
    (await defaultShufersalCacheDir());
  await ensureDir(cacheDir);
  const showProgress = options.showProgress ?? true;

  const knownNames = new Map<string, string>();
  for (const t of TOP_LEVEL) knownNames.set(t.code, t.nameHe);

  const allPaths: string[][] = [];
  const visited = new Set<string>();
  let cacheHits = 0;
  // Depth-priority queue: shallow nodes first, so a small request budget
  // covers the tops of all departments rather than drilling into one.
  const queued = new Set<string>(TOP_LEVEL.map((t) => t.code));
  const queue: string[] = TOP_LEVEL.map((t) => t.code);
  function takeNext(): string | undefined {
    if (queue.length === 0) return undefined;
    let bestIdx = 0;
    let bestDepth = codeDepth(queue[0]!);
    for (let i = 1; i < queue.length; i += 1) {
      const d = codeDepth(queue[i]!);
      if (d < bestDepth) {
        bestDepth = d;
        bestIdx = i;
      }
    }
    const [picked] = queue.splice(bestIdx, 1);
    return picked;
  }
  let requests = 0;

  // Progress is bounded by `maxRequests` because each network call has a
  // `Crawl-delay` (~10s) attached — that's what drives the ETA. Cache-only
  // iterations are tracked separately so the user can see the cache helping.
  const progress: ProgressReporter | undefined = showProgress
    ? createProgress({
        label: 'shufersal-bfs',
        total: maxRequests,
        intervalMs: 5_000,
        extra: () => ({
          visited: visited.size,
          queued: queue.length,
          'cache-hits': cacheHits,
        }),
      })
    : undefined;

  while (queue.length > 0 && requests < maxRequests) {
    const code = takeNext();
    if (!code) break;
    if (visited.has(code)) continue;
    visited.add(code);

    let html = refreshCache
      ? undefined
      : await readCache(cacheDir, code, cacheMaxAgeMs);
    if (html !== undefined && !categoryPageLooksUsable(html, code)) {
      html = undefined;
    }
    if (html === undefined) {
      if (cacheOnly) continue; // skip un-cached entries entirely
      requests += 1;
      progress?.tick();
      const r = await fetchCategoryPage(fetchImpl, code);
      if (!r.ok) {
        // 404 / 5xx — record an empty cache so we don't retry this run.
        await writeCache(cacheDir, code, '');
        if (delayMs > 0) await delay(delayMs);
        continue;
      }
      html = r.html;
      await writeCache(cacheDir, code, html);
      if (delayMs > 0) await delay(delayMs);
    } else {
      cacheHits += 1;
    }
    if (html.length === 0) continue; // negative cache
    const parsed = parseShufersalPage(html);
    if (parsed.titleHe) knownNames.set(code, parsed.titleHe);
    for (const p of parsed.paths) {
      allPaths.push(p);
      // Enqueue every ancestor code on the path that we have not visited yet,
      // bounded by maxDepth so we never go past the matcher's useful range.
      for (const c of p) {
        if (codeDepth(c) > maxDepth) continue;
        if (visited.has(c) || queued.has(c)) continue;
        queue.push(c);
        queued.add(c);
      }
    }
  }
  progress?.finish(
    `finished — ${requests} network requests, ${cacheHits} cache hits, ${visited.size} codes visited`,
  );

  const roots = buildTree(knownNames, allPaths);

  // Sort: we want the user-visible department order to match TOP_LEVEL.
  const order = new Map(TOP_LEVEL.map((t, i) => [t.code, i]));
  roots.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));

  // For codes that were referenced as ancestors but never visited (e.g. we
  // hit the request cap), the tree still includes them but with id-as-name.
  // The matcher will skip those entries; the unmapped report will list them.
  const unresolved = collectAllCodes(roots).filter((c) => !knownNames.has(c));
  if (unresolved.length > 0) {
    const deeper = unresolved.filter((c) => codeDepth(c) > maxDepth);
    process.stderr.write(
      `[shufersal] ${unresolved.length} codes lack Hebrew names` +
        (deeper.length > 0
          ? ` (${deeper.length} deeper than maxDepth=${maxDepth}, not fetched)`
          : '') +
        `: ${unresolved.slice(0, 8).join(', ')}${unresolved.length > 8 ? '…' : ''}\n`,
    );
  }

  return {
    retailerSlug: 'shufersal',
    retailerNameHe: 'שופרסל',
    scrapedAt: new Date().toISOString(),
    source: `${SHUFERSAL_BASE}/online/he/{categoryCode} and /online/he/c/{categoryCode}`,
    roots,
    leafCount: countLeaves(roots),
    runStats: {
      networkRequests: requests,
      cacheHits,
      codesVisited: visited.size,
    },
  };
}

// Re-export for category-tree refresh / tests.
export const __test__ = { parseShufersalPage, buildTree };
export {
  buildTree,
  parseShufersalPage,
  fetchCategoryPage,
  TOP_LEVEL,
  readCache,
  writeCache,
  collectAllCodes,
  countLeaves,
};
