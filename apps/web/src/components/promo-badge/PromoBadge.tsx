import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PromoBadgeProps = {
  label: string;
  className?: string;
};

export function PromoBadge({ label, className }: PromoBadgeProps) {
  return (
    <Badge variant="promo" className={cn('font-semibold tracking-tight', className)}>
      {label}
    </Badge>
  );
}
