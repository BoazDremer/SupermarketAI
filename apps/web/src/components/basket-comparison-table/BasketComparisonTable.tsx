import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ComparisonTableRow } from '@/api/types';

type BasketComparisonTableProps = {
  rows: ComparisonTableRow[];
};

export function BasketComparisonTable({ rows }: BasketComparisonTableProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('compare.tableTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/60 text-start text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t('compare.colRank')}</th>
              <th className="px-4 py-3 font-medium">{t('compare.colRetailer')}</th>
              <th className="px-4 py-3 font-medium">{t('compare.colTotal')}</th>
              <th className="px-4 py-3 font-medium">{t('compare.colPromos')}</th>
              <th className="px-4 py-3 font-medium">{t('compare.colMissing')}</th>
              <th className="px-4 py-3 font-medium">{t('compare.colExact')}</th>
              <th className="px-4 py-3 font-medium">{t('compare.colEquiv')}</th>
              <th className="px-4 py-3 font-medium">{t('compare.colSub')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.retailerId} className="border-t">
                <td className="px-4 py-3 font-semibold tabular-nums">{r.rank}</td>
                <td className="px-4 py-3 font-medium">{r.retailerName}</td>
                <td className="px-4 py-3 text-primary">{r.totalLabel}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.promotionSavingsLabel}</td>
                <td className="px-4 py-3 tabular-nums">{r.missingCount}</td>
                <td className="px-4 py-3 tabular-nums">{r.exactCount}</td>
                <td className="px-4 py-3 tabular-nums">{r.equivalentCount}</td>
                <td className="px-4 py-3 tabular-nums">{r.substituteCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
