# Ingesting real PriceFull files

The ingestion CLI downloads, parses, and imports official **PriceFull**
transparency files from supported supermarket chains directly into PostgreSQL
via Prisma. It is intended to be run manually for now (no scheduler).

> Initial retailers: **Shufersal** and **Rami Levy**.
> Promotions and incremental price updates are deliberately out of scope for
> the first iteration.

## Prerequisites

1. **PostgreSQL** running locally and reachable.
2. `packages/db/.env` (and `apps/api/.env`) populated with `DATABASE_URL`.
3. Schema applied:

   ```bash
   pnpm --filter @supermarket-price-compare/db prisma:migrate
   ```

4. Workspace dependencies installed once:

   ```bash
   pnpm install
   ```

5. Generated Prisma client (run automatically on `pnpm install` via
   `postinstall`; otherwise `pnpm --filter @supermarket-price-compare/db generate`).

## Running the CLI

```bash
# Shufersal — online store 413 (שופרסל ONLINE)
pnpm ingest:prices -- --retailer=shufersal

# Rami Levy — store 001-070 by default
pnpm ingest:prices -- --retailer=rami-levy
```

You can also call the ingestion package directly:

```bash
pnpm --filter @supermarket-price-compare/ingestion ingest:prices -- --retailer=shufersal
```

### Useful flags

| Flag | Description |
| ---- | ----------- |
| `--retailer=<key>` | **Required.** `shufersal` or `rami-levy`. |
| `--storeId=<id>` | Override the default store id (`413` for Shufersal, `001-070` for Rami Levy). |
| `--localPriceFull=<path>` | Skip the download and parse a local `*.gz` (or `*.xml`) PriceFull file. |
| `--localStores=<path>` | When detecting an online store from a Stores file, use a local copy. |
| `--limit=<n>` | Import only the first N normalized rows (handy for testing). |
| `--dryRun` | Parse + summarize, **no DB writes**. |
| `--help` | Print usage. |

### Environment variables

| Variable | Effect |
| -------- | ------ |
| `INGESTION_INSECURE_TLS=1` | Disables strict TLS verification for the run. The PublishedPrices/Cerberus portal used by Rami Levy ships an incomplete certificate chain — `curl -k` works, the Node TLS stack does not — so this flag is usually required for Rami Levy until the upstream chain is fixed. |

## Examples

```bash
# Production import for Shufersal (online store 413)
pnpm ingest:prices -- --retailer=shufersal

# Production import for Rami Levy (online store 001-070)
INGESTION_INSECURE_TLS=1 pnpm ingest:prices -- --retailer=rami-levy

# Pick a different Shufersal branch
pnpm ingest:prices -- --retailer=shufersal --storeId=001

# Smoke-test parsing only (no DB writes), first 100 rows
pnpm ingest:prices -- --retailer=shufersal --dryRun --limit=100

# Re-import a previously downloaded file
pnpm ingest:prices -- --retailer=shufersal \
  --localPriceFull=./data/raw/shufersal/PriceFull7290027600007-002-413-20260428-034000.gz
```

## What the CLI actually does

1. Resolves the latest **PriceFull** file for the requested retailer + store.
   - **Shufersal**: scrapes `https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=2&storeId=<id>` for download links.
   - **Rami Levy**: logs in to `https://url.retail.publishedprices.co.il/login` (username `RamiLevi`, empty password), then queries the `/file/json/dir` listing endpoint.
2. Downloads the gzipped XML and saves it to `data/raw/<retailer>/<filename>.gz`.
3. Decompresses it and saves the XML to `data/processed/<retailer>/<filename>.xml`.
4. Parses the XML defensively (handles different chain layouts) and normalizes
   each row into `{ product, price }` shapes via `normalizePriceFullRow`.
5. Opens an `IngestionRun` (status `RUNNING`) and writes:
   - Upserts on `Retailer`, `RetailerStore`.
   - One `IngestionFile` row with the file metadata + SHA-256 checksum.
   - For each normalized row:
     - Upserts a `RetailerProduct` (unique per `retailerId + storeId + externalItemCode`).
     - Marks any previous `RetailerPrice.isCurrent = true` rows for that
       product as `false`.
     - Inserts a fresh `RetailerPrice` with `isCurrent = true`.
     - When a barcode is present, upserts a `CanonicalProduct` (by
       `barcodeGtin`) and a `ProductMatch` of type `EXACT_BARCODE`.
6. Closes the `IngestionRun` with status `COMPLETED` and a stats payload, or
   `FAILED` on error.

The CLI prints a JSON summary at the end:

```json
{
  "retailerKey": "shufersal",
  "storeId": "413",
  "ingestionRunId": "ckxx...",
  "ingestionFileId": "ckyy...",
  "productsParsed": 16217,
  "retailerProductsUpserted": 16217,
  "pricesInserted": 16217,
  "canonicalProductsCreated": 12450,
  "canonicalProductsMatched": 3767,
  "productMatchesUpserted": 16217,
  "skippedRows": 0,
  "errors": 0,
  "warnings": 0,
  "durationMs": 41250
}
```

## Verifying the data

Open Prisma Studio and inspect the new rows:

```bash
pnpm --filter @supermarket-price-compare/db prisma:studio
```

Suggested checks:

- `IngestionRun` table — most recent row should have status `COMPLETED`.
- `IngestionFile` — your file with the right `sha256` + `sizeBytes`.
- `Retailer` — slug `shufersal` or `rami-levy` exists.
- `RetailerStore` — `externalStoreId = '413'` (or `'001-070'`).
- `RetailerProduct` count matches the CLI summary.
- `RetailerPrice` — exactly one row per product where `isCurrent = true`.

## Known limitations

- **Promotions and incremental updates are not yet implemented.** Only full
  price snapshots are imported.
- **Rami Levy TLS chain.** The upstream PublishedPrices server has an
  incomplete certificate chain that Node's TLS stack rejects. Use
  `INGESTION_INSECURE_TLS=1` until upstream fixes the chain.
- **No scheduling.** Ingestion runs are triggered manually. A future task can
  wire this into a cron / queue.
- **Online-store detection** uses simple keyword scoring on the Stores feed
  and is intentionally conservative; pass `--storeId` if the heuristic isn't
  confident enough for your retailer.
- **Idempotency** is via `upsert` keys + `updateMany(isCurrent=false)`, so
  re-running the same file refreshes prices without creating duplicates, but
  the previous price rows remain as history.

## Troubleshooting

| Symptom | Likely cause / fix |
| ------- | ------------------ |
| `Unknown retailer` | Pass `--retailer=shufersal` or `--retailer=rami-levy`. |
| `No PriceFull files found for store …` | The portal listing did not include a file matching the store id. The CLI prints the closest entries to help debug; pass a different `--storeId` or use `--localPriceFull`. |
| `fetch failed` / `unable to verify the first certificate` (Rami Levy) | Set `INGESTION_INSECURE_TLS=1`. |
| `PublishedPrices login rejected` | The session cookie was not issued. Make sure `INGESTION_INSECURE_TLS=1` is set when using Node 18+. The provider also writes the rejected page under `data/debug/<retailer>/`. |
| `No item rows could be extracted` | The XML schema changed. The decompressed XML is saved under `data/processed/<retailer>/` so you can inspect it; consider extending the field-name lists in `packages/ingestion/src/normalizers.ts`. |
