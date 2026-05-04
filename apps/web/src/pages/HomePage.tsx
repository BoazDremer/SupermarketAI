import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ProductGrid } from '@/components/product-grid/ProductGrid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductSearchQuery } from '@/hooks/use-catalog-api';

export function HomePage() {
  const { t } = useTranslation();
  const { data } = useProductSearchQuery('', undefined, undefined);
  const featured = useMemo(() => data?.items.slice(0, 4) ?? [], [data]);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">{t('home.kicker')}</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">{t('home.title')}</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">{t('home.subtitle')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/search">{t('home.startShopping')}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/retailers">{t('home.viewRetailers')}</Link>
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t('home.popularPicks')}</h2>
            <p className="text-sm text-muted-foreground">{t('home.popularPicksHint')}</p>
          </div>
          <Button variant="ghost" asChild className="shrink-0">
            <Link to="/search">{t('home.seeAll')}</Link>
          </Button>
        </div>
        <ProductGrid products={featured} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('home.compareCardTitle')}</CardTitle>
            <CardDescription>{t('home.compareCardDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/bag">{t('home.goToBag')}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('home.fixtureCardTitle')}</CardTitle>
            <CardDescription>{t('home.fixtureCardDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/search?q=milk">{t('home.tryMilk')}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
