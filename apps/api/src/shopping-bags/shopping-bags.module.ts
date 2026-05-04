import { Module } from '@nestjs/common';
import { BasketComparisonModule } from '../basket-comparison/basket-comparison.module';
import { ShoppingBagsController } from './shopping-bags.controller';
import { ShoppingBagsService } from './shopping-bags.service';

@Module({
  imports: [BasketComparisonModule],
  controllers: [ShoppingBagsController],
  providers: [ShoppingBagsService],
  exports: [ShoppingBagsService],
})
export class ShoppingBagsModule {}
