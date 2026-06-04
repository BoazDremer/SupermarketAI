import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { QuantitySelector } from '@/components/quantity-selector/QuantitySelector';
import { RetailerChainBadges } from '@/components/retailer-chain-badges/RetailerChainBadges';
import type { ShoppingBagItemApi } from '@/api/types';
import { useRemoveBagItemMutation, useUpdateBagItemMutation } from '@/hooks/use-shopping-bag-api';
import { useProductImage } from '@/hooks/use-product-image';
import { localizedProductName } from '@/lib/product-localization';
import { cn } from '@/lib/utils';

type ShoppingBagItemRowProps = {
  line: ShoppingBagItemApi;
};

export function ShoppingBagItemRow({ line }: ShoppingBagItemRowProps) {
  const { t, i18n } = useTranslation();
  const updateItem = useUpdateBagItemMutation();
  const removeItem = useRemoveBagItemMutation();
  const displayName = localizedProductName(line, i18n.language.startsWith('he'));
  const { showImage, isLoadingImage, onImageError } = useProductImage(
    line.imageUrl,
    line.canonicalProductId ?? line.id,
  );

  return (
    <div className="flex gap-3 rounded-lg border bg-card p-3 shadow-sm">
      <div
        className={cn(
          'relative h-16 w-16 shrink-0 overflow-hidden rounded-md',
          showImage
            ? 'bg-white ring-1 ring-black/[0.06] dark:bg-zinc-950 dark:ring-white/[0.08]'
            : 'bg-muted',
        )}
        style={
          showImage
            ? undefined
            : {
                backgroundImage: `linear-gradient(135deg, hsl(${line.imageHue} 40% 85%), hsl(${line.imageHue} 25% 72%))`,
              }
        }
      >
        {showImage ? (
          <img
            src={line.imageUrl}
            alt=""
            decoding="async"
            referrerPolicy="no-referrer"
            onError={onImageError}
            className="absolute inset-0 h-full w-full object-contain p-1"
          />
        ) : isLoadingImage ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 animate-pulse bg-gradient-to-br from-transparent via-white/30 to-transparent dark:via-white/10"
          />
        ) : null}
        {(line.availableRetailerSlugs?.length ?? 0) > 0 ? (
          <div className="absolute start-0.5 top-0.5">
            <RetailerChainBadges slugs={line.availableRetailerSlugs ?? []} variant="inline" />
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{line.brand}</p>
        <p className="truncate font-semibold">{displayName}</p>
        <p className="text-xs text-muted-foreground">{line.unit}</p>
        <p className="text-sm font-medium text-primary">{line.priceRangeLabel}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <QuantitySelector
          value={line.quantity}
          onChange={(n) => {
            updateItem.mutate({ itemId: line.id, quantity: n });
          }}
          className="scale-90"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          disabled={removeItem.isPending}
          onClick={() => removeItem.mutate(line.id)}
          aria-label={t('bag.removeAria', { name: displayName })}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
