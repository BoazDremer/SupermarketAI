# Getting started (local development)

Practical steps to run **supermarket-price-compare** on your machine.

---

## 11. How to run the project locally

### Prerequisites

- **Node.js** ≥ 18.18 (Node 20+ recommended).
- **pnpm** via Corepack:

  ```bash
  corepack enable
  corepack prepare pnpm@9.15.4 --activate
  ```

- **PostgreSQL** (optional for API/Prisma until you run migrations and hit DB-backed routes). SQLite is **not** configured; Prisma targets PostgreSQL.

### Install

From the **repository root**:

```bash
pnpm install
```

### Environment

- **API**: copy `apps/api/.env.example` → `apps/api/.env` and set at least `DATABASE_URL` when using Prisma-backed features.
- **DB package**: copy `packages/db/.env.example` for Prisma CLI (`migrate`, `studio`).
- **CORS**: `apps/api` reads `CORS_ORIGINS` (comma-separated); default in `.env.example` includes `http://localhost:5173`.

### Common scripts (root `package.json`)

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Builds `shared`, runs `db generate`, then **web + API + shared watch** concurrently. |
| `pnpm dev:web` | One-off `shared` build, then Vite on **http://localhost:5173**. |
| `pnpm dev:api` | One-off `shared` build, then Nest on **http://localhost:4000** (`/api` prefix). |
| `pnpm build` | Workspace build order: `shared` → `db` → `ingestion` → `web` → `api`. |
| `pnpm lint` / `pnpm format` / `pnpm typecheck` | Repo-wide quality gates. |

### First-time Prisma (when you add schema migrations)

```bash
cd packages/db
pnpm prisma:migrate   # creates/applies migrations — needs DATABASE_URL
pnpm db:seed          # upserts fixture catalog data into PostgreSQL
pnpm prisma:studio    # optional DB GUI
```

You can also run from repository root:

```bash
pnpm --filter @supermarket-price-compare/db prisma:migrate
pnpm --filter @supermarket-price-compare/db db:seed
```

Until Postgres is up, the API **still starts**; Prisma connection failures are logged and stub routes continue to work.

### Ingestion fixtures (no DB)

```bash
pnpm --filter @supermarket-price-compare/ingestion ingest:fixture
pnpm --filter @supermarket-price-compare/ingestion detect:online-stores
```

### Real-price ingestion (PostgreSQL required)

```bash
# Shufersal: online store 413 (שופרסל ONLINE)
pnpm ingest:prices -- --retailer=shufersal

# Rami Levy: online store 039 (PublishedPrices/Cerberus)
INGESTION_INSECURE_TLS=1 pnpm ingest:prices -- --retailer=rami-levy
```

See [docs/development/ingesting-real-prices.md](./ingesting-real-prices.md)
for flags, troubleshooting, and the full list of DB writes performed.

---

## 12. How to add a new retailer provider

### 1. Choose a provider class

Under `packages/ingestion/src/providers/`:

- **Dedicated portal** → extend `BaseRetailerIngestionProvider` in a new file (e.g. `acme-provider.ts`).
- **PublishedPrices-style** → extend or compose with `PublishedPricesProvider` patterns.
- **Matrix/Nibit-style** → use `MatrixNibitProvider` as a template or sibling class.

`BaseRetailerIngestionProvider` throws `IngestionNotImplementedError` until you override methods—copy from **`LocalFixtureProvider`** as a working reference.

### 2. Implement the interface

For each method, decide behavior:

| Method | Implementation notes |
|--------|----------------------|
| `discover*Files` | HTTP directory listing, index JSON, or hard-coded manifest—return `DiscoveredRetailerFile[]`. |
| `downloadFile` | Return raw `Buffer`; respect gzip vs plain XML. |
| `parse*` | Use `parseXmlToObject` + small mappers; push chain quirks into helpers, not giant functions. |

Add **fixture XML** under `packages/ingestion/fixtures/<retailerKey>/` early so CI can run without calling production hosts.

### 3. Register the retailer

In `packages/ingestion/src/retailer-sources.ts`:

- Add an entry to **`RETAILER_SOURCE_REGISTRY`** (label + `providerKind`).
- Extend **`createRetailerIngestionProvider()`** `switch` to return your class with `IngestionProviderConfig` (`retailerKey`, optional `baseUrl`, timeouts).

### 4. Wire persistence (later)

- Map parsed rows → Prisma upserts in a worker or `apps/api` ingestion module.
- Record **`IngestionRun`** / **`IngestionFile`** rows for each batch.

### 5. Document

- Add a short chain note under `docs/research/data-sources.md` (feed URLs, cadence, quirks).
- If legal/contractual constraints exist, cross-link `docs/research/legal-data-access.md`.

---

## Web app

```bash
pnpm --filter @supermarket-price-compare/web dev
```

Vite proxies `/api` to the Nest server when both run.

---

## Further reading

- [Architecture overview](../architecture/overview.md)
- [Ingestion architecture](../architecture/ingestion.md)
- [Data model](../architecture/data-model.md)
