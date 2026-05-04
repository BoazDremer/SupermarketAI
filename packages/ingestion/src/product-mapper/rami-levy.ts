/**
 * Rami Levy product enumerator.
 *
 * Strategy:
 *   1. `GET /api/menu` — discover department ids (and how many products each
 *      department has) so we know what to query.
 *   2. For every department issue ONE `POST /api/catalog` with `size: total`
 *      (capped to a safe upper bound). Each product object in the response
 *      includes `barcode`, `department.id`, `group.id`, which is everything
 *      we need to assign a backbone `commonCategoryId`.
 *
 * The endpoint accepts very large page sizes — we observed that
 * `size: 5000` returns 2150 products in one response without paging — so
 * the entire catalog is harvested in ~17 HTTP calls, well under a minute.
 */

const RAMI_LEVY_BASE = 'https://www.rami-levy.co.il';
const RAMI_LEVY_IMAGE_BASE = 'https://img.rami-levy.co.il';
const MENU_URL = `${RAMI_LEVY_BASE}/api/menu`;
const CATALOG_URL = `${RAMI_LEVY_BASE}/api/catalog`;

export type RamiLevyEnumeratedProduct = {
  /** GTIN / barcode as published by Rami Levy. */
  barcode: string;
  /** Internal Rami Levy product id (numeric). */
  productId: number;
  departmentId: number;
  groupId: number | null;
  /** Sub-group (sub-department) id when present — most specific category. */
  subGroupId: number | null;
  /** Full untruncated Hebrew name. */
  name: string;
  /** Brand string (prefers GS1 BrandName, falls back to numeric brand id). */
  brand?: string;
  /** Short shelf-friendly label, when supplied via GS1. */
  shortName?: string;
  /** Absolute https URL to the medium-size product image, when present. */
  imageUrl?: string;
};

export type RamiLevyEnumerationResult = {
  products: RamiLevyEnumeratedProduct[];
  /** Per-department counts ({deptId → fetched / advertised}). */
  perDepartment: Array<{
    deptId: number;
    advertisedTotal: number;
    fetched: number;
  }>;
};

export type EnumerateOptions = {
  /** Sleep between catalog requests, ms. Default 250ms. */
  delayMs?: number;
  /** Cap on `size` per request. Default 5000 (covers every dept we've seen). */
  pageSize?: number;
  /** Optional fetch impl override (testing). */
  fetchImpl?: typeof fetch;
  /** Verbose progress to stderr. Default true. */
  log?: (msg: string) => void;
};

type MenuResponse = {
  aggregations?: {
    department?: { buckets?: Array<{ key: number; doc_count: number }> };
  };
};

type CatalogProductRaw = {
  id?: number;
  barcode?: string | number;
  name?: string;
  brand?: string | number | null;
  department?: { id?: number };
  group?: { id?: number };
  subGroup?: { id?: number };
  sub_group_id?: number;
  gs?: {
    BrandName?: string | null;
    short_name?: string | null;
  } | null;
  images?: {
    small?: string | null;
    original?: string | null;
    trim?: string | null;
    transparent?: string | null;
  } | null;
};

type CatalogResponse = { total?: number; data?: CatalogProductRaw[] };

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * GS1 BrandName is the most useful when present (e.g. "תבואות"). Fall back to
 * the top-level `brand` field, which is sometimes a numeric brand id rather
 * than a name — in that case we discard it because it isn't user-friendly.
 */
function pickBrand(p: CatalogProductRaw): string | undefined {
  const gsBrand = cleanString(p.gs?.BrandName);
  if (gsBrand) return gsBrand;
  if (typeof p.brand === 'string') return cleanString(p.brand);
  return undefined;
}

/**
 * Build an absolute https URL for the product's image. Rami Levy ships the
 * `images` block as relative paths (e.g. "/product/<barcode>/small.jpg")
 * and serves them from `img.rami-levy.co.il`. We prefer `original` (large)
 * for clarity, falling back to `trim` and `small` so we still get *some*
 * picture for legacy SKUs that don't ship a full set.
 */
function pickImageUrl(p: CatalogProductRaw): string | undefined {
  const candidates = [p.images?.original, p.images?.trim, p.images?.small];
  for (const raw of candidates) {
    const cleaned = cleanString(raw);
    if (!cleaned) continue;
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) return cleaned;
    if (cleaned.startsWith('/')) return `${RAMI_LEVY_IMAGE_BASE}${cleaned}`;
  }
  return undefined;
}

async function fetchMenu(fetchImpl: typeof fetch): Promise<Array<{ id: number; total: number }>> {
  const res = await fetchImpl(MENU_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SupermarketAI-ProductMapper/1.0',
    },
  });
  if (!res.ok) throw new Error(`Rami Levy /api/menu failed: HTTP ${res.status}`);
  const json = (await res.json()) as MenuResponse;
  const buckets = json.aggregations?.department?.buckets ?? [];
  return buckets.map((b) => ({ id: b.key, total: b.doc_count }));
}

async function fetchDepartmentProducts(
  fetchImpl: typeof fetch,
  deptId: number,
  pageSize: number,
): Promise<{ total: number; products: CatalogProductRaw[] }> {
  const res = await fetchImpl(CATALOG_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'SupermarketAI-ProductMapper/1.0',
    },
    body: JSON.stringify({ d: [deptId], size: pageSize }),
  });
  if (!res.ok) {
    throw new Error(
      `Rami Levy /api/catalog d=${deptId} failed: HTTP ${res.status}`,
    );
  }
  const json = (await res.json()) as CatalogResponse;
  return { total: json.total ?? 0, products: json.data ?? [] };
}

/**
 * Enumerate every Rami Levy product reachable via the public catalog API,
 * keyed by GTIN with its assigned department/group ids.
 */
export async function enumerateRamiLevyProducts(
  options: EnumerateOptions = {},
): Promise<RamiLevyEnumerationResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const delayMs = options.delayMs ?? 250;
  const pageSize = options.pageSize ?? 5000;
  const log = options.log ?? ((m) => process.stderr.write(`${m}\n`));

  log('[rami-levy] fetching /api/menu skeleton…');
  const depts = await fetchMenu(fetchImpl);
  log(`[rami-levy] ${depts.length} departments, ~${depts.reduce((a, d) => a + d.total, 0)} total items advertised`);

  const products: RamiLevyEnumeratedProduct[] = [];
  const seen = new Set<string>(); // dedupe by barcode
  const perDepartment: RamiLevyEnumerationResult['perDepartment'] = [];

  for (const [i, dept] of depts.entries()) {
    log(
      `[rami-levy] (${i + 1}/${depts.length}) dept ${dept.id} — fetching up to ${Math.max(dept.total, 1)} items…`,
    );
    const { total, products: raw } = await fetchDepartmentProducts(
      fetchImpl,
      dept.id,
      Math.max(pageSize, dept.total + 50),
    );
    let fetched = 0;
    for (const p of raw) {
      const barcodeStr = p.barcode != null ? String(p.barcode) : '';
      const productId = typeof p.id === 'number' ? p.id : 0;
      const deptId = p.department?.id ?? dept.id;
      const groupId = p.group?.id ?? null;
      const subGroupId = p.subGroup?.id ?? p.sub_group_id ?? null;
      const name = typeof p.name === 'string' ? p.name.trim() : '';
      if (!barcodeStr) continue;
      if (seen.has(barcodeStr)) continue;
      seen.add(barcodeStr);
      products.push({
        barcode: barcodeStr,
        productId,
        departmentId: deptId,
        groupId,
        subGroupId,
        name,
        brand: pickBrand(p),
        shortName: cleanString(p.gs?.short_name),
        imageUrl: pickImageUrl(p),
      });
      fetched += 1;
    }
    perDepartment.push({ deptId: dept.id, advertisedTotal: total, fetched });
    if (delayMs > 0 && i < depts.length - 1) await delay(delayMs);
  }

  log(`[rami-levy] enumerated ${products.length} unique products across ${depts.length} depts`);
  return { products, perDepartment };
}
