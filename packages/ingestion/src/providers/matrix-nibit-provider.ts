import type { IngestionProviderConfig } from '../types.js';
import { BaseRetailerIngestionProvider } from './base-provider.js';

/**
 * **Matrix** / **Nibit** style supermarket portals (alternate file layouts).
 *
 * TODO: Implement Matrix discovery + session handling if required.
 * TODO: Implement Nibit-specific paths separately or via sub-key (`matrix` vs `nibit`).
 * TODO: Map portal XML/JSON into normalized `Parsed*` types.
 */
export class MatrixNibitProvider extends BaseRetailerIngestionProvider {
  constructor(config: IngestionProviderConfig) {
    super({
      ...config,
      providerKind: 'MATRIX_NIBIT',
    });
  }
}
