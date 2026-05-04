import { TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SavingsSummaryCardProps = {
  label: string;
};

export function SavingsSummaryCard({ label }: SavingsSummaryCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <TrendingDown className="h-5 w-5 text-primary" />
        <CardTitle className="text-base">{t('compare.savingsTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold text-primary">{label}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('compare.savingsFoot')}</p>
      </CardContent>
    </Card>
  );
}
