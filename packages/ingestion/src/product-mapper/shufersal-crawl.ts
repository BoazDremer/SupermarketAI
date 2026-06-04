/**
 * Shufersal product crawl wrapper.
 *
 * Why this exists:
 *   - The base scraper at `shufersal-categories.ts` already fetches Shufersal
 *     category pages (via BFS over the hierarchical `A/B/F/G/S` codes) and
 *     caches their HTML. Each cached page lists its products statically —
 *     there is no AJAX pagination (the page declares
 *     `window.miglog.loadMoreProductsButton = false`).
 *   - The harvester at `product-mapper/shufersal.ts` already turns those
 *     cached pages into cards with full names + chain category codes.
 *
 * This wrapper just stitches the two together with knobs that make sense for
 * a full product map run: high request budget, deep BFS, robots-friendly
 * pacing, and a `cacheOnly` shortcut for fast iteration.
 */

import {
  scrapeShufersalCategories,
  defaultShufersalCacheDir,
} from '../scrapers/shufersal-categories.js';
import type { CategoryScrapeRunStats } from '../scrapers/types.js';
import {
  harvestShufersalCachedCards,
  type ShufersalHarvestResult,
} from './shufersal.js';

export type ShufersalCrawlOptions = {
  /** When true, do NOT fetch anything — just re-harvest from existing cache. */
  cacheOnly?: boolean;
  /** When true, re-fetch all category HTML even if a cache file exists. */
  refreshCache?: boolean;
  /**
   * Hard cap on HTTP requests. Default 1500 — enough to cover Shufersal's
   * full known tree (~600 reachable codes + retries) without runaway crawls.
   */
  maxRequests?: number;
  /**
   * BFS depth cap (1 = top-level, 2 = group, 3 = sub-group …). Default 6 to
   * exhaust everything Shufersal reveals via `data-all-categories`.
   */
  /** Max category code depth to HTTP-fetch (default 1 — only dept + group pages). */
  maxDepth?: number;
  /**
   * Delay between HTTP requests, ms. Default 10000 to honour the
   * `Crawl-delay: 10` directive in Shufersal's robots.txt.
   */
  delayMs?: number;
  /** Optional explicit cache dir (otherwise `<repo>/data/.../shufersal`). */
  cacheDir?: string;
  /** Optional fetch impl override (testing). */
  fetchImpl?: typeof fetch;
  /** Optional progress logger (default writes to stderr). */
  log?: (msg: string) => void;
};

export type ShufersalCrawlResult = ShufersalHarvestResult & {
  cacheDir: string;
  /** True when no network requests were made. */
  cacheOnly: boolean;
  /** BFS crawl stats when `--crawl` ran (undefined for `--no-crawl`). */
  crawlStats?: CategoryScrapeRunStats;
};

/**
 * Either crawl Shufersal (respecting robots.txt) or rebuild from cache, then
 * return harvested product cards (with full names + chain category codes).
 */
export async function crawlShufersalForProducts(
  options: ShufersalCrawlOptions = {},
): Promise<ShufersalCrawlResult> {
  const cacheOnly = options.cacheOnly ?? false;
  const log = options.log ?? ((m) => process.stderr.write(`${m}\n`));
  const cacheDir = options.cacheDir ?? (await defaultShufersalCacheDir());

  let crawlStats: CategoryScrapeRunStats | undefined;
  if (!cacheOnly) {
    const refresh = options.refreshCache ?? false;
    log(
      `[shufersal-crawl] crawling tree: maxRequests=${options.maxRequests ?? 1500}, maxDepth=${options.maxDepth ?? 6}, delayMs=${options.delayMs ?? 10_000}${refresh ? ', refreshCache=true' : ''}`,
    );
    const tree = await scrapeShufersalCategories({
      cacheDir,
      cacheOnly: false,
      refreshCache: options.refreshCache ?? false,
      maxRequests: options.maxRequests ?? 1500,
      maxDepth: options.maxDepth ?? 1,
      delayMs: options.delayMs ?? 10_000,
      fetchImpl: options.fetchImpl,
    });
    crawlStats = tree.runStats;
  } else {
    log(`[shufersal-crawl] cacheOnly mode: re-harvesting ${cacheDir}`);
  }

  const harvest = await harvestShufersalCachedCards(cacheDir);
  log(
    `[shufersal-crawl] harvested ${harvest.cards.length} unique products from ${harvest.filesScanned} cached pages (${harvest.cardOccurrences} card occurrences)`,
  );
  return { ...harvest, cacheDir, cacheOnly, crawlStats };
}
