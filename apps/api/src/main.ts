import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const corsOrigins =
    config.get<string>('CORS_ORIGINS')?.split(',').map((o) => o.trim()).filter(Boolean) ??
    ['http://localhost:5173'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api');

  const port = Number(config.get<string>('PORT') ?? process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port} (prefix /api)`, 'Bootstrap');
}

void bootstrap();
