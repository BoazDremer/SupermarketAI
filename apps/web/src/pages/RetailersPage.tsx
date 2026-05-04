import { Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRetailersListQuery } from '@/hooks/use-catalog-api';

function logoHueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i) * (i + 1)) % 360;
  return h;
}

export function RetailersPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useRetailersListQuery();
  const retailers = data ?? [];
  const useHe = i18n.language.startsWith('he');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('retailers.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('retailers.subtitle')}</p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {retailers.map((r) => {
            const title = useHe && r.displayNameHe ? r.displayNameHe : r.displayName;
            return (
              <li key={r.id}>
                <Card className="h-full overflow-hidden">
                  <div
                    className="h-2 w-full"
                    style={{
                      background: `linear-gradient(90deg, hsl(${logoHueFromId(r.id)} 50% 40%), hsl(${logoHueFromId(r.slug)} 40% 55%))`,
                    }}
                  />
                  <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription className="font-mono text-xs">{r.slug}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4 shrink-0 text-primary" />
                    {r.supportsDelivery ? t('retailers.delivery') : t('retailers.pickup')}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
