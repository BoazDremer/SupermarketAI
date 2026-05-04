import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddToBagButton } from '@/components/add-to-bag-button/AddToBagButton';
import { PromoBadge } from '@/components/promo-badge/PromoBadge';
import { RetailerChainBadges } from '@/components/retailer-chain-badges/RetailerChainBadges';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { localizedProductName } from '@/lib/product-localization';
import { cn } from '@/lib/utils';
import type { MockProduct } from '@/types/mock-product';

type ProductCardProps = {
  product: MockProduct;
  onOpenDetails?: (product: MockProduct) => void;
  className?: string;
};

export function ProductCard({ product, onOpenDetails, className }: ProductCardProps) {
  const { t, i18n } = useTranslation();
  const displayName = localizedProductName(product, i18n.language.startsWith('he'));
  // Track image load failures so we fall back to the hue-gradient placeholder
  // (some chain image URLs 404 over time).
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(product.imageUrl) && !imageFailed;

  return (
    <Card
      className={cn(
        'flex flex-col overflow-hidden transition-shadow hover:shadow-md',
        onOpenDetails && 'cursor-pointer',
        className,
      )}
      onClick={() => onOpenDetails?.(product)}
      role={onOpenDetails ? 'button' : undefined}
      tabIndex={onOpenDetails ? 0 : undefined}
      onKeyDown={(e) => {
        if (onOpenDetails && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpenDetails(product);
        }
      }}
    >
      <div
        className={cn(
          'relative aspect-[4/3] w-full',
          showImage
            ? 'bg-white ring-1 ring-black/[0.06] dark:bg-zinc-950 dark:ring-white/[0.08]'
            : 'bg-gradient-to-br from-muted to-muted/60',
        )}
        style={
          showImage
            ? undefined
            : {
                backgroundImage: `linear-gradient(135deg, hsl(${product.imageHue} 45% 88%), hsl(${product.imageHue} 35% 78%))`,
              }
        }
      >
        {showImage ? (
          <img
            src={product.imageUrl}
            alt={displayName}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 h-full w-full object-contain p-2"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground">
            {t('product.imageSoon')}
          </div>
        )}
        {(product.availableRetailerSlugs?.length ?? 0) > 0 ? (
          <div className="absolute start-2 top-2">
            <RetailerChainBadges slugs={product.availableRetailerSlugs ?? []} />
          </div>
        ) : null}
        {product.promoLabel ? (
          <div className="absolute end-2 top-2">
            <PromoBadge label={product.promoLabel} />
          </div>
        ) : null}
      </div>
      <CardContent className="flex flex-1 flex-col gap-1 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{product.brand}</p>
        <h3 className="line-clamp-2 text-base font-semibold leading-snug">{displayName}</h3>
        <p className="text-sm text-muted-foreground">{product.unit}</p>
        <p className="text-sm font-semibold text-primary">{product.priceRangeLabel}</p>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t bg-muted/30 pt-4" onClick={(e) => e.stopPropagation()}>
        <AddToBagButton product={product} className="w-full" />
      </CardFooter>
    </Card>
  );
}
