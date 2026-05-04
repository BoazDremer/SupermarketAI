import { useTranslation } from 'react-i18next';
import { ProductCard } from '@/components/product-card/ProductCard';
import { cn } from '@/lib/utils';
import type { MockProduct } from '@/types/mock-product';

type ProductGridProps = {
  products: MockProduct[];
  onOpenDetails?: (product: MockProduct) => void;
  className?: string;
};

export function ProductGrid({ products, onOpenDetails, className }: ProductGridProps) {
  const { t } = useTranslation();

  if (products.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-dashed bg-muted/40 px-4 py-16 text-center text-muted-foreground',
          className,
        )}
      >
        <p className="text-lg font-medium text-foreground">{t('searchEmpty.title')}</p>
        <p className="mt-2 text-sm">{t('searchEmpty.hint')}</p>
      </div>
    );
  }

  return (
    <ul
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} onOpenDetails={onOpenDetails} />
        </li>
      ))}
    </ul>
  );
}
