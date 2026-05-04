import { Home, Search, ShoppingBasket, Scale } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useShoppingBagLineCount } from '@/hooks/use-shopping-bag-api';
import { useShoppingBagStore } from '@/stores/shopping-bag-store';

const linkClass =
  'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-muted-foreground transition-colors';

export function MobileBottomNav() {
  const { t } = useTranslation();
  const lineCount = useShoppingBagLineCount();
  const toggleDrawer = useShoppingBagStore((s) => s.toggleDrawer);
  const lastCompare = useShoppingBagStore((s) => s.lastComparisonId);
  const compareTo = lastCompare ? `/compare/${lastCompare}` : '/bag';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t bg-card/95 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
      <NavLink
        to="/"
        end
        className={({ isActive }) => cn(linkClass, isActive && 'text-primary')}
      >
        <Home className="h-5 w-5" />
        {t('nav.home')}
      </NavLink>
      <NavLink to="/search" className={({ isActive }) => cn(linkClass, isActive && 'text-primary')}>
        <Search className="h-5 w-5" />
        {t('nav.search')}
      </NavLink>
      <button type="button" className={cn(linkClass, 'text-foreground')} onClick={() => toggleDrawer()}>
        <span className="relative">
          <ShoppingBasket className="h-5 w-5" />
          {lineCount > 0 ? (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {lineCount > 9 ? '9+' : lineCount}
            </span>
          ) : null}
        </span>
        {t('nav.bag')}
      </button>
      <NavLink to={compareTo} className={({ isActive }) => cn(linkClass, isActive && 'text-primary')}>
        <Scale className="h-5 w-5" />
        {t('nav.compare')}
      </NavLink>
    </nav>
  );
}
