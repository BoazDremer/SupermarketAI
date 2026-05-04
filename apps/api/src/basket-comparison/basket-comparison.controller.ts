import { Controller, Get, Param } from '@nestjs/common';
import { BasketComparisonService } from './basket-comparison.service';

@Controller('basket-comparisons')
export class BasketComparisonController {
  constructor(private readonly basketComparisonService: BasketComparisonService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.basketComparisonService.findOne(id);
  }
}
