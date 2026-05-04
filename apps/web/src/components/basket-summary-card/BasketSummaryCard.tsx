import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useShoppingBagQuery } from '@/hooks/use-shopping-bag-api';

export function BasketSummaryCard() {
  const { t } = useTranslation();
  const { data } = useShoppingBagQuery();
  const lines = data?.items ?? [];
  const lineCount = lines.reduce((n, l) => n + l.quantity, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('bag.summaryTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('bag.items')}</span>
          <span className="font-medium">{lineCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('bag.uniqueProducts')}</span>
          <span className="font-medium">{lines.length}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-base font-semibold">
          <span>{t('bag.estimatedTotal')}</span>
          <span className="text-primary">{t('bag.estimateDash')}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t('bag.summaryFoot')}</p>
      </CardContent>
    </Card>
  );
}
