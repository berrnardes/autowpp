import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpStatus,
  HttpException,
  Logger
} from '@nestjs/common';
import { AIService } from '../services/ai.service';
import { ConversationGoalService } from '../services/conversation-goal.service';
import {
  SetConversationGoalDto,
  UpdateCustomGoalDto,
  ConversationGoalConfigDto
} from '../dto/conversation-goal.dto';
import type { ConversationGoalType } from '../../database/schema';

@Controller('ai/conversation-goals')
export class ConversationGoalController {
  private readonly logger = new Logger(ConversationGoalController.name);

  constructor(
    private readonly aiService: AIService,
    private readonly conversationGoalService: ConversationGoalService
  ) { }

  @Get()
  async getAvailableGoals() {
    try {
      const goals = this.conversationGoalService.getAvailableGoals();
      return {
        success: true,
        data: goals,
        message: 'Objetivos de conversa recuperados com sucesso'
      };
    } catch (error) {
      this.logger.error('Error getting available goals', error);
      throw new HttpException(
        'Erro ao recuperar objetivos de conversa',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('current')
  async getCurrentGoal() {
    try {
      const currentGoal = this.aiService.getCurrentGoal();
      const goalConfig = this.conversationGoalService.getGoalConfiguration(currentGoal);

      return {
        success: true,
        data: {
          currentGoal,
          configuration: goalConfig
        },
        message: 'Objetivo atual recuperado com sucesso'
      };
    } catch (error) {
      this.logger.error('Error getting current goal', error);
      throw new HttpException(
        'Erro ao recuperar objetivo atual',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('configurations')
  async getAllConfigurations() {
    try {
      const configurations = this.conversationGoalService.getAllGoalConfigurations();
      return {
        success: true,
        data: configurations,
        message: 'Configurações de objetivos recuperadas com sucesso'
      };
    } catch (error) {
      this.logger.error('Error getting goal configurations', error);
      throw new HttpException(
        'Erro ao recuperar configurações de objetivos',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('configuration/:goalType')
  async getGoalConfiguration(@Param('goalType') goalType: ConversationGoalType) {
    try {
      const configuration = this.conversationGoalService.getGoalConfiguration(goalType);
      return {
        success: true,
        data: configuration,
        message: `Configuração do objetivo ${goalType} recuperada com sucesso`
      };
    } catch (error) {
      this.logger.error(`Error getting configuration for goal ${goalType}`, error);
      throw new HttpException(
        `Erro ao recuperar configuração do objetivo ${goalType}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('metrics/:goalType')
  async getGoalMetrics(@Param('goalType') goalType: ConversationGoalType) {
    try {
      const metrics = this.conversationGoalService.getGoalSpecificMetrics(goalType);
      return {
        success: true,
        data: metrics,
        message: `Métricas do objetivo ${goalType} recuperadas com sucesso`
      };
    } catch (error) {
      this.logger.error(`Error getting metrics for goal ${goalType}`, error);
      throw new HttpException(
        `Erro ao recuperar métricas do objetivo ${goalType}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('set')
  async setConversationGoal(@Body() setGoalDto: SetConversationGoalDto) {
    try {
      await this.aiService.setConversationGoal(setGoalDto.goalType);

      const goalConfig = this.conversationGoalService.getGoalConfiguration(setGoalDto.goalType);

      return {
        success: true,
        data: {
          goalType: setGoalDto.goalType,
          configuration: goalConfig
        },
        message: `Objetivo de conversa definido como: ${goalConfig.name}`
      };
    } catch (error) {
      this.logger.error('Error setting conversation goal', error);
      throw new HttpException(
        'Erro ao definir objetivo de conversa',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('custom')
  async updateCustomGoal(@Body() updateCustomGoalDto: UpdateCustomGoalDto) {
    try {
      await this.aiService.updateCustomGoal(
        updateCustomGoalDto.customPrompt,
        updateCustomGoalDto.customInstructions,
        updateCustomGoalDto.customStyle
      );

      const updatedConfig = this.conversationGoalService.getGoalConfiguration('custom');

      return {
        success: true,
        data: updatedConfig,
        message: 'Objetivo personalizado atualizado com sucesso'
      };
    } catch (error) {
      this.logger.error('Error updating custom goal', error);
      throw new HttpException(
        'Erro ao atualizar objetivo personalizado',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('test/:goalType')
  async testGoalBehavior(
    @Param('goalType') goalType: ConversationGoalType,
    @Body() testData: { message: string; products?: any[] }
  ) {
    let originalGoal: ConversationGoalType | undefined;

    try {
      // Temporarily set the goal for testing
      originalGoal = this.aiService.getCurrentGoal();
      await this.aiService.setConversationGoal(goalType);

      // Create a test context
      const testContext = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: testData.products || [],
        conversationGoal: goalType
      };

      // Process the test message
      const response = await this.aiService.processMessage(
        {
          content: testData.message,
          customerPhone: '+5511999999999'
        },
        testContext
      );

      return {
        success: true,
        data: {
          testMessage: testData.message,
          goalType,
          response: response.content,
          confidence: response.confidence,
          shouldEscalate: response.shouldEscalate,
          metadata: response.metadata
        },
        message: `Teste do objetivo ${goalType} executado com sucesso`
      };
    } catch (error) {
      this.logger.error(`Error testing goal behavior for ${goalType}`, error);
      throw new HttpException(
        `Erro ao testar comportamento do objetivo ${goalType}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    } finally {
      // Always restore original goal, even if there was an error
      if (originalGoal) {
        try {
          await this.aiService.setConversationGoal(originalGoal);
        } catch (restoreError) {
          this.logger.error('Error restoring original goal', restoreError);
        }
      }
    }
  }
}