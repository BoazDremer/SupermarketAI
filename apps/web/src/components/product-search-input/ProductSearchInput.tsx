import { Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type ProductSearchInputProps = {
  defaultValue?: string;
  className?: string;
  compact?: boolean;
};

export function ProductSearchInput({ defaultValue = '', className, compact }: ProductSearchInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(defaultValue);
  const navigate = useNavigate();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    void navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  return (
    <form onSubmit={onSubmit} className={cn('flex w-full gap-2', className)}>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('search.placeholder')}
          className={cn('ps-9', compact && 'h-9')}
          aria-label={t('search.ariaSearch')}
        />
      </div>
      <Button type="submit" className={cn(compact && 'h-9 shrink-0')}>
        {t('common.search')}
      </Button>
    </form>
  );
}
