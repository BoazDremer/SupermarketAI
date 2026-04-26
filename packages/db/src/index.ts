import { PrismaClient } from '@prisma/client';

export { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Single Prisma client instance for server runtimes (Nest, scripts).
 * No models are defined yet; this is a wiring placeholder.
 */
export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}
