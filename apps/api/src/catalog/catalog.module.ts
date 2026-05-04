import { Global, Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';

@Global()
@Module({
  controllers: [CategoriesController],
  providers: [CatalogService, CategoriesService],
  exports: [CatalogService, CategoriesService],
})
export class CatalogModule {}
