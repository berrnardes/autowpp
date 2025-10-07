import { IsString, IsNotEmpty, IsOptional, IsObject, IsPhoneNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ProcessMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsOptional()
  @Type(() => Date)
  timestamp?: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateConversationGoalDto {
  @IsString()
  @IsNotEmpty()
  conversationGoal: 'helpful' | 'deal_closer' | 'support_agent' | 'lead_generator' | 'custom';
}

export class TrainModelDto {
  @IsString()
  @IsNotEmpty()
  customerMessage: string;

  @IsString()
  @IsNotEmpty()
  desiredResponse: string;

  @IsOptional()
  @IsString()
  category?: string;
}