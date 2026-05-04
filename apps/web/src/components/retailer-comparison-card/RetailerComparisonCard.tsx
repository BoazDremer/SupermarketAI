import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { ComparisonTableRow } from '@/api/types';

type RetailerComparisonCardProps = {
  row: ComparisonTableRow;
};

export function RetailerComparisonCard({ row }: RetailerComparisonCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={row.rank === 1 ? 'border-primary ring-2 ring-primary/20' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{row.retailerName}</CardTitle>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            #{row.rank}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('retailerCard.basketTotal')}</span>
          <span className="text-lg font-bold text-primary">{row.totalLabel}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-muted-foreground">
          <span>{t('retailerCard.promosSaved')}</span>
          <span>{row.promotionSavingsLabel}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t('retailerCard.missingLines')}</span>
          <span>{row.missingCount}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">{row.exactCount}</p>
            <p>{t('retailerCard.exact')}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">{row.equivalentCount}</p>
            <p>{t('retailerCard.equiv')}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">{row.substituteCount}</p>
            <p>{t('retailerCard.sub')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
