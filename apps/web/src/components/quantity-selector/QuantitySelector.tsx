import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type QuantitySelectorProps = {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  className?: string;
};

export function QuantitySelector({ value, min = 1, max = 99, onChange, className }: QuantitySelectorProps) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg border bg-card p-0.5 shadow-sm', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
