import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { getPrismaClient, type PrismaClient } from '@supermarket-price-compare/db';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /** Singleton from `@supermarket-price-compare/db` (shared across hot reloads in dev). */
  readonly client: PrismaClient = getPrismaClient();

  async onModuleInit(): Promise<void> {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      this.logger.error(
        'DATABASE_URL is not set. The API now requires a Postgres connection — set it in apps/api/.env.',
      );
      throw new Error('DATABASE_URL is required');
    }
    await this.client.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.$disconnect();
    } catch {
      // ignore if never connected
    }
  }
}
