import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationStatus, ConversationStatusType } from '../../database/schema';

export class UpdateConversationDto {
  @ApiPropertyOptional({
    description: 'Nome do cliente',
    example: 'João Silva',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customerName?: string;

  @ApiPropertyOptional({
    description: 'Status da conversa',
    enum: ConversationStatus,
    example: 'active'
  })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatusType;
}