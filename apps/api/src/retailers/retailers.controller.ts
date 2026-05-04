import { Controller, Get, Param } from '@nestjs/common';
import { RetailersService } from './retailers.service';

@Controller('retailers')
export class RetailersController {
  constructor(private readonly retailersService: RetailersService) {}

  @Get()
  list() {
    return this.retailersService.findAll();
  }

  @Get(':id/stores')
  listStores(@Param('id') id: string) {
    return this.retailersService.findStoresByRetailerId(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.retailersService.findOne(id);
  }
}
