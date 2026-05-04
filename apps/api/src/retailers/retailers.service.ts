import { Injectable, NotFoundException } from '@nestjs/common';
import type { Retailer, RetailerStore } from '@supermarket-price-compare/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RetailersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Retailer[]> {
    const rows = await this.prisma.client.retailer.findMany({
      orderBy: { displayName: 'asc' },
    });
    return rows.map((r) => this.toRetailer(r));
  }

  async findOne(idOrSlug: string): Promise<Retailer> {
    const row = await this.prisma.client.retailer.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    if (!row) {
      throw new NotFoundException(`Retailer not found: ${idOrSlug}`);
    }
    return this.toRetailer(row);
  }

  async findStoresByRetailerId(idOrSlug: string): Promise<RetailerStore[]> {
    const retailer = await this.findOne(idOrSlug);
    const rows = await this.prisma.client.retailerStore.findMany({
      where: { retailerId: retailer.id },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((s) => ({
      id: s.id,
      retailerId: s.retailerId,
      externalStoreId: s.externalStoreId,
      displayName: s.displayName,
      city: s.city ?? undefined,
      deliveryOffered: s.deliveryOffered,
    }));
  }

  private toRetailer(row: {
    id: string;
    slug: string;
    displayName: string;
    displayNameHe: string | null;
    supportsDelivery: boolean;
    websiteUrl: string | null;
    isActive: boolean;
  }): Retailer {
    return {
      id: row.id,
      slug: row.slug,
      displayName: row.displayName,
      displayNameHe: row.displayNameHe ?? undefined,
      supportsDelivery: row.supportsDelivery,
      websiteUrl: row.websiteUrl ?? undefined,
      isActive: row.isActive,
    };
  }
}
