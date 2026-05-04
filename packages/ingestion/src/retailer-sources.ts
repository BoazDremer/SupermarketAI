import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IngestionProviderConfig, RetailerIngestionProvider } from './types.js';
import { CarrefourProvider } from './providers/carrefour-provider.js';
import { LocalFixtureProvider } from './providers/local-fixture-provider.js';
import { MatrixNibitProvider } from './providers/matrix-nibit-provider.js';
import { PublishedPricesProvider } from './providers/published-prices-provider.js';
import { ShufersalProvider } from './providers/shufersal-provider.js';

/** Absolute path to `packages/ingestion` (where `fixtures/` lives). */
export function getIngestionPackageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export type KnownRetailerPortalKey =
  | 'shufersal'
  | 'carrefour'
  | 'published-prices'
  | 'matrix'
  | 'nibit'
  | 'sample'
  | 'fixture';

export type RetailerSourceRegistration = {
  key: KnownRetailerPortalKey;
  label: string;
  providerKind: IngestionProviderConfig['providerKind'];
  /** Hint for default `baseUrl` wiring (TODO per provider). */
  defaultBaseUrl?: string;
};

export const RETAILER_SOURCE_REGISTRY: readonly RetailerSourceRegistration[] = [
  {
    key: 'shufersal',
    label: 'Shufersal (dedicated portal)',
    providerKind: 'DEDICATED_PORTAL',
  },
  {
    key: 'carrefour',
    label: 'Carrefour Israel (dedicated portal)',
    providerKind: 'DEDICATED_PORTAL',
  },
  {
    key: 'published-prices',
    label: 'PublishedPrices / Cerberus-style',
    providerKind: 'PUBLISHED_PRICES',
  },
  { key: 'matrix', label: 'Matrix-style portal', providerKind: 'MATRIX_NIBIT' },
  { key: 'nibit', label: 'Nibit-style portal', providerKind: 'MATRIX_NIBIT' },
  {
    key: 'sample',
    label: 'Local fixtures (development)',
    providerKind: 'LOCAL_FIXTURE',
  },
  {
    key: 'fixture',
    label: 'Alias: local fixtures',
    providerKind: 'LOCAL_FIXTURE',
  },
] as const;

export function defaultFixtureRootForKey(retailerKey: string): string {
  const root = getIngestionPackageRoot();
  if (retailerKey === 'sample' || retailerKey === 'fixture') {
    return path.join(root, 'fixtures', 'sample');
  }
  return path.join(root, 'fixtures', retailerKey);
}

/**
 * Factory for chain ingestion. HTTP providers are stubs until TODOs are implemented.
 */
export function createRetailerIngestionProvider(
  retailerKey: string,
  overrides: Partial<IngestionProviderConfig> = {},
): RetailerIngestionProvider {
  const key = retailerKey.toLowerCase() as KnownRetailerPortalKey;
  const base: IngestionProviderConfig = {
    retailerKey,
    providerKind: 'DEDICATED_PORTAL',
    ...overrides,
  };

  switch (key) {
    case 'sample':
    case 'fixture':
      return new LocalFixtureProvider({
        ...base,
        providerKind: 'LOCAL_FIXTURE',
        fixtureRoot: overrides.fixtureRoot ?? defaultFixtureRootForKey('sample'),
      });
    case 'shufersal':
      return new ShufersalProvider({ ...base, retailerKey });
    case 'carrefour':
      return new CarrefourProvider({ ...base, retailerKey });
    case 'published-prices':
      return new PublishedPricesProvider({ ...base, retailerKey, providerKind: 'PUBLISHED_PRICES' });
    case 'matrix':
    case 'nibit':
      return new MatrixNibitProvider({ ...base, retailerKey, providerKind: 'MATRIX_NIBIT' });
    default:
      return new LocalFixtureProvider({
        ...base,
        retailerKey,
        providerKind: 'LOCAL_FIXTURE',
        fixtureRoot: overrides.fixtureRoot ?? defaultFixtureRootForKey(retailerKey),
      });
  }
}

// ---------------------------------------------------------------------------
// Real-retailer sources used by the price-import CLI (`ingest-prices`).
// These are catalogued separately from the legacy fixture-oriented registry
// above so we can grow the configuration (login flows, online store hints,
// notes) without breaking older provider wiring.
// ---------------------------------------------------------------------------

export type RealProviderType = 'SHUFERSAL_PORTAL' | 'PUBLISHED_PRICES';

export type RealRetailerSource = {
  retailerKey: string;
  /** English display name used for `Retailer.displayName`. */
  displayName: string;
  /** Hebrew display name used for `Retailer.displayNameHe`. */
  displayNameHe?: string;
  providerType: RealProviderType;
  /** Public listing URL for HTML providers (e.g. Shufersal). */
  transparencyUrl?: string;
  /** Sign-in URL for portals that require authentication. */
  loginUrl?: string;
  loginUsername?: string;
  /** Empty string when the portal expects "no password". */
  loginPassword?: string;
  /** Store ids the operator already knows are online/delivery storefronts. */
  knownOnlineStoreIds: readonly string[];
  notes?: string;
};

export const REAL_RETAILER_SOURCES: Record<string, RealRetailerSource> = {
  shufersal: {
    retailerKey: 'shufersal',
    displayName: 'Shufersal',
    displayNameHe: 'שופרסל',
    providerType: 'SHUFERSAL_PORTAL',
    transparencyUrl: 'https://prices.shufersal.co.il/',
    knownOnlineStoreIds: ['413'],
    notes:
      'Public HTML listing. catID=1 lists PriceFull files; storeId=413 is the שופרסל ONLINE storefront.',
  },
  'rami-levy': {
    retailerKey: 'rami-levy',
    displayName: 'Rami Levy',
    displayNameHe: 'רמי לוי',
    providerType: 'PUBLISHED_PRICES',
    transparencyUrl: 'https://url.retail.publishedprices.co.il/file',
    loginUrl: 'https://url.retail.publishedprices.co.il/login',
    loginUsername: 'RamiLevi',
    loginPassword: '',
    // 001-070 is the documented online/delivery store. Operators may override
    // via --storeId; detection from the Stores file is also attempted.
    knownOnlineStoreIds: ['001-070'],
    notes:
      'PublishedPrices/Cerberus login. Use empty password. Files appear at /file with download links and a JSON listing endpoint.',
  },
};

export function getRealRetailerSource(retailerKey: string): RealRetailerSource | undefined {
  return REAL_RETAILER_SOURCES[retailerKey.toLowerCase()];
}
