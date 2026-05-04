import type { IngestionProviderConfig } from '../types.js';
import { BaseRetailerIngestionProvider } from './base-provider.js';

/**
 * Dedicated Carrefour Israel transparency portal.
 *
 * TODO: Wire discovery + download for Carrefour feed layout.
 * TODO: Parse store / price / promo payloads into `Parsed*` types.
 */
export class CarrefourProvider extends BaseRetailerIngestionProvider {
  constructor(config: IngestionProviderConfig) {
    super({
      ...config,
      retailerKey: config.retailerKey || 'carrefour',
      providerKind: 'DEDICATED_PORTAL',
    });
  }
}
