import { IsEnum, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ConversationGoal } from '../../database/schema';
import type { ConversationGoalType } from '../../database/schema';

export class ResponseStyleDto {
  @IsString()
  @IsOptional()
  tone?: string;

  @IsEnum(['concise', 'detailed', 'moderate'])
  @IsOptional()
  length?: 'concise' | 'detailed' | 'moderate';

  @IsEnum(['minimal', 'moderate', 'frequent'])
  @IsOptional()
  emojiUsage?: 'minimal' | 'moderate' | 'frequent';

  @IsEnum(['formal', 'casual', 'friendly'])
  @IsOptional()
  formality?: 'formal' | 'casual' | 'friendly';
}

export class SetConversationGoalDto {
  @IsEnum(ConversationGoal)
  goalType: ConversationGoalType;
}

export class UpdateCustomGoalDto {
  @IsString()
  customPrompt: string;

  @IsArray()
  @IsString({ each: true })
  customInstructions: string[];

  @ValidateNested()
  @Type(() => ResponseStyleDto)
  @IsOptional()
  customStyle?: ResponseStyleDto;
}

export class ConversationGoalConfigDto {
  @IsEnum(ConversationGoal)
  type: ConversationGoalType;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  systemPrompt: string;

  @IsArray()
  @IsString({ each: true })
  behaviorInstructions: string[];

  @ValidateNested()
  @Type(() => ResponseStyleDto)
  responseStyle: ResponseStyleDto;

  @IsArray()
  @IsString({ each: true })
  priorityActions: string[];

  @IsArray()
  @IsString({ each: true })
  escalationTriggers: string[];
}