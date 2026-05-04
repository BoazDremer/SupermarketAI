import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateShoppingBagItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
