/**
 * The fixture-based seed has been retired. The application now relies
 * exclusively on data ingested via the `pnpm ingest:prices` CLI, and the
 * fixture rows previously inserted here have been removed from the DB by
 * `pnpm --filter @supermarket-price-compare/db db:cleanup-fixtures`.
 *
 * This stub is kept so that any tooling still pointing at `prisma db seed`
 * fails fast with an explanatory message instead of silently re-introducing
 * fixtures.
 */
console.log(
  [
    'Fixture seed has been retired.',
    '',
    'The application now reads only data ingested through the retailer',
    'price files. To populate the database, run:',
    '',
    '  pnpm ingest:prices -- --retailer=shufersal',
    '  pnpm ingest:prices -- --retailer=rami-levy',
    '',
    'See docs/development/ingesting-real-prices.md for the full guide.',
  ].join('\n'),
);

process.exit(0);
