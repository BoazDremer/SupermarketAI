/**
 * Core types for Israeli supermarket transparency ingestion (portals + fixtures).
 * Normalized shapes are DB-agnostic; mapping to Prisma happens in a later layer.
 */

export type IngestionProviderKind =
  | 'DEDICATED_PORTAL'
  | 'PUBLISHED_PRICES'
  | 'MATRIX_NIBIT'
  | 'LOCAL_FIXTURE';

export type RetailerFileKind =
  | 'STORE'
  | 'PRICE_FULL'
  | 'PRICE_UPDATE'
  | 'PROMO_FULL'
  | 'PROMO_UPDATE';

export type IngestionProviderConfig = {
  retailerKey: string;
  providerKind: IngestionProviderKind;
  /** Base URL for HTTP-based providers (unused for fixtures). */
  baseUrl?: string;
  /** Root directory for `LOCAL_FIXTURE` discovery and download. */
  fixtureRoot?: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
};

export type DiscoveredRetailerFile = {
  /** Stable id for logging (path hash or relative path). */
  id: string;
  retailerKey: string;
  kind: RetailerFileKind;
  /** Display name / basename. */
  name: string;
  /** Path relative to provider root (fixture folder or portal base). */
  relativePath: string;
  sizeBytes: number;
  lastModifiedMs?: number;
};

export type ParsedStore = {
  externalStoreId: string;
  displayName: string;
  city?: string;
  deliveryOffered?: boolean;
  raw?: Record<string, unknown>;
};

export type ParsedRetailerProduct = {
  externalItemCode: string;
  externalStoreId: string;
  name: string;
  nameHe?: string;
  barcode?: string;
  brand?: string;
  unitLabel?: string;
  packDescription?: string;
  raw?: Record<string, unknown>;
};

export type ParsedRetailerPrice = {
  externalItemCode: string;
  externalStoreId: string;
  amountMinor: number;
  currency: 'ILS';
  effectiveFrom?: string;
  effectiveTo?: string;
  observedAt?: string;
  isCurrent?: boolean;
  raw?: Record<string, unknown>;
};

export type ParsedRetailerPromotion = {
  externalPromotionId: string;
  externalStoreId?: string;
  title: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  raw?: Record<string, unknown>;
};

export type ParsedRetailerPromotionItem = {
  externalPromotionId: string;
  externalItemCode: string;
  role?: string;
  minQuantity?: number;
  promoPriceMinor?: number;
  percentOff?: number;
  raw?: Record<string, unknown>;
};

/**
 * Contract for chain-specific ingestion: discovery, download, and parse steps.
 * Implementations may batch network I/O; this interface stays method-per-feed-type for clarity.
 */
export interface RetailerIngestionProvider {
  readonly config: IngestionProviderConfig;

  discoverStoreFiles(): Promise<DiscoveredRetailerFile[]>;
  discoverPriceFullFiles(): Promise<DiscoveredRetailerFile[]>;
  discoverPromoFullFiles(): Promise<DiscoveredRetailerFile[]>;
  discoverPriceUpdateFiles(): Promise<DiscoveredRetailerFile[]>;
  discoverPromoUpdateFiles(): Promise<DiscoveredRetailerFile[]>;

  downloadFile(file: DiscoveredRetailerFile): Promise<Buffer>;

  parseStores(buffer: Buffer): Promise<ParsedStore[]>;
  /** Full price dumps may include product rows, price rows, or both depending on the chain. */
  parsePriceFull(buffer: Buffer): Promise<{
    products: ParsedRetailerProduct[];
    prices: ParsedRetailerPrice[];
  }>;
  parsePromoFull(buffer: Buffer): Promise<{
    promotions: ParsedRetailerPromotion[];
    items: ParsedRetailerPromotionItem[];
  }>;
  parsePriceUpdate(buffer: Buffer): Promise<ParsedRetailerPrice[]>;
  parsePromoUpdate(buffer: Buffer): Promise<{
    promotions: ParsedRetailerPromotion[];
    items: ParsedRetailerPromotionItem[];
  }>;
}
