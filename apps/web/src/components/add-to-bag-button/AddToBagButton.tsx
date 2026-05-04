import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { QuantitySelector } from '@/components/quantity-selector/QuantitySelector';
import { useAddBagItemMutation } from '@/hooks/use-shopping-bag-api';
import { cn } from '@/lib/utils';
import { useShoppingBagStore } from '@/stores/shopping-bag-store';
import type { MockProduct } from '@/types/mock-product';

type AddToBagButtonProps = {
  product: MockProduct;
  className?: string;
};

export function AddToBagButton({ product, className }: AddToBagButtonProps) {
  const { t } = useTranslation();
  const [qty, setQty] = useState(1);
  const setDrawerOpen = useShoppingBagStore((s) => s.setDrawerOpen);
  const addItem = useAddBagItemMutation();

  return (
    <div className={cn('flex flex-col items-stretch gap-2 sm:flex-row sm:items-center', className)}>
      <QuantitySelector value={qty} onChange={setQty} className="self-start" />
      <Button
        type="button"
        className="gap-2 shadow-md"
        disabled={addItem.isPending}
        onClick={() => {
          addItem.mutate(
            { canonicalProductId: product.id, quantity: qty },
            {
              onSuccess: () => {
                setDrawerOpen(true);
                setQty(1);
              },
              onError: (err) => {
                console.error('Failed adding item to bag', err);
              },
            },
          );
        }}
      >
        <ShoppingCart className="h-4 w-4" />
        {addItem.isPending ? t('addToBag.adding') : t('addToBag.add')}
      </Button>
    </div>
  );
}
