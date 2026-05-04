import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateShoppingBagDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  userSessionId?: string;
}
