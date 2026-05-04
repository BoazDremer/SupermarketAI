import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AddShoppingBagItemDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsString()
  canonicalProductId?: string;

  @IsOptional()
  @IsString()
  retailerId?: string;

  @IsOptional()
  @IsString()
  retailerProductId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
