import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ShoppingBagApi } from '@/api/types';
import { ApiError, apiJson } from '@/lib/api-client';
import { useShoppingBagStore } from '@/stores/shopping-bag-store';

/**
 * The API stores shopping bags in-memory (fixture mode), so any API
 * restart wipes existing bags. The frontend, however, persists the
 * active bag id in localStorage. To avoid getting stuck on a stale id
 * we transparently recover from 404s by recreating the bag.
 */
async function createBagOnServer(): Promise<ShoppingBagApi> {
  return apiJson<ShoppingBagApi>('/api/shopping-bags', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

async function ensureFreshBagId(
  setServerBagId: (id: string | null) => void,
): Promise<string> {
  const current = useShoppingBagStore.getState().serverBagId;
  if (current) {
    try {
      const bag = await apiJson<ShoppingBagApi>(`/api/shopping-bags/${current}`);
      return bag.id;
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 404) throw err;
    }
  }
  const created = await createBagOnServer();
  setServerBagId(created.id);
  return created.id;
}

export function useShoppingBagQuery() {
  const bagId = useShoppingBagStore((s) => s.serverBagId);
  const setServerBagId = useShoppingBagStore((s) => s.setServerBagId);

  return useQuery({
    queryKey: ['shopping-bag', bagId],
    enabled: Boolean(bagId),
    queryFn: async () => {
      try {
        return await apiJson<ShoppingBagApi>(`/api/shopping-bags/${bagId!}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setServerBagId(null);
        }
        throw err;
      }
    },
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 404) return false;
      return failureCount < 1;
    },
  });
}

export function useShoppingBagLineCount(): number {
  const { data } = useShoppingBagQuery();
  return data?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;
}

export function useAddBagItemMutation() {
  const qc = useQueryClient();
  const setServerBagId = useShoppingBagStore((s) => s.setServerBagId);

  return useMutation({
    mutationFn: async (input: { canonicalProductId: string; quantity: number }) => {
      const postItem = (bagId: string) =>
        apiJson(`/api/shopping-bags/${bagId}/items`, {
          method: 'POST',
          body: JSON.stringify({
            canonicalProductId: input.canonicalProductId,
            quantity: input.quantity,
          }),
        });

      let id = await ensureFreshBagId(setServerBagId);
      try {
        await postItem(id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          const fresh = await createBagOnServer();
          setServerBagId(fresh.id);
          id = fresh.id;
          await postItem(id);
        } else {
          throw err;
        }
      }
      return apiJson<ShoppingBagApi>(`/api/shopping-bags/${id}`);
    },
    onSuccess: (bag) => {
      setServerBagId(bag.id);
      qc.setQueryData(['shopping-bag', bag.id], bag);
      void qc.invalidateQueries({ queryKey: ['shopping-bag', bag.id] });
    },
  });
}

export function useUpdateBagItemMutation() {
  const qc = useQueryClient();
  const setServerBagId = useShoppingBagStore((s) => s.setServerBagId);

  return useMutation({
    mutationFn: async (input: { itemId: string; quantity: number }) => {
      const id = useShoppingBagStore.getState().serverBagId;
      if (!id) throw new Error('No shopping bag');
      try {
        await apiJson(`/api/shopping-bags/${id}/items/${input.itemId}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity: input.quantity }),
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setServerBagId(null);
        }
        throw err;
      }
    },
    onSuccess: () => {
      const id = useShoppingBagStore.getState().serverBagId;
      if (id) void qc.invalidateQueries({ queryKey: ['shopping-bag', id] });
    },
  });
}

export function useRemoveBagItemMutation() {
  const qc = useQueryClient();
  const setServerBagId = useShoppingBagStore((s) => s.setServerBagId);

  return useMutation({
    mutationFn: async (itemId: string) => {
      const id = useShoppingBagStore.getState().serverBagId;
      if (!id) throw new Error('No shopping bag');
      try {
        await apiJson(`/api/shopping-bags/${id}/items/${itemId}`, { method: 'DELETE' });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setServerBagId(null);
        }
        throw err;
      }
    },
    onSuccess: () => {
      const id = useShoppingBagStore.getState().serverBagId;
      if (id) void qc.invalidateQueries({ queryKey: ['shopping-bag', id] });
    },
  });
}

export function useClearShoppingBagMutation() {
  const qc = useQueryClient();
  const setServerBagId = useShoppingBagStore((s) => s.setServerBagId);

  return useMutation({
    mutationFn: async () => {
      const bagId = useShoppingBagStore.getState().serverBagId;
      if (!bagId) return;
      try {
        const bag = await apiJson<ShoppingBagApi>(`/api/shopping-bags/${bagId}`);
        await Promise.all(
          bag.items.map((i) =>
            apiJson(`/api/shopping-bags/${bagId}/items/${i.id}`, { method: 'DELETE' }),
          ),
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setServerBagId(null);
          return;
        }
        throw err;
      }
    },
    onSuccess: () => {
      const id = useShoppingBagStore.getState().serverBagId;
      if (id) void qc.invalidateQueries({ queryKey: ['shopping-bag', id] });
    },
  });
}
