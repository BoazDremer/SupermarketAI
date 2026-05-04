/**
 * Rami Levy category scraper.
 *
 * Strategy (revised after API probing):
 *   1. `GET /api/menu` returns a 3-level Elasticsearch aggregation skeleton:
 *      department -> group -> subgroup, each with numeric ids and product
 *      counts. Names are NOT included in this response.
 *   2. `POST /api/catalog` accepts `{"d":[deptId]}` to filter products by
 *      department and `{"d":[deptId],"g":[groupId]}` to filter by a
 *      department+group pair. The product objects in those responses
 *      include `department: { id, name, slug }` and `group: { id, name }`
 *      blocks — that's where we get the Hebrew names.
 *   3. We do NOT have a public source of subgroup names from the API
 *      (subgroup blocks come back null in product responses), so we emit a
 *      2-level tree (department -> group) and ignore the subgroup tier.
 *
 * Total HTTP budget: 1 + N_departments calls. With ~25 depts + 200ms delay
 * the whole scrape completes in ~5-10 seconds.
 */

import type { ChainCategoryNode, ChainCategoryTree } from './types.js';

const RAMI_LEVY_BASE = 'https://www.rami-levy.co.il';
const MENU_URL = `${RAMI_LEVY_BASE}/api/menu`;
const CATALOG_URL = `${RAMI_LEVY_BASE}/api/catalog`;

type ElasticBucket = {
  key: number;
  doc_count: number;
  group?: { buckets: Array<{ key: number; doc_count: number }> };
};

type MenuResponse = {
  hits?: { total?: { value?: number } };
  aggregations?: { department?: { buckets?: ElasticBucket[] } };
};

type CatalogProduct = {
  department?: { id?: number; name?: string; slug?: string; sort?: number };
  group?: { id?: number; name?: string; slug?: string; sort?: number };
};

type CatalogResponse = { status?: number; total?: number; data?: CatalogProduct[] };

type NameSlug = { name: string; slug?: string };

export type RamiLevyScrapeOptions = {
  /** Sleep between catalog requests in ms (default 250). */
  delayMs?: number;
  /** Optional fetch impl override (for testing). */
  fetchImpl?: typeof fetch;
  /** When set, only scrape this many departments (debug). */
  maxDepartments?: number;
  /**
   * Legacy field, retained for backwards-compatible CLI args; no longer
   * influences scraping (we issue one query per department, not paginated
   * generic queries).
   */
  maxPages?: number;
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchMenuSkeleton(fetchImpl: typeof fetch): Promise<{
  total: number;
  departments: Array<{
    id: number;
    productCount: number;
    groups: Array<{ id: number; productCount: number }>;
  }>;
}> {
  const res = await fetchImpl(MENU_URL, {
    headers: { Accept: 'application/json', 'User-Agent': 'SupermarketAI-Categories/1.0' },
  });
  if (!res.ok) throw new Error(`Rami Levy /api/menu failed: HTTP ${res.status}`);
  const json = (await res.json()) as MenuResponse;
  const buckets = json.aggregations?.department?.buckets ?? [];
  const departments = buckets.map((d) => ({
    id: d.key,
    productCount: d.doc_count,
    groups: (d.group?.buckets ?? []).map((g) => ({ id: g.key, productCount: g.doc_count })),
  }));
  return { total: json.hits?.total?.value ?? 0, departments };
}

async function fetchCatalogFiltered(
  fetchImpl: typeof fetch,
  filter: { d?: number[]; g?: number[] },
): Promise<CatalogProduct[]> {
  const body: Record<string, unknown> = { size: 30, page: 1 };
  if (filter.d) body.d = filter.d;
  if (filter.g) body.g = filter.g;
  const res = await fetchImpl(CATALOG_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'SupermarketAI-Categories/1.0',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `Rami Levy /api/catalog filter=${JSON.stringify(filter)} failed: HTTP ${res.status}`,
    );
  }
  const json = (await res.json()) as CatalogResponse;
  return json.data ?? [];
}

function recordNames(
  deptNames: Map<number, NameSlug>,
  groupNames: Map<number, NameSlug>,
  products: readonly CatalogProduct[],
): void {
  for (const p of products) {
    if (p.department?.id && p.department.name && !deptNames.has(p.department.id)) {
      deptNames.set(p.department.id, {
        name: p.department.name,
        slug: p.department.slug,
      });
    }
    if (p.group?.id && p.group.name && !groupNames.has(p.group.id)) {
      groupNames.set(p.group.id, {
        name: p.group.name,
        slug: p.group.slug,
      });
    }
  }
}

export async function scrapeRamiLevyCategories(
  options: RamiLevyScrapeOptions = {},
): Promise<ChainCategoryTree> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const delayMs = options.delayMs ?? 250;

  const skeleton = await fetchMenuSkeleton(fetchImpl);

  const deptIds = skeleton.departments.map((d) => d.id);
  const wanted = options.maxDepartments ? deptIds.slice(0, options.maxDepartments) : deptIds;

  const deptNames = new Map<number, NameSlug>();
  const groupNames = new Map<number, NameSlug>();

  // One query per department: this gives the dept name AND the names of
  // the first ~30 groups encountered for that dept, which usually covers
  // every group (departments rarely have more than 20 groups).
  for (const id of wanted) {
    const products = await fetchCatalogFiltered(fetchImpl, { d: [id] });
    recordNames(deptNames, groupNames, products);
    if (delayMs > 0) await delay(delayMs);
  }

  // For any group we still haven't named (a dept's tail-end groups), do a
  // narrower query per (dept, group) to fill the gap.
  for (const dept of skeleton.departments) {
    if (options.maxDepartments && !wanted.includes(dept.id)) continue;
    for (const grp of dept.groups) {
      if (groupNames.has(grp.id)) continue;
      const products = await fetchCatalogFiltered(fetchImpl, { d: [dept.id], g: [grp.id] });
      recordNames(deptNames, groupNames, products);
      if (delayMs > 0) await delay(delayMs);
    }
  }

  const roots: ChainCategoryNode[] = [];
  let leafCount = 0;
  for (const dept of skeleton.departments) {
    if (options.maxDepartments && !wanted.includes(dept.id)) continue;
    const deptNs = deptNames.get(dept.id);
    if (!deptNs) {
      // Couldn't resolve dept name even after the focused query — record a
      // placeholder so the matcher can show it as unmapped instead of
      // silently dropping it.
      roots.push({
        id: String(dept.id),
        nameHe: `מחלקה ${dept.id}`,
        depth: 0,
        children: [],
        productCount: dept.productCount,
      });
      continue;
    }
    const deptUrl = deptNs.slug
      ? `${RAMI_LEVY_BASE}/he/online/market/${encodeURIComponent(deptNs.slug)}`
      : undefined;
    const deptNode: ChainCategoryNode = {
      id: String(dept.id),
      nameHe: deptNs.name,
      slug: deptNs.slug,
      url: deptUrl,
      depth: 0,
      children: [],
      productCount: dept.productCount,
    };
    for (const grp of dept.groups) {
      const grpNs = groupNames.get(grp.id);
      if (!grpNs) continue;
      deptNode.children.push({
        id: String(grp.id),
        nameHe: grpNs.name,
        slug: grpNs.slug,
        depth: 1,
        children: [],
        productCount: grp.productCount,
      });
      leafCount += 1;
    }
    if (deptNode.children.length === 0) leafCount += 1;
    roots.push(deptNode);
  }

  return {
    retailerSlug: 'rami-levy',
    retailerNameHe: 'רמי לוי',
    scrapedAt: new Date().toISOString(),
    source: `${RAMI_LEVY_BASE}/api/menu + /api/catalog`,
    roots,
    leafCount,
  };
}
