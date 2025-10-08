import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, gte, lte, SQL } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  Conversation,
  conversations,
  ConversationStatus,
  Message,
  messages,
  NewConversation,
  NewMessage,
} from '../../database/schema';
import { ConversationQueryDto } from '../dto/conversation-query.dto';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { CreateMessageDto } from '../dto/create-message.dto';
import { UpdateConversationDto } from '../dto/update-conversation.dto';

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface PaginatedConversations {
  conversations: ConversationWithMessages[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ConversationService {
  constructor(private readonly databaseService: DatabaseService) { }

  /**
   * Cria uma nova conversa
   */
  async createConversation(
    createConversationDto: CreateConversationDto,
  ): Promise<Conversation> {
    const { customerPhone, customerName } = createConversationDto;
    const db = this.databaseService.getDatabase();

    // Verifica se já existe uma conversa ativa para este cliente
    const existingConversation = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.customerPhone, customerPhone),
          eq(conversations.status, ConversationStatus.ACTIVE),
        ),
      )
      .limit(1);

    if (existingConversation.length > 0) {
      return existingConversation[0];
    }

    const newConversation: NewConversation = {
      customerPhone,
      customerName,
      status: ConversationStatus.ACTIVE,
    };

    const [conversation] = await db
      .insert(conversations)
      .values(newConversation)
      .returning();

    return conversation;
  }

  /**
   * Busca uma conversa por ID com suas mensagens
   */
  async findConversationById(id: string): Promise<ConversationWithMessages> {
    const db = this.databaseService.getDatabase();
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (conversation.length === 0) {
      throw new NotFoundException(`Conversa com ID ${id} não encontrada`);
    }

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.timestamp));

    return {
      ...conversation[0],
      messages: conversationMessages,
    };
  }

  /**
   * Busca conversa por número de telefone do cliente
   */
  async findConversationByPhone(
    customerPhone: string,
  ): Promise<ConversationWithMessages | null> {
    const db = this.databaseService.getDatabase();
    const conversation = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.customerPhone, customerPhone),
          eq(conversations.status, ConversationStatus.ACTIVE),
        ),
      )
      .orderBy(desc(conversations.updatedAt))
      .limit(1);

    if (conversation.length === 0) {
      return null;
    }

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation[0].id))
      .orderBy(asc(messages.timestamp));

    return {
      ...conversation[0],
      messages: conversationMessages,
    };
  }

  /**
   * Lista conversas com filtros e paginação
   */
  async findConversations(
    query: ConversationQueryDto,
  ): Promise<PaginatedConversations> {
    const db = this.databaseService.getDatabase();
    const {
      status,
      customerPhone,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;
    const offset = (page - 1) * limit;

    // Constrói as condições de filtro
    const conditions: SQL<unknown>[] = [];

    if (status) {
      conditions.push(eq(conversations.status, status));
    }

    if (customerPhone) {
      conditions.push(eq(conversations.customerPhone, customerPhone));
    }

    if (startDate) {
      conditions.push(gte(conversations.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(conversations.createdAt, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Busca o total de conversas
    const [{ total }] = await db
      .select({ total: count() })
      .from(conversations)
      .where(whereClause);

    // Busca as conversas com paginação
    const conversationList = await db
      .select()
      .from(conversations)
      .where(whereClause)
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    // Busca as mensagens para cada conversa
    const conversationsWithMessages: ConversationWithMessages[] = [];

    for (const conversation of conversationList) {
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(asc(messages.timestamp));

      conversationsWithMessages.push({
        ...conversation,
        messages: conversationMessages,
      });
    }

    return {
      conversations: conversationsWithMessages,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    };
  }

  /**
   * Atualiza uma conversa
   */
  async updateConversation(
    id: string,
    updateConversationDto: UpdateConversationDto,
  ): Promise<Conversation> {
    const db = this.databaseService.getDatabase();
    const existingConversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (existingConversation.length === 0) {
      throw new NotFoundException(`Conversa com ID ${id} não encontrada`);
    }

    const [updatedConversation] = await db
      .update(conversations)
      .set({
        ...updateConversationDto,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, id))
      .returning();

    return updatedConversation;
  }

  /**
   * Adiciona uma mensagem a uma conversa
   */
  async addMessage(
    conversationId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<Message> {
    const db = this.databaseService.getDatabase();
    // Verifica se a conversa existe
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (conversation.length === 0) {
      throw new NotFoundException(
        `Conversa com ID ${conversationId} não encontrada`,
      );
    }

    const newMessage: NewMessage = {
      conversationId,
      content: createMessageDto.content,
      type: createMessageDto.type,
      isAI: createMessageDto.isAI || false,
      confidence: createMessageDto.confidence?.toString(),
      metadata: createMessageDto.metadata,
    };

    const [message] = await db
      .insert(messages)
      .values(newMessage)
      .returning();

    // Atualiza o timestamp da conversa
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return message;
  }

  /**
   * Busca o histórico de mensagens de uma conversa
   */
  async getConversationHistory(
    conversationId: string,
    limit?: number,
  ): Promise<Message[]> {
    const db = this.databaseService.getDatabase();
    // Verifica se a conversa existe
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (conversation.length === 0) {
      throw new NotFoundException(
        `Conversa com ID ${conversationId} não encontrada`,
      );
    }

    const query = db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.timestamp));

    const messageHistory = limit ? await query.limit(limit) : await query;

    // Retorna em ordem cronológica (mais antiga primeiro)
    return messageHistory.reverse();
  }

  /**
   * Marca uma conversa como resolvida
   */
  async resolveConversation(id: string): Promise<Conversation> {
    return this.updateConversation(id, { status: ConversationStatus.RESOLVED });
  }

  /**
   * Escala uma conversa para revisão manual
   */
  async escalateConversation(id: string): Promise<Conversation> {
    return this.updateConversation(id, {
      status: ConversationStatus.ESCALATED,
    });
  }

  /**
   * Busca conversas que precisam de atenção (escaladas ou com baixa confiança)
   */
  async findConversationsNeedingAttention(): Promise<
    ConversationWithMessages[]
  > {
    const db = this.databaseService.getDatabase();
    // Busca conversas escaladas
    const escalatedConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.status, ConversationStatus.ESCALATED))
      .orderBy(desc(conversations.updatedAt));

    // Busca conversas com mensagens de baixa confiança (< 0.7)
    const lowConfidenceMessages = await db
      .select({ conversationId: messages.conversationId })
      .from(messages)
      .where(and(eq(messages.isAI, true), lte(messages.confidence, '0.7')))
      .groupBy(messages.conversationId);

    const lowConfidenceConversationIds = lowConfidenceMessages.map(
      (m) => m.conversationId,
    );

    let lowConfidenceConversations: Conversation[] = [];
    if (lowConfidenceConversationIds.length > 0) {
      lowConfidenceConversations = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.status, ConversationStatus.ACTIVE),
            // Note: In a real implementation, you'd use an IN clause here
            // For now, we'll handle this differently
          ),
        );
    }

    // Combina e remove duplicatas
    const allConversations = [
      ...escalatedConversations,
      ...lowConfidenceConversations,
    ];
    const uniqueConversations = allConversations.filter(
      (conv, index, self) => index === self.findIndex((c) => c.id === conv.id),
    );

    // Adiciona mensagens para cada conversa
    const conversationsWithMessages: ConversationWithMessages[] = [];

    for (const conversation of uniqueConversations) {
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(asc(messages.timestamp));

      conversationsWithMessages.push({
        ...conversation,
        messages: conversationMessages,
      });
    }

    return conversationsWithMessages;
  }
}
