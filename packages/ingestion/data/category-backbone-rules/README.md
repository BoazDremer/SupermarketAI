# Category backbone internal rules

Hand-curated corrections applied **after** RL-based tree generation and **on top of** `RAW_COMMON_BACKBONE` in `backbone.ts`, before auto `/general` leaves are added.

## Files

| File | Department |
|------|------------|
| `dept-פירות-וירקות.json` | Fruits & vegetables (`dept/פירות-וירקות`) |
| `dept-חלב-ביצים-וסלטים.json` | Dairy, eggs & salads (`dept/חלב-ביצים-וסלטים`) |

Each JSON file lists:

- `skipAutoGeneralUnder` — groups that must not get a synthetic `…/general` leaf
- `productCategoryIdRemaps` — exact `commonCategoryId` migrations for existing DB rows
- `productCategoryIdPrefixRemaps` — prefix migrations (deleted subtree → new leaf)
- `rules` — human-readable summary (the executable patch lives in `apply-backbone-rules.ts`)

## Pipeline (run from repo root)

After editing rules or `backbone.ts`:

```bash
# 1. Rebuild common.json + DB categories + aliases (uses backbone.ts + rules)
pnpm --filter @supermarket-price-compare/ingestion scrape:categories -- --no-network

# 2. Re-assign every canonical product to backbone leaves (applies remaps + new aliases)
pnpm --filter @supermarket-price-compare/ingestion map:products -- --overwrite
```

Optional — regenerate proposed tree from RL JSON, then rules are applied automatically:

```bash
pnpm --filter @supermarket-price-compare/ingestion generate:rl-based-common-tree
# Review data/processed/categories/common.proposed.json, then promote into backbone.ts if needed
```

Restart the API after `scrape:categories` so the app serves the updated category tree.

## Troubleshooting

**`common.json` still shows the old tree** — check the top-level `builtAt` timestamp. If it did not change, `scrape:categories` did not complete successfully (or you are viewing a stale editor buffer — reload the file).

After a successful run you should see console lines like:

```
[backbone-rules] after patch, dept/פירות-וירקות/פירות leaves: פירות-טריים, פירות-יבשים
Wrote .../common.json (builtAt=2026-...)
```

**The app UI still shows the old tree** — the web app reads from **Postgres**, not `common.json`. `scrape:categories` must run with `DATABASE_URL` set (default `--persist=db`). If you see `[persist] DATABASE_URL not set; skipping DB upsert`, the file updated but the database did not.

`map:products` alone does **not** change the category tree — run `scrape:categories` first.
