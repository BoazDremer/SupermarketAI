import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type ChainVisual = { bgClass: string; textClass?: string; label: string };

const CHAIN_VISUAL: Record<string, ChainVisual> = {
  'rami-levy': {
    bgClass: 'bg-[#008c44]',
    textClass: 'text-white',
    label: 'ר',
  },
  shufersal: {
    bgClass: 'bg-[#e30613]',
    textClass: 'text-white',
    label: 'ש',
  },
};

function visualForSlug(slug: string): ChainVisual {
  const known = CHAIN_VISUAL[slug];
  if (known) return known;
  return {
    bgClass: 'bg-muted-foreground/80',
    textClass: 'text-background',
    label: slug.slice(0, 1).toUpperCase(),
  };
}

type RetailerChainBadgesProps = {
  slugs: readonly string[];
  /** `card` — product grid; `inline` — tighter row (e.g. bag). */
  variant?: 'card' | 'inline';
  className?: string;
};

/**
 * Small circular “logo” marks for chains that carry this SKU (from
 * `availableRetailerSlugs`). Uses chain colours + Hebrew initial; unknown
 * slugs fall back to the first letter.
 */
export function RetailerChainBadges({ slugs, variant = 'card', className }: RetailerChainBadgesProps) {
  const { t } = useTranslation();
  if (slugs.length === 0) return null;

  const ariaLabel = slugs
    .map((slug) =>
      slug === 'rami-levy'
        ? t('product.chainAriaRamiLevy')
        : slug === 'shufersal'
          ? t('product.chainAriaShufersal')
          : t('product.chainAriaOther', { slug }),
    )
    .join(' · ');

  const size = variant === 'inline' ? 'h-4 w-4 text-[7px]' : 'h-5 w-5 text-[8px]';
  const ring = variant === 'inline' ? 'ring-1 ring-background' : 'ring-2 ring-background dark:ring-zinc-950';

  return (
    <div
      className={cn(
        'pointer-events-none z-10 flex flex-row items-center',
        variant === 'card' ? '-ms-0.5' : '',
        className,
      )}
      role="img"
      aria-label={ariaLabel}
    >
      {slugs.map((slug) => {
        const v = visualForSlug(slug);
        const aria =
          slug === 'rami-levy'
            ? t('product.chainAriaRamiLevy')
            : slug === 'shufersal'
              ? t('product.chainAriaShufersal')
              : t('product.chainAriaOther', { slug });
        return (
          <span
            key={slug}
            title={aria}
            aria-hidden="true"
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full font-bold leading-none shadow-sm',
              size,
              ring,
              v.bgClass,
              v.textClass,
              '-ms-1 first:ms-0',
            )}
          >
            {v.label}
          </span>
        );
      })}
    </div>
  );
}
