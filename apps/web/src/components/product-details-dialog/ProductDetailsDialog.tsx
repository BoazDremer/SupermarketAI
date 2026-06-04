import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Fragment } from 'react';
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
import { useProductImage } from '@/hooks/use-product-image';
import { localizedProductName } from '@/lib/product-localization';
import type {
  CommonCategoryPathNode,
  RetailerCategoryPath,
} from '@/types/mock-product';

type ProductDetailsDialogProps = {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductDetailsDialog({ productId, open, onOpenChange }: ProductDetailsDialogProps) {
  const { t, i18n } = useTranslation();
  const { data: product, isLoading } = useProductQuery(productId ?? undefined);
  const displayName = product ? localizedProductName(product, i18n.language.startsWith('he')) : '';
  const { showImage, isLoadingImage, imageFailed, onImageError } = useProductImage(
    product?.imageUrl,
    productId ?? undefined,
  );

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
              {product.transparencyNameHe &&
              product.nameHe &&
              product.transparencyNameHe.trim() !== product.nameHe.trim() ? (
                <p className="text-sm text-muted-foreground">
                  {t('product.transparencyName')}: {product.transparencyNameHe}
                </p>
              ) : null}
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
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={onImageError}
                  className="absolute inset-0 h-full w-full object-contain p-4"
                />
              ) : imageFailed || !product.imageUrl ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  {t('product.imagePlaceholder')}
                </div>
              ) : isLoadingImage ? (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 animate-pulse bg-gradient-to-br from-transparent via-white/30 to-transparent dark:via-white/10"
                />
              ) : null}
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
            <CategoryPathSection
              isHebrew={i18n.language.startsWith('he')}
              commonCategoryPath={product.commonCategoryPath}
              retailerCategoryPaths={product.retailerCategoryPaths}
            />
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

type CategoryPathSectionProps = {
  isHebrew: boolean;
  commonCategoryPath?: CommonCategoryPathNode[];
  retailerCategoryPaths?: RetailerCategoryPath[];
};

/**
 * Renders the category trail block: one line per retailer (with the chain's
 * own dept → group → sub-group labels in Hebrew) plus our own backbone path.
 * Hidden entirely when the product has no category data yet.
 */
function CategoryPathSection({
  isHebrew,
  commonCategoryPath,
  retailerCategoryPaths,
}: CategoryPathSectionProps) {
  const { t } = useTranslation();
  const hasRetailerPaths = (retailerCategoryPaths?.length ?? 0) > 0;
  const hasCommonPath = (commonCategoryPath?.length ?? 0) > 0;
  if (!hasRetailerPaths && !hasCommonPath) return null;

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('product.categoryPathTitle')}
      </p>
      <div className="space-y-1.5">
        {(retailerCategoryPaths ?? []).map((rp) => (
          <CategoryPathLine
            key={`${rp.retailerSlug}-${rp.segments.map((s) => s.id).join('|')}`}
            isHebrew={isHebrew}
            label={(isHebrew && rp.retailerDisplayNameHe) || rp.retailerDisplayName}
            segments={rp.segments.map((s) => s.name)}
          />
        ))}
        {hasCommonPath ? (
          <CategoryPathLine
            isHebrew={isHebrew}
            label={t('product.categoryPathOurApp')}
            segments={(commonCategoryPath ?? []).map((n) => (isHebrew ? n.nameHe : n.nameEn))}
            emphasised
          />
        ) : null}
      </div>
    </div>
  );
}

type CategoryPathLineProps = {
  isHebrew: boolean;
  label: string;
  segments: string[];
  emphasised?: boolean;
};

/**
 * One row "Label: A → B → C". In RTL the chevron flips automatically so the
 * trail still reads from broad → narrow visually.
 */
function CategoryPathLine({ isHebrew, label, segments, emphasised }: CategoryPathLineProps) {
  if (segments.length === 0) return null;
  const Chevron = isHebrew ? ChevronLeft : ChevronRight;
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 leading-snug">
      <span
        className={
          emphasised
            ? 'shrink-0 text-xs font-semibold text-primary'
            : 'shrink-0 text-xs font-medium text-muted-foreground'
        }
      >
        {label}:
      </span>
      <span className="flex flex-wrap items-center gap-x-1 gap-y-1 text-foreground">
        {segments.map((seg, idx) => (
          <Fragment key={`${seg}-${idx}`}>
            <span>{seg}</span>
            {idx < segments.length - 1 ? (
              <Chevron aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
            ) : null}
          </Fragment>
        ))}
      </span>
    </div>
  );
}
