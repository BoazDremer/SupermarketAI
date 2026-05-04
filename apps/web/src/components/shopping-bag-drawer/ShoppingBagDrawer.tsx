import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BasketSummaryCard } from '@/components/basket-summary-card/BasketSummaryCard';
import { ShoppingBagItemRow } from '@/components/shopping-bag-item-row/ShoppingBagItemRow';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useShoppingBagQuery } from '@/hooks/use-shopping-bag-api';
import { useShoppingBagStore } from '@/stores/shopping-bag-store';

type ShoppingBagDrawerProps = {
  side?: 'bottom' | 'right';
};

export function ShoppingBagDrawer({ side = 'bottom' }: ShoppingBagDrawerProps) {
  const { t } = useTranslation();
  const open = useShoppingBagStore((s) => s.drawerOpen);
  const setOpen = useShoppingBagStore((s) => s.setDrawerOpen);
  const { data } = useShoppingBagQuery();
  const lines = data?.items ?? [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side={side} className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-4 py-4 text-start">
          <SheetTitle>{t('bag.drawerTitle')}</SheetTitle>
          <SheetDescription>{t('bag.drawerDesc')}</SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 px-4">
          <div className="flex flex-col gap-3 py-4">
            {lines.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('bag.drawerEmpty')}</p>
            ) : (
              lines.map((line) => <ShoppingBagItemRow key={line.id} line={line} />)
            )}
          </div>
        </ScrollArea>
        <div className="border-t bg-muted/40 px-4 py-4">
          <BasketSummaryCard />
          <Button asChild className="mt-4 w-full" variant="secondary">
            <Link to="/bag" onClick={() => setOpen(false)}>
              {t('bag.openFull')}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
