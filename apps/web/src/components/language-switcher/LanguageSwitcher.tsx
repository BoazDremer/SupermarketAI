import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LanguageSwitcherProps = {
  /** Compact pill for header toolbar */
  variant?: 'toolbar' | 'menu';
  className?: string;
};

export function LanguageSwitcher({ variant = 'toolbar', className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const lng = i18n.resolvedLanguage ?? i18n.language;

  if (variant === 'menu') {
    return (
      <div className={cn('flex flex-col gap-2 border-t pt-4', className)}>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('language.label')}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={lng.startsWith('en') ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => void i18n.changeLanguage('en')}
          >
            {t('language.english')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={lng.startsWith('he') ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => void i18n.changeLanguage('he')}
          >
            {t('language.hebrew')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('inline-flex items-center rounded-md border bg-muted/40 p-0.5 text-xs', className)}
      role="group"
      aria-label={t('language.label')}
    >
      <Languages className="mx-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <Button
        type="button"
        size="sm"
        variant={lng.startsWith('en') ? 'secondary' : 'ghost'}
        className="h-7 rounded-sm px-2 text-xs"
        onClick={() => void i18n.changeLanguage('en')}
      >
        EN
      </Button>
      <Button
        type="button"
        size="sm"
        variant={lng.startsWith('he') ? 'secondary' : 'ghost'}
        className="h-7 rounded-sm px-2 text-xs"
        onClick={() => void i18n.changeLanguage('he')}
      >
        עב
      </Button>
    </div>
  );
}
