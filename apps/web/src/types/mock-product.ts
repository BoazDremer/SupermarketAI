export type MockProduct = {
  id: string;
  name: string;
  nameHe?: string;
  categoryKey?: string;
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
