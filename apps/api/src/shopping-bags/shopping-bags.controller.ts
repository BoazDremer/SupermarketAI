import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { BasketComparisonService } from '../basket-comparison/basket-comparison.service';
import { AddShoppingBagItemDto } from './dto/add-shopping-bag-item.dto';
import { CreateShoppingBagDto } from './dto/create-shopping-bag.dto';
import { UpdateShoppingBagItemDto } from './dto/update-shopping-bag-item.dto';
import { ShoppingBagsService } from './shopping-bags.service';

@Controller('shopping-bags')
export class ShoppingBagsController {
  constructor(
    private readonly shoppingBagsService: ShoppingBagsService,
    private readonly basketComparisonService: BasketComparisonService,
  ) {}

  @Post()
  create(@Body() dto: CreateShoppingBagDto) {
    return this.shoppingBagsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shoppingBagsService.findOne(id);
  }

  @Post(':id/compare')
  async compare(@Param('id') id: string) {
    await this.shoppingBagsService.ensureExists(id);
    return this.basketComparisonService.compareShoppingBag(id);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: AddShoppingBagItemDto) {
    return this.shoppingBagsService.addItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateShoppingBagItemDto,
  ) {
    return this.shoppingBagsService.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  async removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    await this.shoppingBagsService.removeItem(id, itemId);
    return { ok: true };
  }
}
