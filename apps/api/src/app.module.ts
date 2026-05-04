import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BasketComparisonModule } from './basket-comparison/basket-comparison.module';
import { CatalogModule } from './catalog/catalog.module';
import { HealthModule } from './health/health.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { RetailersModule } from './retailers/retailers.module';
import { ShoppingBagsModule } from './shopping-bags/shopping-bags.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    CatalogModule,
    HealthModule,
    RetailersModule,
    ProductsModule,
    ShoppingBagsModule,
    BasketComparisonModule,
    IngestionModule,
  ],
})
export class AppModule {}
