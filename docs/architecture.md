# Architecture (placeholder)

This document will describe the high-level architecture of **supermarket-price-compare**: an Israel-only, mobile-first web app that compares delivery baskets across Israeli online supermarket chains, including promotions and substitution visibility, with checkout handoff (not automated checkout) in later phases.

## Planned sections

- **System context**: users, chains, data sources, and external redirects.
- **Monorepo layout**: `apps/web`, `apps/api`, `packages/shared`, `packages/db`, `packages/ingestion`, and how they interact.
- **Data flow**: raw chain feeds under `data/raw`, normalized artifacts under `data/processed`, ingestion pipeline responsibilities, and API read models.
- **MVP boundaries**: no branch-level comparison, no price history; promotion-aware basket comparison from day one.

Details will be filled in as the design solidifies.
