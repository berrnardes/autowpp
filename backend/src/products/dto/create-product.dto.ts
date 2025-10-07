import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsArray, IsIn, Min, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsString()
  @IsOptional()
  @IsIn(['USD', 'BRL', 'EUR'])
  currency?: string = 'BRL';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[] = [];

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  inStock?: boolean = true;
}