import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { BasketComparisonTable } from '@/components/basket-comparison-table/BasketComparisonTable';
import { MissingItemsList } from '@/components/missing-items-list/MissingItemsList';
import { RetailerComparisonCard } from '@/components/retailer-comparison-card/RetailerComparisonCard';
import { SavingsSummaryCard } from '@/components/savings-summary-card/SavingsSummaryCard';
import { SubstitutionOptionsList } from '@/components/substitution-options-list/SubstitutionOptionsList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBasketComparisonQuery } from '@/hooks/use-basket-comparison-api';
import { savingsSummaryFromResults } from '@/lib/comparison-savings';
import { formatIlsMinor } from '@/lib/money';
import { comparisonToTableRows } from '@/lib/map-comparison';

export function BasketComparisonPage() {
  const { t, i18n } = useTranslation();
  const { comparisonId } = useParams<{ comparisonId: string }>();
  const { data, isLoading, isSuccess } = useBasketComparisonQuery(comparisonId);

  const isHebrew = i18n.language.startsWith('he');
  const rows = useMemo(() => {
    if (!data) return [];
    return comparisonToTableRows(data, isHebrew);
  }, [data, isHebrew]);

  const savingsLabel = useMemo(
    () => (data ? savingsSummaryFromResults(data.retailerResults, t) : ''),
    [data, t, i18n.language],
  );

  const cheapest = data?.retailerResults.find((r) => r.rank === 1);

  if (isLoading) {
    return <p className="text-muted-foreground">{t('compare.loading')}</p>;
  }

  if (!comparisonId || (isSuccess && data === null)) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-medium">{t('compare.notFound')}</p>
          <Button asChild className="mt-4">
            <Link to="/bag">{t('compare.backToBag')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('compare.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('compare.runId', { id: comparisonId })}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/bag">{t('compare.editBag')}</Link>
        </Button>
      </div>

      {cheapest ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-primary">{t('compare.cheapestTitle')}</CardTitle>
            <CardDescription>{t('compare.cheapestDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">
              {isHebrew && cheapest.retailerDisplayNameHe
                ? cheapest.retailerDisplayNameHe
                : cheapest.retailerDisplayName}
            </p>
            <p className="mt-1 text-lg font-semibold text-primary">{formatIlsMinor(cheapest.totalPrice.minorUnits)}</p>
          </CardContent>
        </Card>
      ) : null}

      <SavingsSummaryCard label={savingsLabel} />

      <BasketComparisonTable rows={rows} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('compare.retailerCards')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r) => (
            <RetailerComparisonCard key={r.retailerId} row={r} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">{t('compare.missingSection')}</h2>
          <MissingItemsList items={data.missing} />
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">{t('compare.subsSection')}</h2>
          <SubstitutionOptionsList items={data.substitutions} />
        </div>
      </section>
    </div>
  );
}
