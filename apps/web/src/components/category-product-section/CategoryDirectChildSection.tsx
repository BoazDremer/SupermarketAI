import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ProductGrid } from '@/components/product-grid/ProductGrid';
import {
  useInfiniteProductSearchQuery,
  type CategoryTreeNodeApi,
} from '@/hooks/use-catalog-api';
import { useInfiniteScrollSentinel } from '@/hooks/use-infinite-scroll-sentinel';
import { useSectionVisible } from '@/hooks/use-section-visible';
import type { MockProduct } from '@/types/mock-product';

type CategoryDirectChildSectionProps = {
  child: CategoryTreeNodeApi;
  title: string;
  retailerId?: string;
  /** When false, the section header is shown but products are not fetched yet. */
  loadImmediately: boolean;
  onOpenDetails: (product: MockProduct) => void;
};

/**
 * One sub-category block on a parent category page. Fetches and paginates
 * products scoped to `child.id` only, so the first screenful belongs to the
 * visible section instead of a global parent-category page mix.
 */
export function CategoryDirectChildSection({
  child,
  title,
  retailerId,
  loadImmediately,
  onOpenDetails,
}: CategoryDirectChildSectionProps) {
  const { t } = useTranslation();
  const { sectionRef, isVisible } = useSectionVisible({
    initiallyVisible: loadImmediately,
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isFetched,
  } = useInfiniteProductSearchQuery('', retailerId, child.id, 24, {
    enabled: isVisible,
  });

  const products = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? 0;

  const { sentinelRef } = useInfiniteScrollSentinel({
    enabled: isVisible && Boolean(hasNextPage) && !isFetchingNextPage && !isLoading,
    onIntersect: () => {
      void fetchNextPage();
    },
  });

  if (isFetched && total === 0) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby={`section-${child.id}`}
      className="space-y-3"
    >
      <header className="flex items-baseline justify-between border-b pb-2">
        <h2
          id={`section-${child.id}`}
          className="text-lg font-semibold tracking-tight"
        >
          {title}
        </h2>
        {isFetched && (
          <span className="text-xs text-muted-foreground">
            {t('search.sectionCount', { count: total })}
          </span>
        )}
      </header>

      {isVisible &&
        (isLoading ? (
          <p className="text-sm text-muted-foreground">{t('search.loadingProducts')}</p>
        ) : (
          <>
            <ProductGrid products={products} onOpenDetails={onOpenDetails} />
            {hasNextPage && (
              <div className="flex flex-col items-center gap-1 py-2 text-sm text-muted-foreground">
                <span aria-live="polite">
                  {isFetchingNextPage ? t('search.loadingMore') : '\u00a0'}
                </span>
                <div ref={sentinelRef} aria-hidden="true" className="h-1 w-full" />
              </div>
            )}
          </>
        ))}
    </section>
  );
}
