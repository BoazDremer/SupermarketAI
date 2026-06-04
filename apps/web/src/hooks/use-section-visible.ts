import { useCallback, useEffect, useState } from 'react';

/**
 * Marks a section as "visible" once its root element nears the viewport.
 * Used to defer product fetches until the shopper scrolls toward a sub-category.
 */
export function useSectionVisible(options: {
  /** When true, visibility is set immediately (e.g. the first sub-category block). */
  initiallyVisible: boolean;
  rootMargin?: string;
}): {
  sectionRef: (node: HTMLElement | null) => void;
  isVisible: boolean;
} {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(options.initiallyVisible);

  const sectionRef = useCallback((node: HTMLElement | null) => {
    setRoot(node);
  }, []);

  useEffect(() => {
    if (options.initiallyVisible) {
      setIsVisible(true);
      return undefined;
    }
    if (isVisible || !root) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: options.rootMargin ?? '400px 0px' },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [options.initiallyVisible, options.rootMargin, isVisible, root]);

  return { sectionRef, isVisible };
}
