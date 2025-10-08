import { IsOptional, IsEnum, IsString, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ConversationStatus, ConversationStatusType } from '../../database/schema';

export class ConversationQueryDto {
  @ApiPropertyOptional({
    description: 'Status da conversa para filtrar',
    enum: ConversationStatus,
    example: 'active'
  })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatusType;

  @ApiPropertyOptional({
    description: 'Número de telefone do cliente para filtrar',
    example: '+5511999999999'
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Data de início para filtrar conversas (ISO 8601)',
    example: '2024-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data de fim para filtrar conversas (ISO 8601)',
    example: '2024-01-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Número da página (começa em 1)',
    example: 1,
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Número de itens por página',
    example: 20,
    minimum: 1,
    default: 20
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}