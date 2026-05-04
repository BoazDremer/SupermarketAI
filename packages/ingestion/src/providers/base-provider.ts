import type {
  DiscoveredRetailerFile,
  IngestionProviderConfig,
  ParsedRetailerPrice,
  ParsedRetailerProduct,
  ParsedRetailerPromotion,
  ParsedRetailerPromotionItem,
  ParsedStore,
  RetailerIngestionProvider,
} from '../types.js';
import { decompressGzip } from '../file-utils.js';

export class IngestionNotImplementedError extends Error {
  constructor(provider: string, method: string) {
    super(`${provider}: ${method} is not implemented yet`);
    this.name = 'IngestionNotImplementedError';
  }
}

/**
 * Default HTTP/portal provider: every hook throws until implemented per chain.
 * `LocalFixtureProvider` overrides all methods for offline development.
 */
export class BaseRetailerIngestionProvider implements RetailerIngestionProvider {
  constructor(public readonly config: IngestionProviderConfig) {}

  protected providerName(): string {
    return this.constructor.name;
  }

  protected rejectNotImplemented(method: string): Promise<never> {
    return Promise.reject(new IngestionNotImplementedError(this.providerName(), method));
  }

  /**
   * If the discovered file name suggests gzip, decompress after download.
   */
  protected async maybeGunzip(buffer: Buffer, file: DiscoveredRetailerFile): Promise<Buffer> {
    const n = file.name.toLowerCase();
    if (n.endsWith('.gz') || file.relativePath.toLowerCase().endsWith('.gz')) {
      return decompressGzip(buffer);
    }
    return buffer;
  }

  discoverStoreFiles(): Promise<DiscoveredRetailerFile[]> {
    return this.rejectNotImplemented('discoverStoreFiles');
  }

  discoverPriceFullFiles(): Promise<DiscoveredRetailerFile[]> {
    return this.rejectNotImplemented('discoverPriceFullFiles');
  }

  discoverPromoFullFiles(): Promise<DiscoveredRetailerFile[]> {
    return this.rejectNotImplemented('discoverPromoFullFiles');
  }

  discoverPriceUpdateFiles(): Promise<DiscoveredRetailerFile[]> {
    return this.rejectNotImplemented('discoverPriceUpdateFiles');
  }

  discoverPromoUpdateFiles(): Promise<DiscoveredRetailerFile[]> {
    return this.rejectNotImplemented('discoverPromoUpdateFiles');
  }

  downloadFile(_file: DiscoveredRetailerFile): Promise<Buffer> {
    return this.rejectNotImplemented('downloadFile');
  }

  parseStores(_buffer: Buffer): Promise<ParsedStore[]> {
    return this.rejectNotImplemented('parseStores');
  }

  parsePriceFull(_buffer: Buffer): Promise<{
    products: ParsedRetailerProduct[];
    prices: ParsedRetailerPrice[];
  }> {
    return this.rejectNotImplemented('parsePriceFull');
  }

  parsePromoFull(_buffer: Buffer): Promise<{
    promotions: ParsedRetailerPromotion[];
    items: ParsedRetailerPromotionItem[];
  }> {
    return this.rejectNotImplemented('parsePromoFull');
  }

  parsePriceUpdate(_buffer: Buffer): Promise<ParsedRetailerPrice[]> {
    return this.rejectNotImplemented('parsePriceUpdate');
  }

  parsePromoUpdate(_buffer: Buffer): Promise<{
    promotions: ParsedRetailerPromotion[];
    items: ParsedRetailerPromotionItem[];
  }> {
    return this.rejectNotImplemented('parsePromoUpdate');
  }
}
