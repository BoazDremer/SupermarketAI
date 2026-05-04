import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/app-shell/AppShell';
import { BasketComparisonPage } from '@/pages/BasketComparisonPage';
import { HomePage } from '@/pages/HomePage';
import { IngestionAdminPage } from '@/pages/IngestionAdminPage';
import { ProductDetailsPage } from '@/pages/ProductDetailsPage';
import { ProductSearchPage } from '@/pages/ProductSearchPage';
import { RetailersPage } from '@/pages/RetailersPage';
import { ShoppingBagPage } from '@/pages/ShoppingBagPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<ProductSearchPage />} />
        <Route path="products/:id" element={<ProductDetailsPage />} />
        <Route path="bag" element={<ShoppingBagPage />} />
        <Route path="compare/:comparisonId" element={<BasketComparisonPage />} />
        <Route path="retailers" element={<RetailersPage />} />
        <Route path="admin/ingestion" element={<IngestionAdminPage />} />
      </Route>
    </Routes>
  );
}
