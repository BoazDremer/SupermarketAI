/**
 * Build / refresh Shufersal `ChainCategoryTree` with Hebrew names.
 *
 * Structure: product `allCategoryCodes` paths from the online search API.
 * Names: top-level constants, search facets, existing JSON, category-page titles.
 */

import { readFile } from 'node:fs/promises';
import { fetchShufersalSearchResults } from '../product-mapper/shufersal-online.js';
import {
  buildTree,
  codeDepth,
  collectAllCodes,
  countLeaves,
  defaultShufersalCacheDir,
  fetchCategoryPage,
  parseShufersalPage,
  readCache,
  shufersalCategoryPageUrl,
  TOP_LEVEL,
  writeCache,
} from '../scrapers/shufersal-categories.js';
import type { ChainCategoryNode, ChainCategoryTree } from '../scrapers/types.js';

const SHUFERSAL_BASE = 'https://www.shufersal.co.il';

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function log(msg: string): void {
  console.log(msg);
}

/** Serialize path leaf→root for deduping. */
function pathKey(parts: readonly string[]): string {
  return parts.join('\0');
}

function pathsFromTree(roots: readonly ChainCategoryNode[]): string[][] {
  const out: string[][] = [];
  function walk(node: ChainCategoryNode, ancestors: string[]): void {
    const chain = [...ancestors, node.id];
    if (node.children.length === 0) {
      out.push([...chain].reverse());
    } else {
      for (const c of node.children) walk(c, chain);
    }
  }
  for (const r of roots) walk(r, []);
  return out;
}

function namesFromTree(roots: readonly ChainCategoryNode[]): Map<string, string> {
  const out = new Map<string, string>();
  function walk(n: ChainCategoryNode): void {
    if (n.nameHe && n.nameHe !== n.id) out.set(n.id, n.nameHe);
    for (const c of n.children) walk(c);
  }
  for (const r of roots) walk(r);
  return out;
}

export type CollectPathsOptions = {
  pageSize?: number;
  maxPages?: number;
  delayMs?: number;
  fetchImpl?: typeof fetch;
};

/** Gather unique category paths from the full online catalog JSON API. */
export async function collectPathsFromOnlineCatalog(
  options: CollectPathsOptions = {},
): Promise<string[][]> {
  const pageSize = options.pageSize ?? 100;
  const delayMs = options.delayMs ?? 400;
  const fetchImpl = options.fetchImpl ?? fetch;

  const first = await fetchShufersalSearchResults({
    query: ':',
    page: 0,
    limit: pageSize,
    fetchImpl,
  });
  const totalPages = options.maxPages ?? first.pagination.numberOfPages;
  const pathSet = new Set<string>();
  let rawRows = 0;

  log(
    `[catalog] online assortment: ${first.pagination.totalNumberOfResults} products, ${totalPages} pages @ ${pageSize}/page`,
  );

  async function absorb(page: typeof first): Promise<void> {
    for (const row of page.results) {
      rawRows += 1;
      const codes = (row.allCategoryCodes ?? []).filter(
        (c) => c && c !== 'categories',
      );
      if (codes.length === 0) continue;
      const sorted = [...codes].sort(
        (a, b) => b.length - a.length || a.localeCompare(b),
      );
      pathSet.add(pathKey(sorted));
    }
  }

  await absorb(first);
  log(`[catalog] page 1/${totalPages} — ${pathSet.size} unique paths so far`);

  for (let page = 1; page < totalPages; page += 1) {
    if (delayMs > 0) await delay(delayMs);
    const res = await fetchShufersalSearchResults({
      query: ':',
      page,
      limit: pageSize,
      fetchImpl,
    });
    await absorb(res);
    if (page % 5 === 0 || page === totalPages - 1) {
      log(
        `[catalog] page ${page + 1}/${totalPages} — ${pathSet.size} unique paths (${rawRows} product rows scanned)`,
      );
    }
  }

  log(`[catalog] done — ${pathSet.size} unique paths from ${rawRows} products`);
  return [...pathSet].map((k) => k.split('\0'));
}

type SearchFacetValue = { code?: string; name?: string };

type SearchFacet = { code?: string; values?: SearchFacetValue[] };

/** Department-level Hebrew labels from search facets (`categories-2`). */
export async function loadFacetNames(
  fetchImpl: typeof fetch = fetch,
): Promise<Map<string, string>> {
  const res = await fetchShufersalSearchResults({
    query: ':',
    page: 0,
    limit: 1,
    fetchImpl,
  });
  const out = new Map<string, string>();
  const facets = res.facets as SearchFacet[] | undefined;
  const cat = facets?.find((f) => f.code === 'categories-2' || f.code?.includes('categories'));
  for (const v of cat?.values ?? []) {
    if (v.code && v.name?.trim()) out.set(v.code, v.name.trim());
  }
  log(`[names] search facets — ${out.size} department labels`);
  return out;
}

function titleFromPageHtml(html: string): string | undefined {
  const parsed = parseShufersalPage(html);
  if (parsed.titleHe && !/^not found/i.test(parsed.titleHe)) {
    return parsed.titleHe;
  }
  const pageName = html.match(/"pageName"\s*:\s*"([^"]+)"/)?.[1];
  if (pageName) {
    const segments = pageName.split('->').map((s) => s.trim());
    const last = segments[segments.length - 1];
    if (last && last.length > 0 && !/^not found/i.test(last)) return last;
  }
  return undefined;
}

export type ResolveNamesOptions = {
  codes: readonly string[];
  cacheDir?: string;
  cacheMaxAgeMs?: number;
  fetchTitles?: boolean;
  titleDelayMs?: number;
  maxFetchDepth?: number;
  /** Ignore on-disk HTML cache and re-fetch every category page. */
  refreshCache?: boolean;
  fetchImpl?: typeof fetch;
  /** Start with these names (not overwritten). */
  seed?: Map<string, string>;
};

/**
 * Fill Hebrew names for category codes using cache + optional HTTP category pages.
 */
export async function resolveCategoryNames(
  options: ResolveNamesOptions,
): Promise<Map<string, string>> {
  const cacheDir = options.cacheDir ?? (await defaultShufersalCacheDir());
  const cacheMaxAgeMs = options.cacheMaxAgeMs ?? 7 * 24 * 60 * 60 * 1000;
  const fetchTitles = options.fetchTitles ?? true;
  const titleDelayMs = options.titleDelayMs ?? 2_000;
  const maxFetchDepth = options.maxFetchDepth ?? 4;
  const refreshCache = options.refreshCache ?? false;
  const fetchImpl = options.fetchImpl ?? fetch;

  const known = new Map<string, string>(options.seed ?? []);
  for (const t of TOP_LEVEL) known.set(t.code, t.nameHe);

  const need = options.codes
    .filter((c) => {
      const n = known.get(c);
      return !n || n === c;
    })
    .sort((a, b) => codeDepth(a) - codeDepth(b) || a.localeCompare(b));

  log(
    `[names] resolving ${need.length} codes (fetchTitles=${fetchTitles}, maxFetchDepth=${maxFetchDepth})`,
  );

  let fromCache = 0;
  let fromNetwork = 0;
  let failed = 0;

  for (let i = 0; i < need.length; i += 1) {
    const code = need[i]!;
    if (known.has(code) && known.get(code) !== code) continue;

    if (!refreshCache) {
      const cached = await readCache(cacheDir, code, cacheMaxAgeMs);
      if (cached && cached.length > 0) {
        const title = titleFromPageHtml(cached);
        if (title) {
          known.set(code, title);
          fromCache += 1;
          if ((i + 1) % 25 === 0 || i === need.length - 1) {
            log(
              `[names] progress ${i + 1}/${need.length} — cache=${fromCache} net=${fromNetwork} fail=${failed}`,
            );
          }
          continue;
        }
      }
    }

    if (!fetchTitles || codeDepth(code) > maxFetchDepth) {
      failed += 1;
      continue;
    }

    if (titleDelayMs > 0) await delay(titleDelayMs);
    const r = await fetchCategoryPage(fetchImpl, code);
    await writeCache(cacheDir, code, r.ok ? r.html : '');
    if (r.ok && r.html.length > 0 && titleFromPageHtml(r.html)) {
      const title = titleFromPageHtml(r.html);
      if (title) {
        known.set(code, title);
        fromNetwork += 1;
        log(
          `[names] ${code} (d=${codeDepth(code)}) ← ${title} [${r.url ?? shufersalCategoryPageUrl(code)}]`,
        );
      } else {
        failed += 1;
        log(`[names] ${code} (d=${codeDepth(code)}) — page OK, no title parsed`);
      }
    } else {
      failed += 1;
      if (failed <= 20 || failed % 50 === 0) {
        log(`[names] ${code} (d=${codeDepth(code)}) — HTTP ${r.status}, no title`);
      }
    }

    if ((i + 1) % 10 === 0) {
      log(
        `[names] progress ${i + 1}/${need.length} — cache=${fromCache} net=${fromNetwork} fail=${failed}`,
      );
    }
  }

  log(
    `[names] finished — ${known.size} total names, +${fromCache} from cache, +${fromNetwork} from network, ${failed} still unresolved (depth>${maxFetchDepth} or 404)`,
  );
  return known;
}

export type BuildShufersalTreeOptions = {
  rebuildPaths?: boolean;
  existingTreePath?: string;
  outputPath?: string;
  pageSize?: number;
  maxPages?: number;
  onlineDelayMs?: number;
  fetchTitles?: boolean;
  titleDelayMs?: number;
  maxFetchDepth?: number;
  refreshCache?: boolean;
  cacheDir?: string;
  fetchImpl?: typeof fetch;
};

export async function buildShufersalCategoryTree(
  options: BuildShufersalTreeOptions = {},
): Promise<ChainCategoryTree> {
  const rebuildPaths = options.rebuildPaths ?? true;
  const fetchImpl = options.fetchImpl ?? fetch;
  const cacheDir = options.cacheDir ?? (await defaultShufersalCacheDir());

  let paths: string[][] = [];
  const seed = new Map<string, string>();

  if (options.existingTreePath) {
    try {
      const text = await readFile(options.existingTreePath, 'utf8');
      const existing = JSON.parse(text) as ChainCategoryTree;
      for (const [k, v] of namesFromTree(existing.roots)) seed.set(k, v);
      if (!rebuildPaths) {
        paths = pathsFromTree(existing.roots);
        log(`[tree] loaded ${paths.length} paths from ${options.existingTreePath}`);
      }
    } catch {
      log(`[tree] no existing tree at ${options.existingTreePath}`);
    }
  }

  if (rebuildPaths) {
    paths = await collectPathsFromOnlineCatalog({
      pageSize: options.pageSize,
      maxPages: options.maxPages,
      delayMs: options.onlineDelayMs,
      fetchImpl,
    });
  }

  const facets = await loadFacetNames(fetchImpl);
  for (const [k, v] of facets) seed.set(k, v);

  const allCodes = new Set<string>();
  for (const p of paths) {
    for (const c of p) allCodes.add(c);
  }

  const knownNames = await resolveCategoryNames({
    codes: [...allCodes],
    cacheDir,
    fetchTitles: options.fetchTitles,
    titleDelayMs: options.titleDelayMs,
    maxFetchDepth: options.maxFetchDepth ?? 4,
    refreshCache: options.refreshCache,
    seed,
    fetchImpl,
  });

  const roots = buildTree(knownNames, paths);
  const all = collectAllCodes(roots);
  const unresolved = all.filter((c) => {
    const n = knownNames.get(c);
    return !n || n === c;
  });

  log(
    `[tree] ${all.length} nodes, ${all.length - unresolved.length} with Hebrew names, ${unresolved.length} still use raw codes`,
  );
  if (unresolved.length > 0) {
    log(
      `[tree] unresolved sample: ${unresolved.slice(0, 12).join(', ')}${unresolved.length > 12 ? '…' : ''}`,
    );
    log(
      '[tree] note: unresolved codes may lack a public page or need --refresh-cache after URL pattern changes.',
    );
  }

  return {
    retailerSlug: 'shufersal',
    retailerNameHe: 'שופרסל',
    scrapedAt: new Date().toISOString(),
    source: `${SHUFERSAL_BASE}/online/he/search/results + ${SHUFERSAL_BASE}/online/he/c/{categoryCode}`,
    roots,
    leafCount: countLeaves(roots),
  };
}
