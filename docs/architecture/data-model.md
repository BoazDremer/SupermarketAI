# Data model

Implementation-oriented view of how entities relate in **supermarket-price-compare**. Authoritative shapes for API/validation live in `packages/shared`; persistence in `packages/db/prisma/schema.prisma`.

---

## 7. Why separate `RetailerProduct` from `CanonicalProduct`?

**`RetailerProduct`** is the **row exactly as the chain published it** for a given store context: chain SKU, display name, pack text, optional barcode, and opaque `rawData` from the feed. It is **not** stable across chains and may duplicate the “same” item under different codes or naming.

**`CanonicalProduct`** is **our** normalized catalog identity: display name, optional GTIN, category hints, etc. It is what we use for:

- **User bag lines** when the user picks “milk 3% 1L” generically rather than a chain SKU.
- **Cross-retailer comparison** of “the same intent” (with explicit substitute paths when needed).

Separating the two avoids conflating **chain truth** with **our ontology**. Ingestion and matching pipelines **bridge** them via `ProductMatch`.

---

## Core entities (conceptual)

| Model | Purpose |
|--------|---------|
| `Retailer` | Chain metadata, slug, delivery scope flags. |
| `RetailerStore` | Branch / online storefront; `externalStoreId` from chain. |
| `RetailerProduct` | Published product row per retailer + store + external item code. |
| `RetailerPrice` | Price observation; supports history + `isCurrent` for latest lookup. |
| `RetailerPromotion` / `RetailerPromotionItem` | Promo header + line items; `rawData` for chain-specific payloads. |
| `CanonicalProduct` | Internal normalized product. |
| `ProductMatch` | Edge: `retailerProduct` → `canonicalProduct` with match metadata. |
| `ShoppingBag` / `ShoppingBagItem` | User bag; item may reference canonical and/or raw retailer product (MVP flexibility). |
| `BasketComparison*` | Snapshot: per-retailer totals, ranks, missing/substitution lists, line-level resolutions. |
| `IngestionRun` / `IngestionFile` | Audit trail for downloads and pipeline executions. |

Money is stored in **minor units** (e.g. agorot) with **ILS** in the schema to avoid float drift.

---

## 8. How product matching will work

Matching is modeled as `ProductMatch` with a **`matchType`** and a **confidence** score (0–1). Three primary strategies:

### Exact barcode (`EXACT_BARCODE`)

- **When**: Retailer-published GTIN/barcode matches our canonical barcode (or another retailer’s product we already trust).
- **Confidence**: Typically **1.0** after normalization (leading zeros, GTIN-14 vs EAN-13 rules).
- **Use**: Preferred tie-break and cheapest comparison path when data quality allows.

### Equivalent (`EQUIVALENT`)

- **When**: Same consumer intent without identical barcode—e.g. same brand/size/pack from the same manufacturer, or a controlled taxonomy match.
- **Confidence**: **< 1**, tuned by rules + optional human review queue later.
- **Use**: Still treated as “same line” for basket fulfillment, but surfaced honestly in UI.

### Substitute (`SUBSTITUTE`)

- **When**: No equivalent; we pick a **best-effort** product (category + attributes + price band heuristics, later ML/rules).
- **Confidence**: Variable; must be **visible** in comparison line results.
- **Use**: Counts toward **substitution** metrics and user messaging; may affect “fairness” disclaimers.

**Implementation path**: start with **barcode + manual mapping table**, expand to **rules per category**, then **scoring** and optional review tooling—not in MVP day one, but the **data model and APIs** already reserve the fields.

---

## JSON and raw fields

- **`rawData` / `rawMetadata`**: Preserve chain-specific structures for debugging, re-parsing, and gradual normalization without losing source fidelity.

---

## Related docs

- [Ingestion](./ingestion.md) — how feeds become `RetailerProduct` / prices / promos.
- [Basket comparison](./basket-comparison.md) — how matches feed comparison snapshots.
