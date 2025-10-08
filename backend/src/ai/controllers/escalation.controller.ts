import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody
} from '@nestjs/swagger';
import { EscalationService } from '../services/escalation.service';
import type { EscalationRule, ManualReviewItem, EscalationMetrics } from '../services/escalation.service';
import { ConfidenceScoringService } from '../services/confidence-scoring.service';
import { ConversationGoalType } from '../../database/schema';

class CreateEscalationRuleDto {
  name: string;
  description: string;
  condition: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  autoEscalate: boolean;
  notificationRequired: boolean;
}

class UpdateManualReviewDto {
  status?: 'pending' | 'in_review' | 'approved' | 'rejected' | 'modified';
  assignedTo?: string;
  reviewNotes?: string;
  suggestedResponse?: string;
}

class EscalateConversationDto {
  reason: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  escalatedBy?: string;
}

class ResolveEscalationDto {
  resolution: string;
  resolvedBy: string;
}

class UpdateConfidenceThresholdDto {
  goal: ConversationGoalType;
  threshold: number;
}

@ApiTags('Escalation & Confidence')
@Controller('ai/escalation')
export class EscalationController {
  constructor(
    private readonly escalationService: EscalationService,
    private readonly confidenceScoringService: ConfidenceScoringService
  ) {}

  @Get('rules')
  @ApiOperation({ 
    summary: 'Listar regras de escalação',
    description: 'Retorna todas as regras de escalação configuradas no sistema'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de regras de escalação retornada com sucesso'
  })
  getEscalationRules(): EscalationRule[] {
    return this.escalationService.getEscalationRules();
  }

  @Post('rules')
  @ApiOperation({ 
    summary: 'Criar regra de escalação',
    description: 'Cria uma nova regra personalizada de escalação'
  })
  @ApiBody({ type: CreateEscalationRuleDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Regra de escalação criada com sucesso'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos fornecidos'
  })
  @HttpCode(HttpStatus.CREATED)
  createEscalationRule(@Body() createRuleDto: CreateEscalationRuleDto): void {
    try {
      const rule: EscalationRule = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        ...createRuleDto
      };

      this.escalationService.addEscalationRule(rule);
    } catch (error) {
      throw new BadRequestException(`Erro ao criar regra de escalação: ${error.message}`);
    }
  }

  @Put('rules/:ruleId')
  @ApiOperation({ 
    summary: 'Remover regra de escalação',
    description: 'Remove uma regra de escalação existente'
  })
  @ApiParam({ name: 'ruleId', description: 'ID da regra de escalação' })
  @ApiResponse({ 
    status: 200, 
    description: 'Regra de escalação removida com sucesso'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Regra de escalação não encontrada'
  })
  removeEscalationRule(@Param('ruleId') ruleId: string): void {
    this.escalationService.removeEscalationRule(ruleId);
  }

  @Get('manual-review')
  @ApiOperation({ 
    summary: 'Listar itens da fila de revisão manual',
    description: 'Retorna itens da fila de revisão manual com filtros opcionais'
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por status' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filtrar por prioridade' })
  @ApiQuery({ name: 'assignedTo', required: false, description: 'Filtrar por responsável' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite de itens por página' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset para paginação' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de itens de revisão manual retornada com sucesso'
  })
  getManualReviewQueue(
    @Query('status') status?: ManualReviewItem['status'],
    @Query('priority') priority?: ManualReviewItem['priority'],
    @Query('assignedTo') assignedTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): { items: ManualReviewItem[]; total: number } {
    const filters = {
      status,
      priority,
      assignedTo,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined
    };

    return this.escalationService.getManualReviewQueue(filters);
  }

  @Put('manual-review/:itemId')
  @ApiOperation({ 
    summary: 'Atualizar item de revisão manual',
    description: 'Atualiza o status e informações de um item na fila de revisão manual'
  })
  @ApiParam({ name: 'itemId', description: 'ID do item de revisão manual' })
  @ApiBody({ type: UpdateManualReviewDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Item de revisão manual atualizado com sucesso'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Item de revisão manual não encontrado'
  })
  updateManualReviewItem(
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateManualReviewDto
  ): ManualReviewItem {
    try {
      return this.escalationService.updateManualReviewItem(itemId, updateDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Erro ao atualizar item de revisão: ${error.message}`);
    }
  }

  @Post('conversations/:conversationId/escalate')
  @ApiOperation({ 
    summary: 'Escalar conversa manualmente',
    description: 'Escala uma conversa específica para revisão manual'
  })
  @ApiParam({ name: 'conversationId', description: 'ID da conversa' })
  @ApiBody({ type: EscalateConversationDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Conversa escalada com sucesso'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Conversa não encontrada'
  })
  @HttpCode(HttpStatus.OK)
  async escalateConversation(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() escalateDto: EscalateConversationDto
  ): Promise<void> {
    try {
      await this.escalationService.escalateConversation(
        conversationId,
        escalateDto.reason,
        escalateDto.priority || 'medium',
        escalateDto.escalatedBy
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Erro ao escalar conversa: ${error.message}`);
    }
  }

  @Get('conversations/:conversationId/events')
  @ApiOperation({ 
    summary: 'Listar eventos de escalação de uma conversa',
    description: 'Retorna todos os eventos de escalação relacionados a uma conversa específica'
  })
  @ApiParam({ name: 'conversationId', description: 'ID da conversa' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de eventos de escalação retornada com sucesso'
  })
  getConversationEscalationEvents(
    @Param('conversationId', ParseUUIDPipe) conversationId: string
  ) {
    return this.escalationService.getConversationEscalationEvents(conversationId);
  }

  @Put('events/:eventId/resolve')
  @ApiOperation({ 
    summary: 'Resolver evento de escalação',
    description: 'Marca um evento de escalação como resolvido'
  })
  @ApiParam({ name: 'eventId', description: 'ID do evento de escalação' })
  @ApiBody({ type: ResolveEscalationDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Evento de escalação resolvido com sucesso'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Evento de escalação não encontrado'
  })
  resolveEscalationEvent(
    @Param('eventId') eventId: string,
    @Body() resolveDto: ResolveEscalationDto
  ) {
    try {
      return this.escalationService.resolveEscalationEvent(
        eventId,
        resolveDto.resolution,
        resolveDto.resolvedBy
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Erro ao resolver evento de escalação: ${error.message}`);
    }
  }

  @Get('metrics')
  @ApiOperation({ 
    summary: 'Obter métricas de escalação',
    description: 'Retorna métricas e estatísticas sobre escalações no sistema'
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data de início para filtro (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data de fim para filtro (ISO string)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Métricas de escalação retornadas com sucesso'
  })
  getEscalationMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): EscalationMetrics {
    const timeRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate)
    } : undefined;

    return this.escalationService.getEscalationMetrics(timeRange);
  }

  @Get('confidence/thresholds')
  @ApiOperation({ 
    summary: 'Obter limites de confiança por objetivo',
    description: 'Retorna os limites de confiança configurados para cada objetivo de conversa'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Limites de confiança retornados com sucesso'
  })
  getConfidenceThresholds(): Record<ConversationGoalType, number> {
    const goals: ConversationGoalType[] = ['helpful', 'deal_closer', 'support_agent', 'lead_generator', 'custom'];
    const thresholds: Record<ConversationGoalType, number> = {} as any;

    for (const goal of goals) {
      thresholds[goal] = this.confidenceScoringService.getConfidenceThreshold(goal);
    }

    return thresholds;
  }

  @Put('confidence/thresholds')
  @ApiOperation({ 
    summary: 'Atualizar limite de confiança',
    description: 'Atualiza o limite de confiança para um objetivo específico'
  })
  @ApiBody({ type: UpdateConfidenceThresholdDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Limite de confiança atualizado com sucesso'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos fornecidos'
  })
  @HttpCode(HttpStatus.OK)
  updateConfidenceThreshold(@Body() updateDto: UpdateConfidenceThresholdDto): void {
    try {
      if (updateDto.threshold < 0 || updateDto.threshold > 1) {
        throw new BadRequestException('O limite de confiança deve estar entre 0 e 1');
      }

      this.confidenceScoringService.updateConfidenceThreshold(
        updateDto.goal,
        updateDto.threshold
      );
    } catch (error) {
      throw new BadRequestException(`Erro ao atualizar limite de confiança: ${error.message}`);
    }
  }

  @Get('confidence/statistics')
  @ApiOperation({ 
    summary: 'Obter estatísticas de confiança',
    description: 'Retorna estatísticas sobre os scores de confiança das respostas'
  })
  @ApiQuery({ name: 'scores', required: true, description: 'Array de scores de confiança (separados por vírgula)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estatísticas de confiança retornadas com sucesso'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Scores inválidos fornecidos'
  })
  getConfidenceStatistics(@Query('scores') scoresParam: string) {
    try {
      const scores = scoresParam.split(',').map(score => {
        const parsed = parseFloat(score.trim());
        if (isNaN(parsed) || parsed < 0 || parsed > 1) {
          throw new Error(`Score inválido: ${score}`);
        }
        return parsed;
      });

      return this.confidenceScoringService.getConfidenceStatistics(scores);
    } catch (error) {
      throw new BadRequestException(`Erro ao processar scores: ${error.message}`);
    }
  }
}