import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BasketComparisonApi } from '@/api/types';
import { ApiError, apiJson } from '@/lib/api-client';
import { useShoppingBagStore } from '@/stores/shopping-bag-store';

export function useBasketComparisonMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bagId: string) =>
      apiJson<BasketComparisonApi>(`/api/shopping-bags/${bagId}/compare`, { method: 'POST' }),
    onSuccess: (data) => {
      useShoppingBagStore.getState().rememberComparisonId(data.id);
      void qc.setQueryData(['basket-comparisons', data.id], data);
    },
  });
}

export function useBasketComparisonQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['basket-comparisons', id],
    queryFn: async () => {
      if (!id) return null;
      try {
        return await apiJson<BasketComparisonApi>(`/api/basket-comparisons/${id}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: Boolean(id),
  });
}
