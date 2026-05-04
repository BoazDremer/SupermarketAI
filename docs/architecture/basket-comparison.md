# Basket comparison

How we turn a **user shopping bag** into **ranked retailer baskets** with **promotions**, **substitutions**, and **missing** line transparency.

---

## 9. How basket comparison will work

### Inputs

- **`ShoppingBag` + `ShoppingBagItem`**: each line has a quantity and ideally a **`canonicalProductId`**. Early MVP may still reference a **`retailerProductId`** when the user picked a chain-specific SKU first.
- **Current prices** (`RetailerPrice` with `isCurrent` or effective window) and **active promotions** (`RetailerPromotion` + items) per **retailer + store** context we choose for delivery comparison.

### Pipeline (conceptual)

1. **Resolve lines**  
   For each bag line, determine the **canonical** anchor (or infer from raw retailer product).

2. **Fulfill per retailer**  
   For each target retailer (and comparison store):

   - Find **retailer product** via `ProductMatch` (`EXACT_BARCODE` → `EQUIVALENT` → `SUBSTITUTE`).
   - Price the line using **current price** + applicable **promo rules** (MVP: start with simple promo attribution; grow to chain-specific engines).
   - Emit a **`BasketComparisonItemResult`**: resolution (`EXACT_BARCODE` / `EQUIVALENT` / `SUBSTITUTE` / `MISSING`), optional `matchType`, chosen SKU, line subtotals before/after promo.

3. **Aggregate**  
   Build **`BasketComparisonRetailerResult`** per retailer:

   - **Totals** in minor units: `total`, `totalBeforePromotions`, `promotionSavings`.
   - **Counts**: exact / equivalent / substitute matches.
   - **Lists**: `missingShoppingBagItemIds`, `substitutedShoppingBagItemIds`.
   - **Confidence** score for the basket construction (data completeness + match quality).
   - **`rank`**: sort by total ascending (ties broken by policy: fewer missing, higher confidence).

4. **Snapshot**  
   Persist a **`BasketComparison`** record with `comparedAt` and optional `overallConfidenceScore` so the user can revisit results without re-running the engine.

### UX contract (web)

- **Compare** action sends bag id (later) or serialized bag to API.
- Response drives **table + cards**: `BasketComparisonTable`, `RetailerComparisonCard`, `SavingsSummaryCard`, `MissingItemsList`, `SubstitutionOptionsList`.

### What is explicitly **not** in MVP logic yet

- Full **promo combinatorics** (multi-buy ladders, coupons, loyalty-only)—schema and `rawData` are ready; rules are iterative.
- **Price history**—not used for comparison.

---

## Alignment with shared types

Domain DTOs for comparison snapshots live in **`packages/shared`** (`BasketComparison*`, enums). API responses and future workers should **reuse** those shapes to avoid drift.

---

## Related docs

- [Data model](./data-model.md) — entities and matching enums.
- [Legal & data access](../research/legal-data-access.md) — checkout handoff vs automation.
