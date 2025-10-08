import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min, Max, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../../database/schema';
import type{ MessageTypeType } from '../../database/schema';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Conteúdo da mensagem',
    example: 'Olá, gostaria de saber mais sobre seus produtos'
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Tipo da mensagem',
    enum: MessageType,
    example: 'incoming'
  })
  @IsEnum(MessageType)
  type: MessageTypeType;

  @ApiPropertyOptional({
    description: 'Indica se a mensagem foi gerada por IA',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  isAI?: boolean;

  @ApiPropertyOptional({
    description: 'Nível de confiança da resposta da IA (0.0 a 1.0)',
    example: 0.85,
    minimum: 0,
    maximum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({
    description: 'Metadados adicionais da mensagem',
    example: { messageId: 'wamid.xxx', timestamp: '2024-01-01T10:00:00Z' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}