import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ShoppingBag, ShoppingBagItem } from '@supermarket-price-compare/shared';
import {
  CatalogService,
  type EnrichedShoppingBagItem,
} from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AddShoppingBagItemDto } from './dto/add-shopping-bag-item.dto';
import type { CreateShoppingBagDto } from './dto/create-shopping-bag.dto';
import type { UpdateShoppingBagItemDto } from './dto/update-shopping-bag-item.dto';

export type ShoppingBagResponse = ShoppingBag & {
  userSessionId?: string;
  items: EnrichedShoppingBagItem[];
};

@Injectable()
export class ShoppingBagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  async ensureExists(bagId: string): Promise<void> {
    const exists = await this.prisma.client.shoppingBag.findUnique({
      where: { id: bagId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Shopping bag not found: ${bagId}`);
    }
  }

  async create(dto: CreateShoppingBagDto): Promise<ShoppingBagResponse> {
    const bag = await this.prisma.client.shoppingBag.create({
      data: {
        label: dto.label,
        userSessionId: dto.userSessionId,
      },
    });
    return this.toResponse(bag.id);
  }

  async findOne(id: string): Promise<ShoppingBagResponse> {
    const bag = await this.prisma.client.shoppingBag.findUnique({
      where: { id },
    });
    if (!bag) {
      throw new NotFoundException(`Shopping bag not found: ${id}`);
    }
    return this.toResponse(id);
  }

  async addItem(
    bagId: string,
    dto: AddShoppingBagItemDto,
  ): Promise<EnrichedShoppingBagItem> {
    if (!dto.canonicalProductId && !dto.retailerProductId) {
      throw new BadRequestException(
        'Either canonicalProductId or retailerProductId is required',
      );
    }
    if (dto.retailerProductId && !dto.retailerId) {
      throw new BadRequestException(
        'retailerId is required when retailerProductId is set',
      );
    }
    await this.ensureExists(bagId);

    if (dto.canonicalProductId) {
      const exists = await this.prisma.client.canonicalProduct.findUnique({
        where: { id: dto.canonicalProductId },
        select: { id: true },
      });
      if (!exists) {
        throw new BadRequestException(
          `canonicalProductId not found: ${dto.canonicalProductId}`,
        );
      }
    }

    const created = await this.prisma.client.shoppingBagItem.create({
      data: {
        bagId,
        quantity: dto.quantity,
        canonicalProductId: dto.canonicalProductId,
        retailerId: dto.retailerId,
        retailerProductId: dto.retailerProductId,
        note: dto.note,
      },
    });
    await this.touchBag(bagId);
    const enriched = await this.catalog.enrichBagItems([this.rowToShared(created)]);
    return enriched[0]!;
  }

  async updateItem(
    bagId: string,
    itemId: string,
    dto: UpdateShoppingBagItemDto,
  ): Promise<EnrichedShoppingBagItem> {
    const item = await this.prisma.client.shoppingBagItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.bagId !== bagId) {
      throw new NotFoundException(`Shopping bag item not found: ${itemId}`);
    }
    const updated = await this.prisma.client.shoppingBagItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity ?? undefined,
        note: dto.note ?? undefined,
      },
    });
    await this.touchBag(bagId);
    const enriched = await this.catalog.enrichBagItems([this.rowToShared(updated)]);
    return enriched[0]!;
  }

  async removeItem(bagId: string, itemId: string): Promise<void> {
    const item = await this.prisma.client.shoppingBagItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.bagId !== bagId) {
      throw new NotFoundException(`Shopping bag item not found: ${itemId}`);
    }
    await this.prisma.client.shoppingBagItem.delete({ where: { id: itemId } });
    await this.touchBag(bagId);
  }

  // -------- Helpers --------

  private async touchBag(bagId: string): Promise<void> {
    await this.prisma.client.shoppingBag.update({
      where: { id: bagId },
      data: { updatedAt: new Date() },
    });
  }

  private async toResponse(id: string): Promise<ShoppingBagResponse> {
    const bag = await this.prisma.client.shoppingBag.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!bag) {
      throw new NotFoundException(`Shopping bag not found: ${id}`);
    }
    const sharedItems = bag.items.map((row) => this.rowToShared(row));
    const enriched = await this.catalog.enrichBagItems(sharedItems);
    return {
      id: bag.id,
      label: bag.label ?? undefined,
      createdAt: bag.createdAt,
      updatedAt: bag.updatedAt,
      userSessionId: bag.userSessionId ?? undefined,
      items: enriched,
    };
  }

  private rowToShared(row: ShoppingBagItemRow): ShoppingBagItem {
    return {
      id: row.id,
      bagId: row.bagId,
      quantity: this.decimalToNumber(row.quantity),
      canonicalProductId: row.canonicalProductId ?? undefined,
      retailerId: row.retailerId ?? undefined,
      retailerProductId: row.retailerProductId ?? undefined,
      note: row.note ?? undefined,
    };
  }

  /** Prisma `Decimal` arrives as either a Decimal-like object or a string. */
  private decimalToNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { toNumber?: () => number }).toNumber === 'function'
    ) {
      return (value as { toNumber: () => number }).toNumber();
    }
    return Number(value);
  }
}

type ShoppingBagItemRow = {
  id: string;
  bagId: string;
  quantity: unknown;
  canonicalProductId: string | null;
  retailerId: string | null;
  retailerProductId: string | null;
  note: string | null;
};
