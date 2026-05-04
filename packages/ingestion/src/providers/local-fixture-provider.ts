import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type {
  DiscoveredRetailerFile,
  ParsedRetailerPrice,
  ParsedRetailerProduct,
  ParsedRetailerPromotion,
  ParsedRetailerPromotionItem,
  ParsedStore,
  RetailerFileKind,
} from '../types.js';
import { decompressIfGzip } from '../file-utils.js';
import { parseXmlToObject } from '../xml-parser.js';
import { BaseRetailerIngestionProvider } from './base-provider.js';

function stableFileId(relativePath: string): string {
  return createHash('sha1').update(relativePath).digest('hex').slice(0, 16);
}

function classifyFixtureKind(relativePath: string): RetailerFileKind | null {
  const bn = path.basename(relativePath).toLowerCase();
  if (!/\.(xml|gz)$/i.test(bn)) return null;
  if (/(^|[^a-z])stores?[^a-z]/.test(bn) || bn.startsWith('stores')) return 'STORE';
  if (/price.*full|pricefull|fullprice/.test(bn)) return 'PRICE_FULL';
  if (/promo.*full|promofull|fullpromo/.test(bn)) return 'PROMO_FULL';
  if (/price.*(update|incr|delta)/.test(bn)) return 'PRICE_UPDATE';
  if (/promo.*(update|incr|delta)/.test(bn)) return 'PROMO_UPDATE';
  return null;
}

async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(root, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await walkFiles(full)));
    } else if (ent.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function attr(node: Record<string, unknown>, key: string): string | undefined {
  const v = node[`@_${key}`];
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return String(v);
  }
  return undefined;
}

function boolAttr(node: Record<string, unknown>, key: string): boolean | undefined {
  const s = attr(node, key);
  if (s === undefined) return undefined;
  return s === 'true' || s === '1';
}

function numAttr(node: Record<string, unknown>, key: string): number | undefined {
  const s = attr(node, key);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export class LocalFixtureProvider extends BaseRetailerIngestionProvider {
  private resolveRoot(): string {
    const root = this.config.fixtureRoot;
    if (!root) {
      throw new Error('LocalFixtureProvider requires config.fixtureRoot');
    }
    return path.resolve(root);
  }

  private async listDiscovered(kind: RetailerFileKind): Promise<DiscoveredRetailerFile[]> {
    const root = this.resolveRoot();
    const absoluteFiles = await walkFiles(root);
    const discovered: DiscoveredRetailerFile[] = [];
    for (const abs of absoluteFiles) {
      const rel = path.relative(root, abs);
      const classified = classifyFixtureKind(rel);
      if (classified !== kind) continue;
      const st = await stat(abs);
      discovered.push({
        id: stableFileId(rel),
        retailerKey: this.config.retailerKey,
        kind,
        name: path.basename(abs),
        relativePath: rel,
        sizeBytes: st.size,
        lastModifiedMs: st.mtimeMs,
      });
    }
    return discovered.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  override async discoverStoreFiles(): Promise<DiscoveredRetailerFile[]> {
    return this.listDiscovered('STORE');
  }

  override async discoverPriceFullFiles(): Promise<DiscoveredRetailerFile[]> {
    return this.listDiscovered('PRICE_FULL');
  }

  override async discoverPromoFullFiles(): Promise<DiscoveredRetailerFile[]> {
    return this.listDiscovered('PROMO_FULL');
  }

  override async discoverPriceUpdateFiles(): Promise<DiscoveredRetailerFile[]> {
    return this.listDiscovered('PRICE_UPDATE');
  }

  override async discoverPromoUpdateFiles(): Promise<DiscoveredRetailerFile[]> {
    return this.listDiscovered('PROMO_UPDATE');
  }

  override async downloadFile(file: DiscoveredRetailerFile): Promise<Buffer> {
    const root = this.resolveRoot();
    const abs = path.join(root, file.relativePath);
    const resolved = path.resolve(abs);
    if (!resolved.startsWith(path.resolve(root))) {
      throw new Error(`Path traversal blocked: ${file.relativePath}`);
    }
    return readFile(resolved);
  }

  private async toXmlBuffer(buffer: Buffer): Promise<Buffer> {
    return decompressIfGzip(buffer);
  }

  override async parseStores(buffer: Buffer): Promise<ParsedStore[]> {
    const xmlBuf = await this.toXmlBuffer(buffer);
    const doc = parseXmlToObject(xmlBuf) as Record<string, unknown>;
    const storesRoot = (doc.Stores ?? doc.stores) as Record<string, unknown> | undefined;
    if (!storesRoot) return [];
    const raw = storesRoot.Store ?? storesRoot.store;
    const nodes = asArray<Record<string, unknown>>(raw as Record<string, unknown> | Record<string, unknown>[]);
    return nodes.map((n) => ({
      externalStoreId: attr(n, 'externalStoreId') ?? attr(n, 'id') ?? '',
      displayName: attr(n, 'displayName') ?? attr(n, 'name') ?? '',
      city: attr(n, 'city'),
      deliveryOffered: boolAttr(n, 'deliveryOffered'),
      raw: n,
    })).filter((s) => s.externalStoreId.length > 0);
  }

  override async parsePriceFull(buffer: Buffer): Promise<{
    products: ParsedRetailerProduct[];
    prices: ParsedRetailerPrice[];
  }> {
    const xmlBuf = await this.toXmlBuffer(buffer);
    const doc = parseXmlToObject(xmlBuf) as Record<string, unknown>;
    const root = (doc.PriceFull ??
      doc.priceFull ??
      doc.PriceUpdate ??
      doc.priceUpdate ??
      doc.Root) as Record<string, unknown> | undefined;
    if (!root) return { products: [], prices: [] };
    const rows = asArray<Record<string, unknown>>(
      (root.Row ?? root.Product ?? root.Item) as Record<string, unknown> | Record<string, unknown>[],
    );
    const products: ParsedRetailerProduct[] = [];
    const prices: ParsedRetailerPrice[] = [];
    for (const n of rows) {
      const externalItemCode = attr(n, 'externalItemCode') ?? attr(n, 'itemCode') ?? '';
      const externalStoreId = attr(n, 'externalStoreId') ?? attr(n, 'storeId') ?? '';
      const name = attr(n, 'name') ?? attr(n, 'itemName') ?? externalItemCode;
      if (externalItemCode && externalStoreId) {
        products.push({
          externalItemCode,
          externalStoreId,
          name,
          nameHe: attr(n, 'nameHe'),
          barcode: attr(n, 'barcode'),
          brand: attr(n, 'brand'),
          unitLabel: attr(n, 'unitLabel'),
          packDescription: attr(n, 'packDescription'),
          raw: n,
        });
      }
      const priceMinor = numAttr(n, 'priceMinor') ?? numAttr(n, 'price');
      if (externalItemCode && externalStoreId && priceMinor !== undefined) {
        prices.push({
          externalItemCode,
          externalStoreId,
          amountMinor: Math.round(priceMinor),
          currency: 'ILS',
          effectiveFrom: attr(n, 'effectiveFrom'),
          effectiveTo: attr(n, 'effectiveTo'),
          observedAt: attr(n, 'observedAt'),
          isCurrent: boolAttr(n, 'isCurrent'),
          raw: n,
        });
      }
    }
    return { products, prices };
  }

  override async parsePromoFull(buffer: Buffer): Promise<{
    promotions: ParsedRetailerPromotion[];
    items: ParsedRetailerPromotionItem[];
  }> {
    return this.parsePromoDocument(buffer);
  }

  override async parsePriceUpdate(buffer: Buffer): Promise<ParsedRetailerPrice[]> {
    const { prices } = await this.parsePriceFull(buffer);
    return prices;
  }

  override async parsePromoUpdate(buffer: Buffer): Promise<{
    promotions: ParsedRetailerPromotion[];
    items: ParsedRetailerPromotionItem[];
  }> {
    return this.parsePromoDocument(buffer);
  }

  private async parsePromoDocument(buffer: Buffer): Promise<{
    promotions: ParsedRetailerPromotion[];
    items: ParsedRetailerPromotionItem[];
  }> {
    const xmlBuf = await this.toXmlBuffer(buffer);
    const doc = parseXmlToObject(xmlBuf) as Record<string, unknown>;
    const root = (doc.PromoFull ??
      doc.promoFull ??
      doc.PromoUpdate ??
      doc.promoUpdate) as Record<string, unknown> | undefined;
    if (!root) return { promotions: [], items: [] };

    const promoNodes = asArray<Record<string, unknown>>(
      root.Promotion as Record<string, unknown> | Record<string, unknown>[],
    );
    const promotions: ParsedRetailerPromotion[] = promoNodes.map((n) => ({
      externalPromotionId: attr(n, 'externalPromotionId') ?? attr(n, 'id') ?? '',
      externalStoreId: attr(n, 'externalStoreId'),
      title: attr(n, 'title') ?? '',
      description: attr(n, 'description'),
      startsAt: attr(n, 'startsAt'),
      endsAt: attr(n, 'endsAt'),
      raw: n,
    }));

    const itemNodes = asArray<Record<string, unknown>>(
      (root.Item ?? root.PromotionItem) as Record<string, unknown> | Record<string, unknown>[],
    );
    const items: ParsedRetailerPromotionItem[] = itemNodes.map((n) => ({
      externalPromotionId: attr(n, 'externalPromotionId') ?? '',
      externalItemCode: attr(n, 'externalItemCode') ?? '',
      role: attr(n, 'role'),
      minQuantity: numAttr(n, 'minQuantity'),
      promoPriceMinor: numAttr(n, 'promoPriceMinor'),
      percentOff: numAttr(n, 'percentOff'),
      raw: n,
    }));

    return { promotions, items };
  }
}
