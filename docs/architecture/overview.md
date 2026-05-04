# Architecture overview

This document orients engineers and stakeholders on **supermarket-price-compare**: an Israel-focused web app that compares **delivery** supermarket baskets across chains, including **promotions**, with transparent **substitutions** and a **checkout handoff** in MVP.

For deeper dives, see:

- [Data model](./data-model.md)
- [Ingestion](./ingestion.md)
- [Basket comparison](./basket-comparison.md)

---

## 1. Product assumptions

- **Geography**: Israel only; chains, prices, and promos are Israeli retail context.
- **Channels**: Online supermarkets that support **home delivery** (no in-store-only chains in MVP scope unless they publish comparable transparency feeds).
- **User journey**: The user builds a **shopping bag** in our app; we compute the **cheapest equivalent basket** (or ranked alternatives) across participating retailers.
- **Substitutions**: Each line can show **how** the item was fulfilled (exact barcode, equivalent product, substitute) and confidence where relevant.
- **Promotions**: **Included from day one** in comparison logic and UX messaging (even when ingestion is still maturing per chain).
- **Price freshness**: Ingestion runs on chain-published files; “current” price semantics are defined in the data model and DB (see [Data model](./data-model.md)).
- **No branch-vs-branch** within the same chain in MVP (single comparable “basket” per retailer/store context we choose for comparison).

---

## 2. MVP scope

- **Responsive web app** (mobile-first UI in `apps/web`).
- **Monorepo** with shared types, DB package, API, ingestion package, and web client (see below).
- **Catalog + prices + promos** ingested from **lawful transparency sources** and chain portals where we have a clear ingestion path.
- **Basket comparison** end-to-end in product terms: bag → normalized lines → per-retailer fulfillment → ranked totals with savings and missing/substitution summaries (implementation may start stubbed, then wire to DB/API).
- **Checkout**: **Handoff / redirect** to the retailer’s own checkout (no automated checkout in MVP).

---

## 3. Out of scope for MVP

- **Price history** and time-series analytics.
- **Local branch** comparison (e.g. “this branch vs that branch” inside one chain).
- **Automated server-side checkout** or cart injection without explicit legal/product approval.
- **Authentication** (planned later for saved bags, accounts, etc.).
- **Full normalization** of every chain’s promo semantics on day one (we ingest raw payloads and iterate).

---

## 4. Monorepo structure

| Path | Role |
|------|------|
| `apps/web` | React + Vite + TypeScript; UI, TanStack Query, Zustand; consumes API when wired. |
| `apps/api` | NestJS API; modules for health, retailers, products, bags, comparison, ingestion; Prisma via `packages/db`. |
| `packages/shared` | Zod schemas and TypeScript types for domain DTOs shared by API, web, and ingestion. |
| `packages/db` | Prisma schema + PostgreSQL; migrations; `getPrismaClient()` export. |
| `packages/ingestion` | Provider-based ingestion: discovery, download, parse; fixtures for dev; no DB writes required in skeleton. |
| `data/raw` / `data/processed` | Optional local landing zones for raw feeds and processed JSON (gitignored heavy files; `.gitkeep` preserves dirs). |
| `docs/` | Architecture, research, and development docs (this tree). |

Cross-package rules of thumb:

- **Domain shape** lives in `packages/shared` first, then **Prisma** models align (IDs, money in minor units, JSON for chain-specific blobs).
- **Ingestion** outputs normalized **parsed** rows that later map into Prisma upserts—not the other way around.

---

## 5. Tech stack

| Layer | Choice |
|------|--------|
| **Language** | TypeScript everywhere. |
| **Web** | React 19, Vite 6, Tailwind, shadcn-style Radix UI, React Router, TanStack Query, Zustand. |
| **API** | NestJS 10, `ConfigModule`, `ValidationPipe`, global exception filter, CORS for local Vite. |
| **Data** | PostgreSQL + Prisma (`packages/db`). |
| **Ingestion** | Node; `fast-xml-parser`; gzip helpers; provider interface per retailer/portal family. |
| **Tooling** | pnpm workspaces, ESLint + Prettier, root scripts: `dev`, `dev:web`, `dev:api`, `build`, `lint`, `format`, `typecheck`. |

---

## 6–10. Pointers

- **Ingestion approach** (feeds, providers, runs): [Ingestion](./ingestion.md).
- **RetailerProduct vs CanonicalProduct** and matching: [Data model](./data-model.md) and [Basket comparison](./basket-comparison.md).
- **Basket comparison flow**: [Basket comparison](./basket-comparison.md).
- **Checkout strategy and legal posture**: [Legal & data access](../research/legal-data-access.md) and [Getting started](../development/getting-started.md) for local runbook.

---

## Revision discipline

When behavior changes (e.g. new provider, new comparison rule), update:

1. The relevant doc under `docs/architecture/` or `docs/development/`.
2. `packages/shared` schemas if the contract changes.
3. Prisma migrations if persistence changes.

Keep docs **close to code**: prefer short, accurate sections over marketing copy.
