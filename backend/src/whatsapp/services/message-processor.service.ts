import { Injectable, Logger } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  Conversation,
  conversations,
  ConversationStatus,
  messages,
  MessageType,
  NewConversation,
  NewMessage,
} from '../../database/schema';
import { IncomingMessage } from '../interfaces/whatsapp.interface';

export interface ProcessedMessage {
  conversationId: string;
  messageId: string;
  shouldRespond: boolean;
  context?: any;
}

@Injectable()
export class MessageProcessorService {
  private readonly logger = new Logger(MessageProcessorService.name);

  constructor(private databaseService: DatabaseService) {}

  async processIncomingMessage(
    incomingMessage: IncomingMessage,
  ): Promise<ProcessedMessage> {
    try {
      this.logger.log(`Processing message from ${incomingMessage.from}`);

      // Find or create conversation
      const conversation = await this.findOrCreateConversation(
        incomingMessage.from,
        incomingMessage.customerName,
      );

      // Store the incoming message
      const storedMessage = await this.storeMessage(
        conversation.id,
        incomingMessage,
      );

      // Determine if we should respond (basic logic for now)
      const shouldRespond = await this.shouldRespondToMessage(
        conversation.id,
        incomingMessage,
      );

      // Get conversation context for AI processing
      const context = await this.getConversationContext(conversation.id);

      return {
        conversationId: conversation.id,
        messageId: storedMessage.id,
        shouldRespond,
        context,
      };
    } catch (error) {
      this.logger.error('Failed to process incoming message', error.stack);
      throw error;
    }
  }

  async storeOutgoingMessage(
    conversationId: string,
    content: string,
    isAI: boolean = true,
    confidence?: number,
  ): Promise<string> {
    try {
      const db = this.databaseService.getDatabase();
      const newMessage: NewMessage = {
        conversationId,
        content,
        type: MessageType.OUTGOING,
        isAI,
        confidence: confidence?.toString(),
        timestamp: new Date(),
      };

      const result = await db.insert(messages).values(newMessage).returning();

      // Update conversation timestamp
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));

      this.logger.log(
        `Stored outgoing message for conversation ${conversationId}`,
      );
      return result[0].id;
    } catch (error) {
      this.logger.error('Failed to store outgoing message', error.stack);
      throw error;
    }
  }

  async getConversationHistory(
    conversationId: string,
    limit: number = 10,
  ): Promise<any[]> {
    try {
      const db = this.databaseService.getDatabase();
      const messageHistory = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.timestamp))
        .limit(limit);

      return messageHistory.reverse(); // Return in chronological order
    } catch (error) {
      this.logger.error('Failed to get conversation history', error.stack);
      throw error;
    }
  }

  async markConversationAsEscalated(conversationId: string): Promise<void> {
    try {
      const db = this.databaseService.getDatabase();
      await db
        .update(conversations)
        .set({
          status: ConversationStatus.ESCALATED,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));

      this.logger.log(`Conversation ${conversationId} marked as escalated`);
    } catch (error) {
      this.logger.error(
        'Failed to mark conversation as escalated',
        error.stack,
      );
      throw error;
    }
  }

  private async findOrCreateConversation(
    customerPhone: string,
    customerName?: string,
  ): Promise<Conversation> {
    try {
      const db = this.databaseService.getDatabase();
      // Look for existing active conversation
      const existingConversations = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.customerPhone, customerPhone),
            eq(conversations.status, ConversationStatus.ACTIVE),
          ),
        )
        .limit(1);

      if (existingConversations.length > 0) {
        // Update the conversation timestamp and customer name if provided
        const conversation = existingConversations[0];

        if (customerName && customerName !== conversation.customerName) {
          await db
            .update(conversations)
            .set({
              customerName,
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversation.id));

          return { ...conversation, customerName };
        }

        return conversation;
      }

      // Create new conversation
      const newConversation: NewConversation = {
        customerPhone,
        customerName,
        status: ConversationStatus.ACTIVE,
      };

      const result = await db
        .insert(conversations)
        .values(newConversation)
        .returning();

      this.logger.log(`Created new conversation for ${customerPhone}`);
      return result[0];
    } catch (error) {
      this.logger.error('Failed to find or create conversation', error.stack);
      throw error;
    }
  }

  private async storeMessage(
    conversationId: string,
    incomingMessage: IncomingMessage,
  ): Promise<{ id: string }> {
    try {
      const db = this.databaseService.getDatabase();
      const newMessage: NewMessage = {
        conversationId,
        content: incomingMessage.content,
        type: MessageType.INCOMING,
        isAI: false,
        timestamp: incomingMessage.timestamp,
      };

      const result = await db.insert(messages).values(newMessage).returning();

      // Update conversation timestamp
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));

      return result[0];
    } catch (error) {
      this.logger.error('Failed to store message', error.stack);
      throw error;
    }
  }

  private async shouldRespondToMessage(
    conversationId: string,
    incomingMessage: IncomingMessage,
  ): Promise<boolean> {
    try {
      // Basic logic - always respond for now
      // In the future, this could check:
      // - Business hours
      // - Message content (e.g., don't respond to "stop" messages)
      // - Conversation status
      // - Rate limiting

      const db = this.databaseService.getDatabase();

      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (conversation.length === 0) {
        return false;
      }

      // Don't respond to escalated conversations
      if (conversation[0].status === ConversationStatus.ESCALATED) {
        return false;
      }

      // Check for stop words
      const stopWords = ['stop', 'unsubscribe', 'opt out', 'quit'];
      const messageContent = incomingMessage.content.toLowerCase();

      for (const stopWord of stopWords) {
        if (messageContent.includes(stopWord)) {
          // Mark conversation as resolved
          await db
            .update(conversations)
            .set({
              status: ConversationStatus.RESOLVED,
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversationId));

          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to determine if should respond', error.stack);
      return false;
    }
  }

  private async getConversationContext(conversationId: string): Promise<any> {
    try {
      const db = this.databaseService.getDatabase();

      // Get recent message history
      const recentMessages = await this.getConversationHistory(
        conversationId,
        5,
      );

      // Get conversation details
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      return {
        conversationId,
        customerPhone: conversation[0]?.customerPhone,
        customerName: conversation[0]?.customerName,
        recentMessages,
        conversationStatus: conversation[0]?.status,
      };
    } catch (error) {
      this.logger.error('Failed to get conversation context', error.stack);
      return {};
    }
  }
}
