import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { CatalogProduct } from '@/api/types';
import type { MockSubstitution } from '@/types/mock-product';
import { apiJson } from '@/lib/api-client';

type SearchResponse = {
  items: CatalogProduct[];
  total: number;
  /** Echoed back so the infinite-query hook knows where it landed. */
  offset?: number;
  limit?: number;
};

type SubstitutionsResponse = { productId: string; substitutes: MockSubstitution[] };

export type RetailerListItem = {
  id: string;
  slug: string;
  displayName: string;
  displayNameHe?: string;
  supportsDelivery: boolean;
  isActive: boolean;
};

export function useProductSearchQuery(q: string, retailerId?: string, category?: string) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (retailerId) params.set('retailerId', retailerId);
  if (category) params.set('category', category);
  const qs = params.toString();
  const path = qs ? `/api/products/search?${qs}` : '/api/products/search';
  return useQuery({
    queryKey: ['products', 'search', q, retailerId ?? '', category ?? ''],
    queryFn: () => apiJson<SearchResponse>(path),
  });
}

/**
 * Paginated product search for infinite-scroll lists. Each page returns
 * `pageSize` items; the hook consumer flattens `data.pages` into a single
 * list and uses `fetchNextPage` from TanStack Query when the bottom-of-list
 * sentinel comes into view.
 */
export function useInfiniteProductSearchQuery(
  q: string,
  retailerId?: string,
  category?: string,
  pageSize = 24,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  return useInfiniteQuery<SearchResponse>({
    queryKey: ['products', 'search-infinite', q, retailerId ?? '', category ?? '', pageSize],
    enabled,
    queryFn: ({ pageParam }) => {
      const offset = typeof pageParam === 'number' ? pageParam : 0;
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (retailerId) params.set('retailerId', retailerId);
      if (category) params.set('category', category);
      params.set('limit', String(pageSize));
      params.set('offset', String(offset));
      return apiJson<SearchResponse>(`/api/products/search?${params.toString()}`);
    },
    initialPageParam: 0,
    getNextPageParam: (last, allPages) => {
      const fetched = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return fetched < last.total ? fetched : undefined;
    },
  });
}

export function useProductQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: () => (id ? apiJson<CatalogProduct>(`/api/products/${id}`) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useRetailersListQuery() {
  return useQuery({
    queryKey: ['retailers', 'list'],
    queryFn: () => apiJson<RetailerListItem[]>('/api/retailers'),
  });
}

export function useProductSubstitutionsQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'substitutions', id],
    queryFn: () =>
      id ? apiJson<SubstitutionsResponse>(`/api/products/${id}/substitutions`) : Promise.resolve(null),
    enabled: Boolean(id),
  });
}

/**
 * Public category node — recursive, up to 3 depths deep. Top-level
 * "departments" carry the icon; intermediate "categories" may have their own
 * `children` (sub-categories that are the actual shopper filters).
 */
export type CategoryTreeNodeApi = {
  id: string;
  nameHe: string;
  nameEn: string;
  icon: string | null;
  parentId: string | null;
  isLeaf: boolean;
  children: CategoryTreeNodeApi[];
};

/** Back-compat aliases — same shape as `CategoryTreeNodeApi`. */
export type CategoryTreeLeafApi = CategoryTreeNodeApi;
export type CategoryTreeGroupApi = CategoryTreeNodeApi;

export type CategoryTreeApi = {
  groups: CategoryTreeNodeApi[];
  lastUpdatedAt: string | null;
};

export function useCategoryTreeQuery() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => apiJson<CategoryTreeApi>('/api/categories/tree'),
    // Tree is essentially static within a session; cache aggressively.
    staleTime: 1000 * 60 * 30,
  });
}
