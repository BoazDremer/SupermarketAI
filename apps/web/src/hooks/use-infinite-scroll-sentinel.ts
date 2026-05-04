import { useEffect, useRef } from 'react';

/**
 * IntersectionObserver-based sentinel for infinite-scroll lists.
 *
 * Returns a ref to attach to a small bottom-of-list `<div>`; the `onIntersect`
 * callback fires once whenever that sentinel enters the viewport. Re-arms on
 * every fresh observation, so further scrolling triggers it again after the
 * caller has loaded the next page and pushed it into the DOM.
 *
 * Usage:
 *   const { sentinelRef } = useInfiniteScrollSentinel({
 *     enabled: hasNextPage && !isFetchingNextPage,
 *     onIntersect: fetchNextPage,
 *   });
 *   ...
 *   <div ref={sentinelRef} aria-hidden="true" className="h-1" />
 */
export function useInfiniteScrollSentinel(options: {
  enabled: boolean;
  onIntersect: () => void;
  /** Pixels before the sentinel actually enters the viewport at which to fire. */
  rootMargin?: string;
}): { sentinelRef: React.MutableRefObject<HTMLDivElement | null> } {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onIntersectRef = useRef(options.onIntersect);
  onIntersectRef.current = options.onIntersect;

  useEffect(() => {
    if (!options.enabled) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onIntersectRef.current();
            // Don't immediately disconnect — IntersectionObserver naturally
            // re-fires once the sentinel scrolls back into view after layout
            // settles. We just rely on `enabled` flipping false while a fetch
            // is in flight to avoid re-triggers.
            break;
          }
        }
      },
      { rootMargin: options.rootMargin ?? '300px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options.enabled, options.rootMargin]);

  return { sentinelRef };
}
