import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { SearchProductsQueryDto } from './dto/search-products.query.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('search')
  search(@Query() query: SearchProductsQueryDto) {
    return this.productsService.search(query);
  }

  @Get(':id/substitutions')
  substitutions(@Param('id') id: string) {
    return this.productsService.getSubstitutions(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
}
