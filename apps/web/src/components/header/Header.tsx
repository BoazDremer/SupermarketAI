import { Menu, ShoppingBasket, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import zolifyLogo from '../../../img/zolify_logo.png';
import { LanguageSwitcher } from '@/components/language-switcher/LanguageSwitcher';
import { ProductSearchInput } from '@/components/product-search-input/ProductSearchInput';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useShoppingBagLineCount } from '@/hooks/use-shopping-bag-api';
import { useShoppingBagStore } from '@/stores/shopping-bag-store';

export function Header() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleDrawer = useShoppingBagStore((s) => s.toggleDrawer);
  const lineCount = useShoppingBagLineCount();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
        <div className="flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('header.openMenu')}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100%,280px)]">
              <SheetHeader>
                <SheetTitle>{t('nav.menu')}</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-2 text-lg font-medium">
                <Link className="rounded-md px-2 py-2 hover:bg-muted" to="/" onClick={() => setMobileMenuOpen(false)}>
                  {t('nav.home')}
                </Link>
                <Link
                  className="rounded-md px-2 py-2 hover:bg-muted"
                  to="/search"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.search')}
                </Link>
                <Link className="rounded-md px-2 py-2 hover:bg-muted" to="/bag" onClick={() => setMobileMenuOpen(false)}>
                  {t('nav.shoppingBag')}
                </Link>
                <Link
                  className="rounded-md px-2 py-2 hover:bg-muted"
                  to="/retailers"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.retailers')}
                </Link>
                <Link
                  className="rounded-md px-2 py-2 hover:bg-muted"
                  to="/admin/ingestion"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.ingestionAdmin')}
                </Link>
                <LanguageSwitcher variant="menu" />
              </nav>
            </SheetContent>
          </Sheet>

          <Link
            to="/"
            className="flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('brand.full')}
          >
            <img
              src={zolifyLogo}
              alt={t('brand.full')}
              className="h-12 w-auto sm:h-14 md:h-16"
              draggable={false}
            />
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 md:block">
          <ProductSearchInput className="max-w-xl" compact />
        </div>

        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link to="/retailers">
              <Store className="me-1 h-4 w-4" />
              {t('header.retailers')}
            </Link>
          </Button>
          <Button type="button" variant="default" size="sm" className="gap-1 shadow-sm" onClick={() => toggleDrawer()}>
            <ShoppingBasket className="h-4 w-4" />
            <span className="hidden sm:inline">{t('header.bag')}</span>
            {lineCount > 0 ? (
              <span className="rounded-full bg-primary-foreground/20 px-1.5 text-xs tabular-nums">{lineCount}</span>
            ) : null}
          </Button>
        </div>
      </div>
      <div className="border-t px-3 pb-3 pt-0 md:hidden">
        <ProductSearchInput compact />
      </div>
    </header>
  );
}
