import { useMutation, useQuery } from '@tanstack/react-query';
import { mockGetIngestionRun, mockListIngestionRuns, mockStartIngestionRun } from '@/api/mock-queries';

export function useIngestionRunsQuery() {
  return useQuery({
    queryKey: ['ingestion', 'runs'],
    queryFn: () => mockListIngestionRuns(),
  });
}

export function useIngestionRunQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['ingestion', 'runs', id],
    queryFn: () => (id ? mockGetIngestionRun(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useStartIngestionRunMutation() {
  return useMutation({
    mutationFn: () => mockStartIngestionRun(),
  });
}
