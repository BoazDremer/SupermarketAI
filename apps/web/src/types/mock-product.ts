/** One node in our backbone taxonomy path (root → leaf). */
export type CommonCategoryPathNode = {
  id: string;
  nameHe: string;
  nameEn: string;
};

/**
 * One retailer's chain category trail for the product, ordered
 * department → group → sub-group. Only the levels the retailer actually
 * filled in are present in `segments`.
 */
export type RetailerCategoryPath = {
  retailerSlug: string;
  retailerDisplayName: string;
  retailerDisplayNameHe?: string;
  segments: Array<{
    id: string;
    name: string;
    level: 'department' | 'group' | 'subGroup';
  }>;
};

export type MockProduct = {
  id: string;
  name: string;
  nameHe?: string;
  /** Hebrew label from the transparency price file when it differs from `nameHe` (site-facing). */
  transparencyNameHe?: string;
  /** Legacy heuristic key (e.g. "dairy"). Group-level. */
  categoryKey?: string;
  /** Backbone leaf id (e.g. "dairy/cheese") for grouping in catalog views. */
  commonCategoryId?: string;
  brand: string;
  unit: string;
  priceRangeLabel: string;
  /** CSS hue for placeholder block (used as fallback when imageUrl is absent) */
  imageHue: number;
  /** Absolute https URL to the product image, when known. */
  imageUrl?: string;
  promoLabel?: string;
  /** Retailer slugs (e.g. `rami-levy`, `shufersal`) that list this SKU. */
  availableRetailerSlugs?: string[];
  /**
   * Detail-only — set by `GET /products/:id`. Our backbone path from root to
   * leaf, e.g. `[dairy, dairy/milk, dairy/milk/fresh]`.
   */
  commonCategoryPath?: CommonCategoryPathNode[];
  /**
   * Detail-only — set by `GET /products/:id`. One entry per retailer that
   * sells this SKU, with the chain's own department/group/sub-group trail.
   */
  retailerCategoryPaths?: RetailerCategoryPath[];
};

export type MockRetailer = {
  id: string;
  name: string;
  slug: string;
  delivery: boolean;
  logoHue: number;
};

export type MockSubstitution = {
  id: string;
  name: string;
  reason: string;
  priceRangeLabel: string;
};

export type MockMissingItem = {
  lineId: string;
  requestedName: string;
  retailerName: string;
  retailerNameHe?: string;
  retailerId?: string;
};
