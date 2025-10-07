import { Injectable, Logger } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import {
  conversations,
  messages,
  products,
  aiConfiguration,
  ConversationGoalType
} from '../../database/schema';
import {
  ConversationContext,
  MessageHistory,
  ProductInfo,
  BusinessHours
} from '../interfaces/ai.interface';
import { DatabaseService } from '../../database/database.service';



@Injectable()
export class ConversationContextService {
  private readonly logger = new Logger(ConversationContextService.name);

  constructor(
   private readonly databaseService: DatabaseService
  ) {}

  async getConversationContext(customerPhone: string): Promise<ConversationContext> {
    try {
      this.logger.debug(`Building conversation context for ${customerPhone}`);

      // Get or create conversation
      const conversation = await this.getOrCreateConversation(customerPhone);

      // Get conversation history
      const conversationHistory = await this.getConversationHistory(conversation.id);

      // Get available products
      const availableProducts = await this.getAvailableProducts();

      // Get AI configuration
      const aiConfig = await this.getAIConfiguration();

      const context: ConversationContext = {
        customerPhone,
        conversationHistory,
        products: availableProducts,
        conversationGoal: aiConfig?.conversationGoal as ConversationGoalType || 'helpful',
        businessHours: aiConfig?.businessHours as BusinessHours,
        customerName: conversation.customerName || undefined
      };

      this.logger.debug(`Context built with ${conversationHistory.length} messages and ${availableProducts.length} products`);
      return context;

    } catch (error) {
      this.logger.error('Error building conversation context', error);
      throw error;
    }
  }

  async updateConversationHistory(
    customerPhone: string,
    content: string,
    type: 'incoming' | 'outgoing',
    isAI: boolean = false,
    confidence?: number
  ): Promise<void> {
    try {

      const db = this.databaseService.getDatabase()
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(customerPhone);

      // Insert new message
      await db.insert(messages).values({
        conversationId: conversation.id,
        content,
        type,
        isAI,
        confidence: confidence?.toString(),
        timestamp: new Date()
      });

      // Update conversation timestamp
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversation.id));

      this.logger.debug(`Message added to conversation ${conversation.id}`);

    } catch (error) {
      this.logger.error('Error updating conversation history', error);
      throw error;
    }
  }

  async setConversationStatus(
    customerPhone: string,
    status: 'active' | 'resolved' | 'escalated'
  ): Promise<void> {
    try {
      const db = this.databaseService.getDatabase()
      const conversation = await this.getOrCreateConversation(customerPhone);

      await db
        .update(conversations)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(conversations.id, conversation.id));

      this.logger.debug(`Conversation status updated to ${status} for ${customerPhone}`);

    } catch (error) {
      this.logger.error('Error updating conversation status', error);
      throw error;
    }
  }

  private async getOrCreateConversation(customerPhone: string) {
    const db = this.databaseService.getDatabase()
    // Try to find existing active conversation
    const existingConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.customerPhone, customerPhone))
      .orderBy(desc(conversations.createdAt))
      .limit(1);

    if (existingConversations.length > 0) {
      return existingConversations[0];
    }

    // Create new conversation
    const newConversations = await db
      .insert(conversations)
      .values({
        customerPhone,
        status: 'active'
      })
      .returning();

    return newConversations[0];
  }

  private async getConversationHistory(conversationId: string): Promise<MessageHistory[]> {
    const db = this.databaseService.getDatabase()

    const messageHistory = await db
      .select({
        content: messages.content,
        type: messages.type,
        isAI: messages.isAI,
        timestamp: messages.timestamp,
        confidence: messages.confidence
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.timestamp))
      .limit(20); // Get last 20 messages

    return messageHistory.map(msg => ({
      content: msg.content,
      type: msg.type as 'incoming' | 'outgoing',
      isAI: msg.isAI || false,
      timestamp: msg.timestamp || new Date(),
      confidence: msg.confidence ? parseFloat(msg.confidence) : undefined
    })).reverse(); // Reverse to get chronological order
  }

  private async getAvailableProducts(): Promise<ProductInfo[]> {
    const db = this.databaseService.getDatabase()
    const availableProducts = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        currency: products.currency,
        category: products.category,
        inStock: products.inStock
      })
      .from(products)
      .where(eq(products.inStock, true))
      .limit(50); // Limit to avoid token limits

    return availableProducts.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: parseFloat(product.price),
      currency: product.currency || 'BRL',
      category: product.category || undefined,
      inStock: product.inStock || false
    }));
  }

  private async getAIConfiguration() {
    const db = this.databaseService.getDatabase()
    const configs = await db
      .select()
      .from(aiConfiguration)
      .orderBy(desc(aiConfiguration.createdAt))
      .limit(1);

    return configs.length > 0 ? configs[0] : null;
  }

  async getConversationStats(customerPhone?: string) {
    try {
      const db = this.databaseService.getDatabase();

      const conversationList = customerPhone
        ? await db
          .select()
          .from(conversations)
          .where(eq(conversations.customerPhone, customerPhone))
        : await db
          .select()
          .from(conversations);

      const stats = {
        total: conversationList.length,
        active: conversationList.filter(c => c.status === 'active').length,
        resolved: conversationList.filter(c => c.status === 'resolved').length,
        escalated: conversationList.filter(c => c.status === 'escalated').length
      };

      return stats;

    } catch (error) {
      this.logger.error('Error getting conversation stats', error);
      throw error;
    }
  }
}