import { Injectable } from '@nestjs/common';
import {
  CatalogService,
  type CatalogProductDetail,
  type CatalogProductListItem,
} from '../catalog/catalog.service';
import type { SearchProductsQueryDto } from './dto/search-products.query.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly catalog: CatalogService) {}

  async search(
    query: SearchProductsQueryDto,
  ): Promise<{ items: CatalogProductListItem[]; total: number; offset: number; limit: number }> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const { items, total } = await this.catalog.search(
      query.q,
      query.retailerId,
      query.category,
      limit,
      offset,
    );
    return { items, total, offset, limit };
  }

  findOne(id: string): Promise<CatalogProductDetail> {
    return this.catalog.findOneDetailed(id);
  }

  /**
   * Substitution suggestions are not derived from the ingested data yet.
   * Return an empty list so the UI can render gracefully until we have
   * a substitution source (manual mapping or NLP-driven candidates).
   */
  getSubstitutions(id: string): { productId: string; substitutes: never[] } {
    return { productId: id, substitutes: [] };
  }
}
