import { IsString, IsOptional, MinLength, MaxLength, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateConversationExampleDto {
  @IsString({ message: 'Mensagem do cliente deve ser uma string' })
  @MinLength(3, { message: 'Mensagem do cliente deve ter pelo menos 3 caracteres' })
  @MaxLength(1000, { message: 'Mensagem do cliente não pode exceder 1000 caracteres' })
  @Transform(({ value }) => value?.trim())
  customerMessage: string;

  @IsString({ message: 'Resposta desejada deve ser uma string' })
  @MinLength(10, { message: 'Resposta desejada deve ter pelo menos 10 caracteres' })
  @MaxLength(2000, { message: 'Resposta desejada não pode exceder 2000 caracteres' })
  @Transform(({ value }) => value?.trim())
  desiredResponse: string;

  @IsOptional()
  @IsString({ message: 'Categoria deve ser uma string' })
  @MaxLength(100, { message: 'Categoria não pode exceder 100 caracteres' })
  @Transform(({ value }) => value?.trim() || undefined)
  category?: string;
}

export class UpdateConversationExampleDto {
  @IsOptional()
  @IsString({ message: 'Mensagem do cliente deve ser uma string' })
  @MinLength(3, { message: 'Mensagem do cliente deve ter pelo menos 3 caracteres' })
  @MaxLength(1000, { message: 'Mensagem do cliente não pode exceder 1000 caracteres' })
  @Transform(({ value }) => value?.trim())
  customerMessage?: string;

  @IsOptional()
  @IsString({ message: 'Resposta desejada deve ser uma string' })
  @MinLength(10, { message: 'Resposta desejada deve ter pelo menos 10 caracteres' })
  @MaxLength(2000, { message: 'Resposta desejada não pode exceder 2000 caracteres' })
  @Transform(({ value }) => value?.trim())
  desiredResponse?: string;

  @IsOptional()
  @IsString({ message: 'Categoria deve ser uma string' })
  @MaxLength(100, { message: 'Categoria não pode exceder 100 caracteres' })
  @Transform(({ value }) => value?.trim() || undefined)
  category?: string;
}

export class ConversationExampleQueryDto {
  @IsOptional()
  @IsString({ message: 'Categoria deve ser uma string' })
  @MaxLength(100, { message: 'Categoria não pode exceder 100 caracteres' })
  category?: string;

  @IsOptional()
  @IsString({ message: 'Termo de busca deve ser uma string' })
  @MaxLength(200, { message: 'Termo de busca não pode exceder 200 caracteres' })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limite deve ser um número' })
  @Min(1, { message: 'Limite deve ser pelo menos 1' })
  @Max(100, { message: 'Limite não pode exceder 100' })
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Offset deve ser um número' })
  @Min(0, { message: 'Offset deve ser pelo menos 0' })
  offset?: number = 0;
}

export class TrainModelDto {
  @IsOptional()
  @IsString({ message: 'Categoria deve ser uma string' })
  @MaxLength(100, { message: 'Categoria não pode exceder 100 caracteres' })
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limite de exemplos deve ser um número' })
  @Min(1, { message: 'Limite deve ser pelo menos 1' })
  @Max(50, { message: 'Limite não pode exceder 50 exemplos' })
  maxExamples?: number = 20;

  @IsOptional()
  @IsString({ message: 'Tipo de treinamento deve ser uma string' })
  trainingType?: 'few_shot' | 'validation' = 'few_shot';
}

export class BulkCreateExamplesDto {
  @IsString({ message: 'Dados devem ser uma string' })
  @MinLength(10, { message: 'Dados devem ter pelo menos 10 caracteres' })
  data: string;

  @IsOptional()
  @IsString({ message: 'Formato deve ser uma string' })
  format?: 'csv' | 'json' = 'csv';

  @IsOptional()
  @IsString({ message: 'Categoria padrão deve ser uma string' })
  @MaxLength(100, { message: 'Categoria não pode exceder 100 caracteres' })
  defaultCategory?: string;
}

export class ConversationExampleResponseDto {
  id: string;
  customerMessage: string;
  desiredResponse: string;
  category?: string;
  createdAt: Date;
}

export class ConversationExamplesListResponseDto {
  examples: ConversationExampleResponseDto[];
  total: number;
  limit: number;
  offset: number;
  categories: string[];
}

export class TrainingResultResponseDto {
  success: boolean;
  message: string;
  examplesProcessed: number;
  trainingType?: string;
  categories?: string[];
  validationResults?: {
    totalExamples: number;
    validExamples: number;
    averageMessageLength: number;
    averageResponseLength: number;
  };
}

export class TrainingDataStatsResponseDto {
  totalExamples: number;
  validExamples: number;
  categories: string[];
  averageMessageLength: number;
  averageResponseLength: number;
  examplesByCategory: Record<string, number>;
  recentExamples: ConversationExampleResponseDto[];
}