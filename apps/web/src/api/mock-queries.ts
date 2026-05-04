function delay<T>(value: T, ms = 280): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export type MockIngestionRun = {
  id: string;
  status: string;
  startedAt: string;
  retailerKey?: string;
};

export async function mockListIngestionRuns(): Promise<MockIngestionRun[]> {
  return delay([
    {
      id: 'ing_101',
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 3_600_000).toISOString(),
      retailerKey: 'freshmarket',
    },
    {
      id: 'ing_102',
      status: 'RUNNING',
      startedAt: new Date(Date.now() - 120_000).toISOString(),
      retailerKey: 'citycart',
    },
  ]);
}

export async function mockStartIngestionRun(): Promise<MockIngestionRun> {
  return delay({
    id: `ing_${Math.random().toString(36).slice(2, 10)}`,
    status: 'COMPLETED',
    startedAt: new Date().toISOString(),
    retailerKey: 'all',
  });
}

export async function mockGetIngestionRun(id: string): Promise<MockIngestionRun | null> {
  const all = await mockListIngestionRuns();
  return delay(all.find((r) => r.id === id) ?? null);
}
