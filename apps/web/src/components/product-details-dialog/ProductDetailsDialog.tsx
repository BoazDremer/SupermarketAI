import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AddToBagButton } from '@/components/add-to-bag-button/AddToBagButton';
import { PromoBadge } from '@/components/promo-badge/PromoBadge';
import { RetailerChainBadges } from '@/components/retailer-chain-badges/RetailerChainBadges';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useProductQuery } from '@/hooks/use-catalog-api';
import { localizedProductName } from '@/lib/product-localization';

type ProductDetailsDialogProps = {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductDetailsDialog({ productId, open, onOpenChange }: ProductDetailsDialogProps) {
  const { t, i18n } = useTranslation();
  const { data: product, isLoading } = useProductQuery(productId ?? undefined);
  const displayName = product ? localizedProductName(product, i18n.language.startsWith('he')) : '';
  const [imageFailed, setImageFailed] = useState(false);
  // Reset failure state when the user opens a different product.
  useEffect(() => {
    setImageFailed(false);
  }, [productId]);
  const showImage = Boolean(product?.imageUrl) && !imageFailed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {!productId || isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : !product ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('product.notFound')}</p>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{displayName}</DialogTitle>
              <DialogDescription>
                {product.brand} · {product.unit}
              </DialogDescription>
            </DialogHeader>
            <div
              className={
                showImage
                  ? 'relative aspect-video w-full overflow-hidden rounded-lg bg-white ring-1 ring-black/[0.06] dark:bg-zinc-950 dark:ring-white/[0.08]'
                  : 'relative aspect-video w-full overflow-hidden rounded-lg bg-muted'
              }
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
                  className="absolute inset-0 h-full w-full object-contain p-4"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  {t('product.imagePlaceholder')}
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
            <div className="space-y-2 text-sm">
              <p className="text-lg font-semibold text-primary">{product.priceRangeLabel}</p>
              <p className="text-muted-foreground">{t('product.priceRangeHint')}</p>
            </div>
            <Separator />
            <AddToBagButton product={product} />
            <Button variant="outline" className="w-full" asChild>
              <Link to={`/products/${product.id}`} onClick={() => onOpenChange(false)}>
                {t('product.openFullPage')}
              </Link>
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
