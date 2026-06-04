import { getPrismaClient } from '@supermarket-price-compare/db';
import type { PrismaClient } from '@supermarket-price-compare/db';
import type { NormalizedPriceFullRow } from '../normalizers.js';

/**
 * Optional progress callback invoked after every Nth row of a `PriceFull`
 * import. CLIs use this to drive a live reporter; library callers can pass
 * undefined to keep the import silent.
 */
export type PriceFullImportProgress = (state: {
  rowIndex: number;
  totalRows: number;
}) => void;

export type PriceFullImportInput = {
  retailer: {
    slug: string;
    displayName: string;
    displayNameHe?: string;
    websiteUrl?: string;
  };
  store: {
    externalStoreId: string;
    /** Optional friendly label for the row. */
    displayName?: string;
    deliveryOffered?: boolean;
  };
  file: {
    fileName: string;
    storagePath: string;
    sha256?: string;
    sizeBytes?: number;
  };
  rows: readonly NormalizedPriceFullRow[];
  /** When true, do not write anything; just compute the summary. */
  dryRun?: boolean;
  /** Invoked periodically while writing rows so a CLI can show progress. */
  onProgress?: PriceFullImportProgress;
  /** Tick `onProgress` every N rows (default 100). */
  progressEvery?: number;
};

export type PriceFullImportSummary = {
  retailerKey: string;
  storeId: string;
  ingestionRunId?: string;
  ingestionFileId?: string;
  productsParsed: number;
  retailerProductsUpserted: number;
  pricesInserted: number;
  canonicalProductsCreated: number;
  canonicalProductsMatched: number;
  productMatchesUpserted: number;
  skippedRows: number;
  errors: number;
  warnings: number;
  durationMs: number;
};

/**
 * Import a normalized PriceFull payload into PostgreSQL via Prisma.
 *
 * High-level flow:
 *   1. Open an `IngestionRun` (status = RUNNING).
 *   2. Upsert `Retailer` + `RetailerStore`.
 *   3. Record an `IngestionFile` row with checksum + path.
 *   4. For every normalized row:
 *        - Upsert the `RetailerProduct` (unique by retailerId + storeId + externalItemCode).
 *        - Mark the previous `RetailerPrice.isCurrent` flags off.
 *        - Insert a fresh `RetailerPrice` with `isCurrent = true`.
 *        - When a barcode is present, upsert a `CanonicalProduct` and
 *          link it via a `ProductMatch` of type `EXACT_BARCODE`.
 *   5. Close the `IngestionRun` with a status + stats payload.
 *
 * Dry run mode skips all writes and only counts work it would have done.
 */
export async function importPriceFull(input: PriceFullImportInput): Promise<PriceFullImportSummary> {
  const start = Date.now();
  const summary: PriceFullImportSummary = {
    retailerKey: input.retailer.slug,
    storeId: input.store.externalStoreId,
    productsParsed: input.rows.length,
    retailerProductsUpserted: 0,
    pricesInserted: 0,
    canonicalProductsCreated: 0,
    canonicalProductsMatched: 0,
    productMatchesUpserted: 0,
    skippedRows: 0,
    errors: 0,
    warnings: input.rows.reduce((n, r) => n + r.warnings.length, 0),
    durationMs: 0,
  };

  if (input.dryRun) {
    summary.skippedRows = input.rows.filter((r) => !r.product.externalItemCode).length;
    summary.durationMs = Date.now() - start;
    return summary;
  }

  const prisma = getPrismaClient();

  const run = await prisma.ingestionRun.create({
    data: {
      status: 'RUNNING',
      stats: {
        retailerKey: input.retailer.slug,
        storeId: input.store.externalStoreId,
        plannedRows: input.rows.length,
      },
    },
  });
  summary.ingestionRunId = run.id;

  try {
    const retailer = await prisma.retailer.upsert({
      where: { slug: input.retailer.slug },
      update: {
        displayName: input.retailer.displayName,
        displayNameHe: input.retailer.displayNameHe,
        websiteUrl: input.retailer.websiteUrl,
      },
      create: {
        slug: input.retailer.slug,
        displayName: input.retailer.displayName,
        displayNameHe: input.retailer.displayNameHe,
        websiteUrl: input.retailer.websiteUrl,
        supportsDelivery: true,
      },
    });

    const store = await prisma.retailerStore.upsert({
      where: {
        retailerId_externalStoreId: {
          retailerId: retailer.id,
          externalStoreId: input.store.externalStoreId,
        },
      },
      update: {
        displayName: input.store.displayName ?? input.retailer.displayName,
        deliveryOffered: input.store.deliveryOffered ?? true,
      },
      create: {
        retailerId: retailer.id,
        externalStoreId: input.store.externalStoreId,
        displayName: input.store.displayName ?? input.retailer.displayName,
        deliveryOffered: input.store.deliveryOffered ?? true,
      },
    });

    const file = await prisma.ingestionFile.create({
      data: {
        retailerId: retailer.id,
        fileType: 'PRICE',
        fileName: input.file.fileName,
        storagePath: input.file.storagePath,
        sha256: input.file.sha256,
        sizeBytes: input.file.sizeBytes,
        ingestionRunId: run.id,
      },
    });
    summary.ingestionFileId = file.id;

    await ingestRows(
      prisma,
      retailer.id,
      store.id,
      input.rows,
      summary,
      input.onProgress,
      input.progressEvery,
    );

    summary.durationMs = Date.now() - start;
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        stats: { ...summary } as unknown as object,
      },
    });
    return summary;
  } catch (err) {
    summary.errors += 1;
    summary.durationMs = Date.now() - start;
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : String(err),
        stats: { ...summary } as unknown as object,
      },
    });
    throw err;
  }
}

async function ingestRows(
  prisma: PrismaClient,
  retailerId: string,
  storeId: string,
  rows: readonly NormalizedPriceFullRow[],
  summary: PriceFullImportSummary,
  onProgress?: PriceFullImportProgress,
  progressEvery = 100,
): Promise<void> {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;
    if (!row.product.externalItemCode) {
      summary.skippedRows += 1;
      continue;
    }
    try {
      const retailerProduct = await prisma.retailerProduct.upsert({
        where: {
          retailerId_storeId_externalItemCode: {
            retailerId,
            storeId,
            externalItemCode: row.product.externalItemCode,
          },
        },
        update: {
          name: row.product.name,
          nameHe: row.product.nameHe,
          brand: row.product.brand,
          unitLabel: row.product.unitLabel,
          packDescription: row.product.packDescription,
          barcode: row.product.barcode,
          rawData: row.product.raw as object | undefined,
        },
        create: {
          retailerId,
          storeId,
          externalItemCode: row.product.externalItemCode,
          name: row.product.name,
          nameHe: row.product.nameHe,
          brand: row.product.brand,
          unitLabel: row.product.unitLabel,
          packDescription: row.product.packDescription,
          barcode: row.product.barcode,
          rawData: row.product.raw as object | undefined,
        },
      });
      summary.retailerProductsUpserted += 1;

      await prisma.retailerPrice.updateMany({
        where: { retailerProductId: retailerProduct.id, isCurrent: true },
        data: { isCurrent: false },
      });

      const observedAt = row.price.observedAt ? new Date(row.price.observedAt) : new Date();
      const effectiveFrom = row.price.effectiveFrom ? new Date(row.price.effectiveFrom) : observedAt;
      const effectiveTo = row.price.effectiveTo ? new Date(row.price.effectiveTo) : null;

      await prisma.retailerPrice.create({
        data: {
          retailerId,
          storeId,
          retailerProductId: retailerProduct.id,
          amountMinor: row.price.amountMinor,
          currency: row.price.currency,
          effectiveFrom,
          effectiveTo: effectiveTo ?? undefined,
          observedAt,
          isCurrent: true,
          rawData: row.price.raw as object | undefined,
        },
      });
      summary.pricesInserted += 1;

      if (row.product.barcode) {
        const existingCanonical = await prisma.canonicalProduct.findFirst({
          where: { barcodeGtin: row.product.barcode },
        });
        const canonical = existingCanonical
          ? existingCanonical
          : await prisma.canonicalProduct.create({
              data: {
                displayName: row.product.name,
                displayNameHe: row.product.nameHe,
                transparencyNameHe: row.product.nameHe ?? row.product.name,
                brand: row.product.brand,
                barcodeGtin: row.product.barcode,
              },
            });
        if (existingCanonical) summary.canonicalProductsMatched += 1;
        else summary.canonicalProductsCreated += 1;

        await prisma.productMatch.upsert({
          where: {
            canonicalProductId_retailerProductId: {
              canonicalProductId: canonical.id,
              retailerProductId: retailerProduct.id,
            },
          },
          update: {
            matchType: 'EXACT_BARCODE',
            confidence: 1,
          },
          create: {
            canonicalProductId: canonical.id,
            retailerProductId: retailerProduct.id,
            matchType: 'EXACT_BARCODE',
            confidence: 1,
          },
        });
        summary.productMatchesUpserted += 1;
      }
    } catch (err) {
      summary.errors += 1;
      console.error(
        `Row failed (item ${row.product.externalItemCode}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (onProgress && ((i + 1) % progressEvery === 0 || i === rows.length - 1)) {
      onProgress({ rowIndex: i + 1, totalRows: rows.length });
    }
  }
}
