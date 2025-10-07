import { IsOptional, IsNumber, IsString, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadImageDto {
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(2000)
  @Type(() => Number)
  maxWidth?: number = 1200;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(2000)
  @Type(() => Number)
  maxHeight?: number = 1200;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  @Type(() => Number)
  quality?: number = 85;

  @IsOptional()
  @IsString()
  @IsIn(['jpeg', 'png', 'webp'])
  format?: 'jpeg' | 'png' | 'webp' = 'jpeg';
}