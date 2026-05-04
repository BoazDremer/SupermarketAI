import type { MockProduct } from '@/types/mock-product';

export function localizedProductName(product: Pick<MockProduct, 'name' | 'nameHe'>, isHebrew: boolean): string {
  if (isHebrew && product.nameHe) return product.nameHe;
  return product.name;
}
