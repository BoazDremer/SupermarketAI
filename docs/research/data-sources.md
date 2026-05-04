# Research: data sources (Israel)

Practical notes for engineers on **where** Israeli supermarket transparency data typically comes from and how we classify sources. This is **not legal advice**; pair with [Legal & data access](./legal-data-access.md).

---

## Published transparency ecosystems

### PublishedPrices / Cerberus-style portals

- **What**: Central or federated **published price** systems used by multiple chains or by regulation-driven disclosure.
- **Artifacts**: Often **ZIP** bundles containing **XML/CSV** per store or per chain; file naming varies.
- **Ingestion**: `PublishedPricesProvider` in `packages/ingestion` (stub today)—real implementation will parse index pages, download archives, validate checksums, and register `IngestionFile` rows.

### Chain-specific “dedicated” portals

- **What**: A retailer-hosted **open data** area (price full, promo full, store files).
- **Artifacts**: Frequently **XML**, sometimes **gzip**; update feeds may be smaller deltas.
- **Ingestion**: one provider class per family (e.g. Shufersal, Carrefour patterns) with shared utilities (XML, gzip, Hebrew text normalization).

### Matrix / Nibit-style portals

- **What**: Alternate commercial stacks feeding supermarkets; discovery and file layout differ from Cerberus.
- **Ingestion**: `MatrixNibitProvider`—keep **separate** from PublishedPrices to avoid one-off `if` spaghetti.

---

## Store feeds

- **Store master** files identify **branches** and often **online** storefronts.
- We use simple **heuristics** (Hebrew/English keywords, delivery flags) to pre-label likely **online delivery** branches; final rules should be validated per chain.

---

## Product vs price vs promo files

| Feed type | Typical use |
|-----------|-------------|
| **Stores** | Map `externalStoreId` → `RetailerStore`; delivery flags. |
| **Price full / updates** | Upsert `RetailerPrice` rows; maintain `isCurrent`. |
| **Promo full / updates** | Upsert `RetailerPromotion` + `RetailerPromotionItem`; retain `rawData`. |

---

## Local development

- **`packages/ingestion/fixtures/sample`**: tiny XML samples for parser smoke tests.
- **`pnpm ingest:fixture`**: writes processed JSON under `data/processed/ingestion/` for inspection.

---

## When adding a real chain

1. Capture a **full sample** of each feed type under `data/raw/<chain>/` (gitignored if large).
2. Document **file naming**, **encoding**, and **update cadence** in a short markdown under `docs/research/` if non-obvious.
3. Implement `RetailerIngestionProvider` methods incrementally; keep **raw** payloads until normalization is trustworthy.
