import { useTranslation } from 'react-i18next';
import { Shuffle } from 'lucide-react';
import type { MockSubstitution } from '@/types/mock-product';

type SubstitutionOptionsListProps = {
  items: MockSubstitution[];
};

export function SubstitutionOptionsList({ items }: SubstitutionOptionsListProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
        {t('subsList.none')}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((s) => (
        <li
          key={s.id}
          className="flex items-start gap-3 rounded-lg border bg-card px-3 py-3 text-sm shadow-sm"
        >
          <Shuffle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">{s.name}</p>
            <p className="text-muted-foreground">{s.reason}</p>
            <p className="mt-1 text-sm font-medium text-primary">{s.priceRangeLabel}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
