import type { MockProduct, MockSubstitution, MockMissingItem } from '@/types/mock-product';

export type CatalogProduct = MockProduct;

export type ShoppingBagItemApi = {
  id: string;
  bagId: string;
  quantity: number;
  canonicalProductId?: string;
  name: string;
  nameHe?: string;
  brand: string;
  unit: string;
  priceRangeLabel: string;
  imageHue: number;
  imageUrl?: string;
  promoLabel?: string;
  /** Distinct chains that list this line's canonical product. */
  availableRetailerSlugs?: string[];
};

export type ShoppingBagApi = {
  id: string;
  label?: string;
  createdAt: string;
  updatedAt: string;
  items: ShoppingBagItemApi[];
};

export type MoneyMinor = { currency: string; minorUnits: number };

export type BasketComparisonRetailerResultApi = {
  id: string;
  retailerId: string;
  storeId: string;
  rank: number;
  totalPrice: MoneyMinor;
  totalBeforePromotions: MoneyMinor;
  promotionSavings: MoneyMinor;
  missingShoppingBagItemIds: string[];
  substitutedShoppingBagItemIds: string[];
  exactMatchCount: number;
  equivalentMatchCount: number;
  substituteMatchCount: number;
  confidenceScore: number;
  /** Localized retailer display name attached server-side. */
  retailerDisplayName: string;
  retailerDisplayNameHe?: string;
  retailerSlug: string;
};

export type BasketComparisonApi = {
  id: string;
  shoppingBagId: string;
  comparedAt: string;
  retailerResults: BasketComparisonRetailerResultApi[];
  overallConfidenceScore?: number;
  savingsBestVsWorstLabel: string;
  missing: MockMissingItem[];
  substitutions: MockSubstitution[];
};

export type ComparisonTableRow = {
  retailerId: string;
  retailerName: string;
  totalLabel: string;
  rank: number;
  missingCount: number;
  substituteCount: number;
  exactCount: number;
  equivalentCount: number;
  promotionSavingsLabel: string;
};
