import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { BasketSummaryCard } from '@/components/basket-summary-card/BasketSummaryCard';
import { ShoppingBagItemRow } from '@/components/shopping-bag-item-row/ShoppingBagItemRow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBasketComparisonMutation } from '@/hooks/use-basket-comparison-api';
import { useClearShoppingBagMutation, useShoppingBagQuery } from '@/hooks/use-shopping-bag-api';
import { useShoppingBagStore } from '@/stores/shopping-bag-store';

export function ShoppingBagPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const bagId = useShoppingBagStore((s) => s.serverBagId);
  const { data, isLoading } = useShoppingBagQuery();
  const compareMutation = useBasketComparisonMutation();
  const clearMutation = useClearShoppingBagMutation();
  const lines = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('bag.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {bagId ? t('bag.serverHint', { id: bagId }) : t('bag.noBagHint')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => clearMutation.mutate()}
            disabled={lines.length === 0 || clearMutation.isPending || !bagId}
          >
            {t('bag.clear')}
          </Button>
          <Button
            type="button"
            disabled={lines.length === 0 || compareMutation.isPending || !bagId}
            onClick={() => {
              if (!bagId) return;
              compareMutation.mutate(bagId, {
                onSuccess: (res) => {
                  void navigate(`/compare/${res.id}`);
                },
              });
            }}
          >
            {compareMutation.isPending ? t('bag.comparing') : t('bag.compare')}
          </Button>
        </div>
      </div>

      {isLoading && bagId ? (
        <p className="text-sm text-muted-foreground">{t('bag.loading')}</p>
      ) : lines.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">{t('bag.empty')}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {lines.map((line) => (
              <ShoppingBagItemRow key={line.id} line={line} />
            ))}
          </div>
          <div className="lg:col-span-1">
            <BasketSummaryCard />
          </div>
        </div>
      )}
    </div>
  );
}
