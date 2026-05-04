import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CategoryNav } from '@/components/category-nav/CategoryNav';
import { DocumentLangSync } from '@/components/document-lang-sync/DocumentLangSync';
import { Header } from '@/components/header/Header';
import { MobileBottomNav } from '@/components/mobile-bottom-nav/MobileBottomNav';
import { ShoppingBagDrawer } from '@/components/shopping-bag-drawer/ShoppingBagDrawer';

export function AppShell() {
  const [bagSheetSide, setBagSheetSide] = useState<'bottom' | 'right'>('bottom');

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setBagSheetSide(mq.matches ? 'right' : 'bottom');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <DocumentLangSync />
      <Header />
      <CategoryNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 pb-24 sm:px-4 sm:py-6 md:pb-8">
        <Outlet />
      </main>
      <MobileBottomNav />
      <ShoppingBagDrawer side={bagSheetSide} />
    </div>
  );
}
