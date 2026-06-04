import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CategoryDirectChildSection } from '@/components/category-product-section/CategoryDirectChildSection';
import { ProductDetailsDialog } from '@/components/product-details-dialog/ProductDetailsDialog';
import { ProductGrid } from '@/components/product-grid/ProductGrid';
import { ProductSearchInput } from '@/components/product-search-input/ProductSearchInput';
import {
  useCategoryTreeQuery,
  useInfiniteProductSearchQuery,
  type CategoryTreeNodeApi,
} from '@/hooks/use-catalog-api';
import { useInfiniteScrollSentinel } from '@/hooks/use-infinite-scroll-sentinel';
import type { MockProduct } from '@/types/mock-product';

/** Find a node by id in a recursive tree, walking all depths. */
function findNodeById(
  roots: readonly CategoryTreeNodeApi[],
  id: string,
): { node: CategoryTreeNodeApi; ancestors: CategoryTreeNodeApi[] } | undefined {
  const stack: Array<{ node: CategoryTreeNodeApi; ancestors: CategoryTreeNodeApi[] }> = roots.map(
    (n) => ({ node: n, ancestors: [] }),
  );
  while (stack.length > 0) {
    const top = stack.pop()!;
    if (top.node.id === id) return top;
    for (const c of top.node.children) {
      stack.push({ node: c, ancestors: [...top.ancestors, top.node] });
    }
  }
  return undefined;
}

type Selection =
  | { kind: 'node'; node: CategoryTreeNodeApi }
  | { kind: 'none' };

function resolveCategorySelection(
  category: string | undefined,
  roots: readonly CategoryTreeNodeApi[],
): Selection {
  if (!category) return { kind: 'none' };
  const hit = findNodeById(roots, category);
  if (hit) return { kind: 'node', node: hit.node };
  return { kind: 'none' };
}

export function ProductSearchPage() {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language?.startsWith('he') ?? false;
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const retailerId = params.get('retailerId') ?? undefined;
  const category = params.get('category') ?? undefined;

  const { data: categoryTree } = useCategoryTreeQuery();
  const groups = categoryTree?.groups ?? [];
  const selection = resolveCategorySelection(category, groups);

  /** Parent category with direct children: one paginated fetch per sub-category. */
  const useGroupedSections =
    selection.kind === 'node' &&
    selection.node.children.length > 0 &&
    q.trim().length === 0;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteProductSearchQuery(q, retailerId, category, 24, {
    enabled: !useGroupedSections,
  });

  const products = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? 0;

  const { sentinelRef } = useInfiniteScrollSentinel({
    enabled: !useGroupedSections && Boolean(hasNextPage) && !isFetchingNextPage && !isLoading,
    onIntersect: () => {
      void fetchNextPage();
    },
  });

  const [dialogProductId, setDialogProductId] = useState<string | null>(null);

  function openDetails(p: MockProduct) {
    setDialogProductId(p.id);
  }

  const sectionChildren =
    useGroupedSections && selection.kind === 'node' ? selection.node.children : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('search.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('search.subtitle')}</p>
      </div>
      <ProductSearchInput key={q} defaultValue={q} />
      {useGroupedSections ? (
        <div className="space-y-8">
          {sectionChildren.map((child, index) => (
            <CategoryDirectChildSection
              key={child.id}
              child={child}
              title={isHebrew ? child.nameHe : child.nameEn}
              retailerId={retailerId}
              loadImmediately={index === 0}
              onOpenDetails={openDetails}
            />
          ))}
        </div>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">{t('search.loadingProducts')}</p>
      ) : (
        <>
          <ProductGrid products={products} onOpenDetails={openDetails} />
          {products.length > 0 && (
            <div className="flex flex-col items-center gap-2 pb-2 pt-4 text-sm text-muted-foreground">
              <span>
                {t('search.showingCount', { shown: products.length, total })}
              </span>
              {hasNextPage ? (
                <span aria-live="polite">
                  {isFetchingNextPage ? t('search.loadingMore') : '\u00a0'}
                </span>
              ) : (
                <span>{t('search.endOfList')}</span>
              )}
              <div ref={sentinelRef} aria-hidden="true" className="h-1 w-full" />
            </div>
          )}
        </>
      )}
      <ProductDetailsDialog
        productId={dialogProductId}
        open={dialogProductId !== null}
        onOpenChange={(open) => {
          if (!open) setDialogProductId(null);
        }}
      />
    </div>
  );
}
