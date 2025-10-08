import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  HttpStatus,
  HttpCode,
  BadRequestException,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger';
import { AIService } from '../services/ai.service';
import { ConversationGoalService } from '../services/conversation-goal.service';
import { ConfidenceScoringService } from '../services/confidence-scoring.service';
import { DatabaseService } from '../../database/database.service';
import { aiConfiguration } from '../../database/schema';
import { eq } from 'drizzle-orm';
import type { ConversationGoalType, AIConfiguration } from '../../database/schema';

interface AIConfigurationDto {
  conversationGoal?: ConversationGoalType;
  confidenceThreshold?: number;
  responseStyle?: string;
  fallbackMessage?: string;
  businessHours?: {
    timezone: string;
    schedule: {
      [key: string]: { start: string; end: string; active: boolean };
    };
  };
  enableManualReview?: boolean;
  customGoalPrompt?: string;
  customGoalInstructions?: string;
  customGoalStyle?: string;
}

interface AIStatusDto {
  isConfigured: boolean;
  currentGoal: ConversationGoalType;
  confidenceThreshold: number;
  totalTrainingExamples: number;
  lastTrainingDate?: Date;
  isWithinBusinessHours: boolean;
  configuration: AIConfiguration;
}

interface BusinessHoursDto {
  timezone: string;
  schedule: {
    monday: { start: string; end: string; active: boolean };
    tuesday: { start: string; end: string; active: boolean };
    wednesday: { start: string; end: string; active: boolean };
    thursday: { start: string; end: string; active: boolean };
    friday: { start: string; end: string; active: boolean };
    saturday: { start: string; end: string; active: boolean };
    sunday: { start: string; end: string; active: boolean };
  };
}

interface TestAIResponseDto {
  message: string;
  conversationGoal?: ConversationGoalType;
  includeProducts?: boolean;
}

@ApiTags('AI Configuration')
@Controller('api/ai/configuration')
export class AIConfigurationController {
  private readonly logger = new Logger(AIConfigurationController.name);

  constructor(
    private readonly aiService: AIService,
    private readonly conversationGoalService: ConversationGoalService,
    private readonly confidenceScoringService: ConfidenceScoringService,
    private readonly databaseService: DatabaseService
  ) {}

  @Get('status')
  @ApiOperation({ 
    summary: 'Get AI system status',
    description: 'Returns the current AI configuration and system status'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI status returned successfully'
  })
  async getAIStatus(): Promise<AIStatusDto> {
    try {
      const configuration = await this.getConfiguration();
      const currentGoal = this.aiService.getCurrentGoal();
      const confidenceThreshold = this.confidenceScoringService.getConfidenceThreshold(currentGoal);
      
      // Check if we're within business hours
      const isWithinBusinessHours = this.isWithinBusinessHours(configuration.businessHours);

      return {
        isConfigured: !!configuration,
        currentGoal,
        confidenceThreshold,
        totalTrainingExamples: 0, // This would come from training service
        isWithinBusinessHours,
        configuration
      };
    } catch (error) {
      this.logger.error('Error getting AI status:', error);
      throw new InternalServerErrorException(`Failed to get AI status: ${error.message}`);
    }
  }

  @Get('configuration')
  @ApiOperation({ 
    summary: 'Get AI configuration',
    description: 'Returns the current AI configuration settings'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI configuration returned successfully'
  })
  async getConfiguration(): Promise<AIConfiguration> {
    try {
      const db = this.databaseService.getDatabase();
      const configs = await db.select().from(aiConfiguration).limit(1);
      
      if (configs.length === 0) {
        // Return default configuration
        return {
          id: 'default',
          conversationGoal: 'helpful',
          confidenceThreshold: '0.80',
          responseStyle: 'friendly and professional',
          fallbackMessage: 'I apologize, but I need to connect you with a human agent to better assist you.',
          businessHours: {
            timezone: 'America/Sao_Paulo',
            schedule: {
              monday: { start: '09:00', end: '18:00', active: true },
              tuesday: { start: '09:00', end: '18:00', active: true },
              wednesday: { start: '09:00', end: '18:00', active: true },
              thursday: { start: '09:00', end: '18:00', active: true },
              friday: { start: '09:00', end: '18:00', active: true },
              saturday: { start: '09:00', end: '14:00', active: true },
              sunday: { start: '09:00', end: '14:00', active: false }
            }
          },
          enableManualReview: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      return configs[0];
    } catch (error) {
      this.logger.error('Error getting AI configuration:', error);
      throw new InternalServerErrorException(`Failed to get AI configuration: ${error.message}`);
    }
  }

  @Put('configuration')
  @ApiOperation({ 
    summary: 'Update AI configuration',
    description: 'Updates the AI system configuration settings'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI configuration updated successfully'
  })
  @ApiBadRequestResponse({ description: 'Invalid configuration data' })
  @ApiInternalServerErrorResponse({ description: 'Configuration update failed' })
  async updateConfiguration(
    @Body() configDto: AIConfigurationDto
  ): Promise<{
    success: boolean;
    message: string;
    configuration: AIConfiguration;
  }> {
    try {
      this.logger.log('Updating AI configuration');

      // Validate configuration data
      if (configDto.confidenceThreshold !== undefined) {
        if (configDto.confidenceThreshold < 0 || configDto.confidenceThreshold > 1) {
          throw new BadRequestException('Confidence threshold must be between 0 and 1');
        }
      }

      if (configDto.conversationGoal) {
        const validGoals: ConversationGoalType[] = ['helpful', 'deal_closer', 'support_agent', 'lead_generator', 'custom'];
        if (!validGoals.includes(configDto.conversationGoal)) {
          throw new BadRequestException('Invalid conversation goal');
        }
      }

      // Update configuration in database
      const db = this.databaseService.getDatabase();
      const configs = await db.select().from(aiConfiguration).limit(1);
      
      const updateData: any = {};
      if (configDto.conversationGoal) updateData.conversationGoal = configDto.conversationGoal;
      if (configDto.confidenceThreshold !== undefined) updateData.confidenceThreshold = configDto.confidenceThreshold.toString();
      if (configDto.responseStyle) updateData.responseStyle = configDto.responseStyle;
      if (configDto.fallbackMessage) updateData.fallbackMessage = configDto.fallbackMessage;
      if (configDto.businessHours) updateData.businessHours = configDto.businessHours;
      if (configDto.enableManualReview !== undefined) updateData.enableManualReview = configDto.enableManualReview;
      updateData.updatedAt = new Date();

      let updatedConfig: AIConfiguration;
      
      if (configs.length === 0) {
        // Create new configuration
        const newConfig = {
          conversationGoal: configDto.conversationGoal || 'helpful',
          confidenceThreshold: (configDto.confidenceThreshold || 0.8).toString(),
          responseStyle: configDto.responseStyle || 'friendly and professional',
          fallbackMessage: configDto.fallbackMessage || 'I apologize, but I need to connect you with a human agent to better assist you.',
          businessHours: configDto.businessHours || {
            timezone: 'America/Sao_Paulo',
            schedule: {
              monday: { start: '09:00', end: '18:00', active: true },
              tuesday: { start: '09:00', end: '18:00', active: true },
              wednesday: { start: '09:00', end: '18:00', active: true },
              thursday: { start: '09:00', end: '18:00', active: true },
              friday: { start: '09:00', end: '18:00', active: true },
              saturday: { start: '09:00', end: '14:00', active: true },
              sunday: { start: '09:00', end: '14:00', active: false }
            }
          },
          enableManualReview: configDto.enableManualReview || false
        };
        
        const [inserted] = await db.insert(aiConfiguration).values(newConfig).returning();
        updatedConfig = inserted;
      } else {
        const [updated] = await db.update(aiConfiguration)
          .set(updateData)
          .where(eq(aiConfiguration.id, configs[0].id))
          .returning();
        updatedConfig = updated;
      }

      // Update conversation goal if provided
      if (configDto.conversationGoal) {
        await this.aiService.setConversationGoal(configDto.conversationGoal);
      }

      // Update confidence threshold if provided
      if (configDto.confidenceThreshold !== undefined && configDto.conversationGoal) {
        this.confidenceScoringService.updateConfidenceThreshold(
          configDto.conversationGoal,
          configDto.confidenceThreshold
        );
      }

      // Update custom goal if provided
      if (configDto.conversationGoal === 'custom' && 
          (configDto.customGoalPrompt || configDto.customGoalInstructions)) {
        await this.aiService.updateCustomGoal(
          configDto.customGoalPrompt || '',
          configDto.customGoalInstructions ? [configDto.customGoalInstructions] : [],
          configDto.customGoalStyle
        );
      }

      this.logger.log('AI configuration updated successfully');
      return {
        success: true,
        message: 'AI configuration updated successfully',
        configuration: updatedConfig
      };
    } catch (error) {
      this.logger.error('Error updating AI configuration:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Configuration update failed: ${error.message}`);
    }
  }

  @Get('business-hours')
  @ApiOperation({ 
    summary: 'Get business hours configuration',
    description: 'Returns the current business hours settings'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Business hours returned successfully'
  })
  async getBusinessHours(): Promise<{
    businessHours: BusinessHoursDto;
    isWithinBusinessHours: boolean;
    currentTime: string;
  }> {
    try {
      const configuration = await this.getConfiguration();
      const businessHours = configuration.businessHours as BusinessHoursDto;
      const isWithinBusinessHours = this.isWithinBusinessHours(businessHours);
      
      return {
        businessHours,
        isWithinBusinessHours,
        currentTime: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error getting business hours:', error);
      throw new InternalServerErrorException(`Failed to get business hours: ${error.message}`);
    }
  }

  @Put('business-hours')
  @ApiOperation({ 
    summary: 'Update business hours',
    description: 'Updates the business hours configuration'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Business hours updated successfully'
  })
  @ApiBadRequestResponse({ description: 'Invalid business hours data' })
  async updateBusinessHours(
    @Body() businessHoursDto: BusinessHoursDto
  ): Promise<{
    success: boolean;
    message: string;
    businessHours: BusinessHoursDto;
  }> {
    try {
      this.logger.log('Updating business hours');

      // Validate business hours format
      if (!businessHoursDto.timezone) {
        throw new BadRequestException('Timezone is required');
      }

      if (!businessHoursDto.schedule) {
        throw new BadRequestException('Schedule is required');
      }

      // Validate each day's schedule
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const day of days) {
        if (!businessHoursDto.schedule[day]) {
          throw new BadRequestException(`Schedule for ${day} is required`);
        }

        const daySchedule = businessHoursDto.schedule[day];
        if (daySchedule.active) {
          if (!daySchedule.start || !daySchedule.end) {
            throw new BadRequestException(`Start and end times are required for active ${day}`);
          }

          // Validate time format (HH:MM)
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(daySchedule.start) || !timeRegex.test(daySchedule.end)) {
            throw new BadRequestException(`Invalid time format for ${day}. Use HH:MM format`);
          }
        }
      }

      // Update configuration in database
      const db = this.databaseService.getDatabase();
      const configs = await db.select().from(aiConfiguration).limit(1);
      
      if (configs.length === 0) {
        // Create new configuration with business hours
        await db.insert(aiConfiguration).values({
          businessHours: businessHoursDto
        });
      } else {
        await db.update(aiConfiguration)
          .set({ 
            businessHours: businessHoursDto,
            updatedAt: new Date()
          })
          .where(eq(aiConfiguration.id, configs[0].id));
      }

      this.logger.log('Business hours updated successfully');
      return {
        success: true,
        message: 'Business hours updated successfully',
        businessHours: businessHoursDto
      };
    } catch (error) {
      this.logger.error('Error updating business hours:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Business hours update failed: ${error.message}`);
    }
  }

  @Post('test-response')
  @ApiOperation({ 
    summary: 'Test AI response',
    description: 'Tests the AI response generation with a sample message'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI response test completed'
  })
  @ApiBadRequestResponse({ description: 'Invalid test data' })
  @HttpCode(HttpStatus.OK)
  async testAIResponse(
    @Body() testDto: TestAIResponseDto
  ): Promise<{
    success: boolean;
    message: string;
    response?: {
      content: string;
      confidence: number;
      shouldEscalate: boolean;
      processingTime: number;
      metadata?: any;
    };
    error?: string;
  }> {
    try {
      this.logger.log('Testing AI response generation');

      if (!testDto.message?.trim()) {
        throw new BadRequestException('Test message is required');
      }

      const startTime = Date.now();

      // Create test context
      const testContext = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: testDto.includeProducts ? [] : [], // Would fetch products if needed
        conversationGoal: testDto.conversationGoal || this.aiService.getCurrentGoal()
      };

      // Process the test message
      const response = await this.aiService.processMessage(
        {
          content: testDto.message,
          customerPhone: '+5511999999999'
        },
        testContext
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        message: 'AI response generated successfully',
        response: {
          content: response.content,
          confidence: response.confidence,
          shouldEscalate: response.shouldEscalate,
          processingTime,
          metadata: response.metadata
        }
      };
    } catch (error) {
      this.logger.error('Error testing AI response:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      return {
        success: false,
        message: 'AI response test failed',
        error: error.message
      };
    }
  }

  @Post('reset-configuration')
  @ApiOperation({ 
    summary: 'Reset AI configuration to defaults',
    description: 'Resets the AI configuration to default values'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI configuration reset successfully'
  })
  @HttpCode(HttpStatus.OK)
  async resetConfiguration(): Promise<{
    success: boolean;
    message: string;
    configuration: AIConfiguration;
  }> {
    try {
      this.logger.log('Resetting AI configuration to defaults');

      const defaultConfig: AIConfigurationDto = {
        conversationGoal: 'helpful',
        confidenceThreshold: 0.8,
        responseStyle: 'friendly and professional',
        fallbackMessage: 'I apologize, but I need to connect you with a human agent to better assist you.',
        enableManualReview: false,
        businessHours: {
          timezone: 'America/Sao_Paulo',
          schedule: {
            monday: { start: '09:00', end: '18:00', active: true },
            tuesday: { start: '09:00', end: '18:00', active: true },
            wednesday: { start: '09:00', end: '18:00', active: true },
            thursday: { start: '09:00', end: '18:00', active: true },
            friday: { start: '09:00', end: '18:00', active: true },
            saturday: { start: '09:00', end: '14:00', active: true },
            sunday: { start: '09:00', end: '14:00', active: false }
          }
        }
      };

      // Reset configuration in database
      const db = this.databaseService.getDatabase();
      const configs = await db.select().from(aiConfiguration).limit(1);
      
      const defaultConfigData = {
        conversationGoal: 'helpful' as ConversationGoalType,
        confidenceThreshold: '0.8',
        responseStyle: 'friendly and professional',
        fallbackMessage: 'I apologize, but I need to connect you with a human agent to better assist you.',
        enableManualReview: false,
        businessHours: defaultConfig.businessHours,
        updatedAt: new Date()
      };

      let updatedConfig: AIConfiguration;
      
      if (configs.length === 0) {
        const [inserted] = await db.insert(aiConfiguration).values(defaultConfigData).returning();
        updatedConfig = inserted;
      } else {
        const [updated] = await db.update(aiConfiguration)
          .set(defaultConfigData)
          .where(eq(aiConfiguration.id, configs[0].id))
          .returning();
        updatedConfig = updated;
      }
      
      await this.aiService.setConversationGoal('helpful');

      this.logger.log('AI configuration reset successfully');
      return {
        success: true,
        message: 'AI configuration reset to defaults successfully',
        configuration: updatedConfig
      };
    } catch (error) {
      this.logger.error('Error resetting AI configuration:', error);
      throw new InternalServerErrorException(`Configuration reset failed: ${error.message}`);
    }
  }

  private isWithinBusinessHours(businessHours: any): boolean {
    try {
      if (!businessHours || !businessHours.schedule) {
        return true; // Default to always available if not configured
      }

      const now = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[now.getDay()];
      
      const daySchedule = businessHours.schedule[currentDay];
      if (!daySchedule || !daySchedule.active) {
        return false;
      }

      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      return currentTime >= daySchedule.start && currentTime <= daySchedule.end;
    } catch (error) {
      this.logger.error('Error checking business hours:', error);
      return true; // Default to available on error
    }
  }
}