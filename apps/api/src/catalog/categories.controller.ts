import { Controller, Get } from '@nestjs/common';
import { CategoriesService, type CategoryTreeResponse } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get('tree')
  async tree(): Promise<CategoryTreeResponse> {
    return this.categories.getTree();
  }
}
