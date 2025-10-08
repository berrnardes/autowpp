import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse
} from '@nestjs/swagger';
import { ConversationService, ConversationWithMessages, PaginatedConversations } from '../services/conversation.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { UpdateConversationDto } from '../dto/update-conversation.dto';
import { CreateMessageDto } from '../dto/create-message.dto';
import { ConversationQueryDto } from '../dto/conversation-query.dto';
import { Conversation, Message } from '../../database/schema';

@ApiTags('Conversas')
@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Criar nova conversa',
    description: 'Cria uma nova conversa ou retorna uma conversa ativa existente para o cliente'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Conversa criada com sucesso',
    type: Object
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos fornecidos' })
  async createConversation(
    @Body(ValidationPipe) createConversationDto: CreateConversationDto
  ): Promise<Conversation> {
    return this.conversationService.createConversation(createConversationDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Listar conversas',
    description: 'Lista conversas com filtros opcionais e paginação'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de conversas retornada com sucesso'
  })
  async findConversations(
    @Query(ValidationPipe) query: ConversationQueryDto
  ): Promise<PaginatedConversations> {
    return this.conversationService.findConversations(query);
  }

  @Get('attention')
  @ApiOperation({ 
    summary: 'Conversas que precisam de atenção',
    description: 'Retorna conversas escaladas ou com mensagens de baixa confiança'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de conversas que precisam de atenção'
  })
  async findConversationsNeedingAttention(): Promise<ConversationWithMessages[]> {
    return this.conversationService.findConversationsNeedingAttention();
  }

  @Get('phone/:phoneNumber')
  @ApiOperation({ 
    summary: 'Buscar conversa por telefone',
    description: 'Busca a conversa ativa mais recente para um número de telefone'
  })
  @ApiParam({
    name: 'phoneNumber',
    description: 'Número de telefone do cliente',
    example: '+5511999999999'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversa encontrada',
    type: Object
  })
  @ApiNotFoundResponse({ description: 'Conversa não encontrada para este telefone' })
  async findConversationByPhone(
    @Param('phoneNumber') phoneNumber: string
  ): Promise<ConversationWithMessages | null> {
    return this.conversationService.findConversationByPhone(phoneNumber);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Buscar conversa por ID',
    description: 'Retorna uma conversa específica com todas as suas mensagens'
  })
  @ApiParam({
    name: 'id',
    description: 'ID da conversa',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversa encontrada',
    type: Object
  })
  @ApiNotFoundResponse({ description: 'Conversa não encontrada' })
  async findConversationById(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ConversationWithMessages> {
    return this.conversationService.findConversationById(id);
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Atualizar conversa',
    description: 'Atualiza informações de uma conversa existente'
  })
  @ApiParam({
    name: 'id',
    description: 'ID da conversa',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversa atualizada com sucesso',
    type: Object
  })
  @ApiNotFoundResponse({ description: 'Conversa não encontrada' })
  @ApiBadRequestResponse({ description: 'Dados inválidos fornecidos' })
  async updateConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateConversationDto: UpdateConversationDto
  ): Promise<Conversation> {
    return this.conversationService.updateConversation(id, updateConversationDto);
  }

  @Post(':id/messages')
  @ApiOperation({ 
    summary: 'Adicionar mensagem',
    description: 'Adiciona uma nova mensagem a uma conversa existente'
  })
  @ApiParam({
    name: 'id',
    description: 'ID da conversa',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Mensagem adicionada com sucesso',
    type: Object
  })
  @ApiNotFoundResponse({ description: 'Conversa não encontrada' })
  @ApiBadRequestResponse({ description: 'Dados da mensagem inválidos' })
  async addMessage(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body(ValidationPipe) createMessageDto: CreateMessageDto
  ): Promise<Message> {
    return this.conversationService.addMessage(conversationId, createMessageDto);
  }

  @Get(':id/history')
  @ApiOperation({ 
    summary: 'Histórico de mensagens',
    description: 'Retorna o histórico de mensagens de uma conversa'
  })
  @ApiParam({
    name: 'id',
    description: 'ID da conversa',
    type: 'string',
    format: 'uuid'
  })
  @ApiQuery({
    name: 'limit',
    description: 'Número máximo de mensagens a retornar',
    required: false,
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Histórico de mensagens retornado com sucesso'
  })
  @ApiNotFoundResponse({ description: 'Conversa não encontrada' })
  async getConversationHistory(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Query('limit') limit?: number
  ): Promise<Message[]> {
    return this.conversationService.getConversationHistory(conversationId, limit);
  }

  @Put(':id/resolve')
  @ApiOperation({ 
    summary: 'Resolver conversa',
    description: 'Marca uma conversa como resolvida'
  })
  @ApiParam({
    name: 'id',
    description: 'ID da conversa',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversa marcada como resolvida',
    type: Object
  })
  @ApiNotFoundResponse({ description: 'Conversa não encontrada' })
  async resolveConversation(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<Conversation> {
    return this.conversationService.resolveConversation(id);
  }

  @Put(':id/escalate')
  @ApiOperation({ 
    summary: 'Escalar conversa',
    description: 'Escala uma conversa para revisão manual'
  })
  @ApiParam({
    name: 'id',
    description: 'ID da conversa',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversa escalada para revisão manual',
    type: Object
  })
  @ApiNotFoundResponse({ description: 'Conversa não encontrada' })
  async escalateConversation(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<Conversation> {
    return this.conversationService.escalateConversation(id);
  }
}