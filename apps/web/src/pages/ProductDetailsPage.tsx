import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { AddToBagButton } from '@/components/add-to-bag-button/AddToBagButton';
import { PromoBadge } from '@/components/promo-badge/PromoBadge';
import { RetailerChainBadges } from '@/components/retailer-chain-badges/RetailerChainBadges';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SubstitutionOptionsList } from '@/components/substitution-options-list/SubstitutionOptionsList';
import { useProductQuery, useProductSubstitutionsQuery } from '@/hooks/use-catalog-api';
import { useProductImage } from '@/hooks/use-product-image';
import { localizedProductName } from '@/lib/product-localization';
import { cn } from '@/lib/utils';

export function ProductDetailsPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProductQuery(id);
  const { data: subsData, isLoading: subsLoading } = useProductSubstitutionsQuery(id);
  const { showImage, isLoadingImage, imageFailed, onImageError } = useProductImage(
    product?.imageUrl,
    id,
  );

  if (isLoading) {
    return <p className="text-muted-foreground">{t('common.loading')}</p>;
  }
  if (!product) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-medium">{t('product.notFound')}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/search">{t('product.backToSearch')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const subs = subsData?.substitutes ?? [];
  const displayName = localizedProductName(product, i18n.language.startsWith('he'));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Link to="/search" className="hover:text-foreground">
          {t('product.breadcrumbSearch')}
        </Link>
        <span>/</span>
        <span className="text-foreground">{displayName}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className={cn(
            'relative aspect-square w-full max-w-xl overflow-hidden rounded-2xl border shadow-inner',
            showImage
              ? 'bg-white ring-1 ring-black/[0.06] dark:bg-zinc-950 dark:ring-white/[0.08]'
              : 'bg-muted',
          )}
          style={
            showImage
              ? undefined
              : {
                  backgroundImage: `linear-gradient(135deg, hsl(${product.imageHue} 45% 88%), hsl(${product.imageHue} 35% 72%))`,
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
              className="absolute inset-0 h-full w-full object-contain p-6"
            />
          ) : imageFailed || !product.imageUrl ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              {t('product.imageLargePlaceholder')}
            </div>
          ) : isLoadingImage ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 animate-pulse bg-gradient-to-br from-transparent via-white/30 to-transparent dark:via-white/10"
            />
          ) : null}
          {(product.availableRetailerSlugs?.length ?? 0) > 0 ? (
            <div className="absolute start-3 top-3">
              <RetailerChainBadges slugs={product.availableRetailerSlugs ?? []} />
            </div>
          ) : null}
          {product.promoLabel ? (
            <div className="absolute end-3 top-3">
              <PromoBadge label={product.promoLabel} />
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{product.brand}</p>
            <h1 className="text-3xl font-bold tracking-tight">{displayName}</h1>
            {product.transparencyNameHe &&
            product.nameHe &&
            product.transparencyNameHe.trim() !== product.nameHe.trim() ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {t('product.transparencyName')}: {product.transparencyNameHe}
              </p>
            ) : null}
            <p className="mt-1 text-muted-foreground">{product.unit}</p>
            <p className="mt-4 text-2xl font-bold text-primary">{product.priceRangeLabel}</p>
          </div>
          <AddToBagButton product={product} />
          <Separator />
          <div>
            <h2 className="text-lg font-semibold">{t('product.substitutionTitle')}</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              {subsLoading ? t('product.subsLoading') : t('product.subsHint')}
            </p>
            <SubstitutionOptionsList items={subs} />
          </div>
        </div>
      </div>
    </div>
  );
}
