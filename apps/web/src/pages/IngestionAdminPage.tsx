import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useIngestionRunsQuery, useStartIngestionRunMutation } from '@/hooks/use-mock-queries';

export function IngestionAdminPage() {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useIngestionRunsQuery();
  const startRun = useStartIngestionRunMutation();
  const runs = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('ingestion.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('ingestion.subtitle')}</p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">{t('ingestion.pipelineTitle')}</CardTitle>
          <CardDescription>{t('ingestion.pipelineDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => startRun.mutate(undefined, { onSuccess: () => void refetch() })}
            disabled={startRun.isPending}
          >
            {startRun.isPending ? t('ingestion.starting') : t('ingestion.startMock')}
          </Button>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="me-2 h-4 w-4" />
            {t('ingestion.refresh')}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">{t('ingestion.loadingRuns')}</p>
      ) : (
        <ul className="space-y-2">
          {runs.map((run) => (
            <li key={run.id}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                  <div>
                    <CardTitle className="text-base font-mono">{run.id}</CardTitle>
                    <CardDescription>
                      {run.status}
                      {run.retailerKey ? ` · ${run.retailerKey}` : ''}
                    </CardDescription>
                  </div>
                  <span className="text-xs text-muted-foreground">{run.startedAt}</span>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
