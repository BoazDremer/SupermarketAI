import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import type { MockMissingItem } from '@/types/mock-product';

type MissingItemsListProps = {
  items: MockMissingItem[];
};

export function MissingItemsList({ items }: MissingItemsListProps) {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language.startsWith('he');

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
        {t('missingList.none')}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((m) => {
        const retailer = isHebrew && m.retailerNameHe ? m.retailerNameHe : m.retailerName;
        return (
          <li
            key={`${m.lineId}:${m.retailerId ?? m.retailerName}`}
            className="flex items-start gap-3 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900/50 dark:bg-amber-950/40"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <div>
              <p className="font-medium text-foreground">{m.requestedName}</p>
              <p className="text-muted-foreground">{t('missingList.unavailable', { retailer })}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
