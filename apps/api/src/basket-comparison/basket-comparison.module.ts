import { Module } from '@nestjs/common';
import { BasketComparisonController } from './basket-comparison.controller';
import { BasketComparisonService } from './basket-comparison.service';

@Module({
  controllers: [BasketComparisonController],
  providers: [BasketComparisonService],
  exports: [BasketComparisonService],
})
export class BasketComparisonModule {}
