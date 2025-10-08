import { IsString, IsOptional, IsPhoneNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Número de telefone do cliente no formato internacional',
    example: '+5511999999999'
  })
  @IsString()
  @IsPhoneNumber()
  customerPhone: string;

  @ApiPropertyOptional({
    description: 'Nome do cliente',
    example: 'João Silva',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customerName?: string;
}