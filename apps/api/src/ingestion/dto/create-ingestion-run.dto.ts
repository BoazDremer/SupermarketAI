import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIngestionRunDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  retailerKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
