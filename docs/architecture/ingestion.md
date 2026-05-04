# Data ingestion

This document describes **how** we pull Israeli supermarket **price**, **promo**, and **store** data into our system in a **maintainable, auditable** way.

---

## 6. Data ingestion approach

### Goals

1. **Discover** which files exist for a chain (full price dump, promo dump, incremental updates, store master).
2. **Download** bytes reliably (respecting rate limits, TLS, and future auth if any).
3. **Parse** into **normalized parsed types** (`ParsedStore`, `ParsedRetailerProduct`, etc.—see `packages/ingestion/src/types.ts`).
4. **Persist** (later) via idempotent upserts into Prisma models—**not** implemented in the skeleton; the boundary is clear.

### Package layout

All ingestion code lives in **`packages/ingestion`**:

- **`RetailerIngestionProvider`** interface: `discover*`, `downloadFile`, `parse*` per feed type.
- **Providers**: `LocalFixtureProvider` (fully implemented for dev), stubs for dedicated portals, PublishedPrices/Cerberus-style, Matrix/Nibit-style.
- **Utilities**: gzip detection/decompression, SHA-256, XML parsing (`fast-xml-parser`), bilingual text normalization, “likely online store” heuristics, saving raw/processed files under `data/`.

### Provider families (Israel)

| Kind | Examples | Notes |
|------|-----------|--------|
| **Dedicated portal** | Chain-operated transparency pages | Often XML/JSON; custom discovery per chain. |
| **PublishedPrices / Cerberus** | Government-style published price portals | ZIP/XML patterns; multi-store. |
| **Matrix / Nibit** | Alternate portal stacks | Different HTML/index layout; separate provider class. |
| **Local fixtures** | `packages/ingestion/fixtures` | CI/dev without network. |

### Runs and files

- **`IngestionRun`**: one execution of the pipeline (status, timestamps, optional stats).
- **`IngestionFile`**: every downloaded artifact (path, hash, type, retailer), optionally linked to a run.

This gives **traceability**: “which file produced this price row?”

### Normalization vs raw

- **Raw** payloads stay in `rawData` JSON on promotions and often on products until we have mappers.
- **Normalized** columns (`normalizedName`, money fields, enums) are populated progressively so search and comparison stay usable.

---

## Operational commands

From `packages/ingestion`:

- `pnpm ingest:fixture` — build, run fixture ingest CLI, write processed JSON under `data/processed/ingestion/`.
- `pnpm detect:online-stores` — sample CLI for store heuristics.

---

## Related docs

- [Data model](./data-model.md) — where parsed rows land in Prisma.
- [Research: data sources](../research/data-sources.md) — portal landscape.
- [Development: getting started](../development/getting-started.md) — **adding a new retailer provider** (step-by-step).
