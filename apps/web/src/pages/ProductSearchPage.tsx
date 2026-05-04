import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ProductDetailsDialog } from '@/components/product-details-dialog/ProductDetailsDialog';
import { ProductGrid } from '@/components/product-grid/ProductGrid';
import { ProductSearchInput } from '@/components/product-search-input/ProductSearchInput';
import { useInfiniteProductSearchQuery } from '@/hooks/use-catalog-api';
import { useInfiniteScrollSentinel } from '@/hooks/use-infinite-scroll-sentinel';
import type { MockProduct } from '@/types/mock-product';

export function ProductSearchPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const retailerId = params.get('retailerId') ?? undefined;
  const category = params.get('category') ?? undefined;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteProductSearchQuery(q, retailerId, category, 24);

  const products = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? 0;

  const { sentinelRef } = useInfiniteScrollSentinel({
    enabled: Boolean(hasNextPage) && !isFetchingNextPage && !isLoading,
    onIntersect: () => {
      void fetchNextPage();
    },
  });

  const [dialogProductId, setDialogProductId] = useState<string | null>(null);

  function openDetails(p: MockProduct) {
    setDialogProductId(p.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('search.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('search.subtitle')}</p>
      </div>
      <ProductSearchInput key={q} defaultValue={q} />
      {isLoading ? (
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
