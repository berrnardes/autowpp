import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, lte, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  Conversation,
  conversations,
  ConversationStatus,
  Message,
  messages,
  NewMessage,
  ConversationGoalType
} from '../../database/schema';
import { ConfidenceAnalysis } from './confidence-scoring.service';

export interface EscalationRule {
  id: string;
  name: string;
  description: string;
  condition: EscalationCondition;
  priority: 'low' | 'medium' | 'high' | 'critical';
  autoEscalate: boolean;
  notificationRequired: boolean;
}

export interface EscalationCondition {
  confidenceThreshold?: number;
  goalSpecific?: ConversationGoalType[];
  keywords?: string[];
  messagePatterns?: string[];
  consecutiveLowConfidence?: number;
  timeBasedRules?: {
    noResponseTime?: number; // minutes
    conversationDuration?: number; // minutes
  };
}

export interface EscalationEvent {
  id: string;
  conversationId: string;
  messageId?: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  triggeredBy: 'confidence' | 'keyword' | 'pattern' | 'manual' | 'time';
  confidenceScore?: number;
  escalationRules: string[];
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  metadata?: Record<string, any>;
}

export interface ManualReviewItem {
  id: string;
  conversationId: string;
  messageId: string;
  customerPhone: string;
  customerMessage: string;
  aiResponse: string;
  confidenceScore: number;
  escalationReasons: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'modified';
  assignedTo?: string;
  createdAt: Date;
  reviewedAt?: Date;
  reviewNotes?: string;
  suggestedResponse?: string;
  metadata?: Record<string, any>;
}

export interface EscalationMetrics {
  totalEscalations: number;
  escalationsByPriority: Record<string, number>;
  escalationsByReason: Record<string, number>;
  averageResolutionTime: number; // minutes
  pendingReviews: number;
  escalationRate: number; // percentage
  topEscalationTriggers: { trigger: string; count: number }[];
}

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);
  private escalationRules: Map<string, EscalationRule> = new Map();
  private escalationEvents: Map<string, EscalationEvent> = new Map();
  private manualReviewQueue: Map<string, ManualReviewItem> = new Map();

  constructor(private readonly databaseService: DatabaseService) {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default escalation rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: EscalationRule[] = [
      {
        id: 'low-confidence',
        name: 'Baixa Confiança',
        description: 'Escala quando a confiança da resposta está abaixo do limite',
        condition: {
          confidenceThreshold: 0.7
        },
        priority: 'medium',
        autoEscalate: true,
        notificationRequired: false
      },
      {
        id: 'very-low-confidence',
        name: 'Confiança Muito Baixa',
        description: 'Escala imediatamente quando a confiança está criticamente baixa',
        condition: {
          confidenceThreshold: 0.5
        },
        priority: 'high',
        autoEscalate: true,
        notificationRequired: true
      },
      {
        id: 'complaint-keywords',
        name: 'Palavras de Reclamação',
        description: 'Escala quando detecta palavras relacionadas a reclamações',
        condition: {
          keywords: [
            'reclamação', 'problema sério', 'insatisfeito', 'cancelar',
            'reembolso', 'devolução', 'advogado', 'processo', 'procon',
            'péssimo', 'horrível', 'nunca mais', 'fraude', 'enganação'
          ]
        },
        priority: 'high',
        autoEscalate: true,
        notificationRequired: true
      },
      {
        id: 'technical-issues',
        name: 'Problemas Técnicos',
        description: 'Escala problemas técnicos complexos',
        condition: {
          keywords: [
            'não funciona', 'erro técnico', 'bug', 'falha no sistema',
            'não carrega', 'travou', 'não consegue acessar', 'problema técnico'
          ],
          goalSpecific: ['support_agent']
        },
        priority: 'medium',
        autoEscalate: false,
        notificationRequired: false
      },
      {
        id: 'high-value-customer',
        name: 'Cliente de Alto Valor',
        description: 'Escala conversas de clientes importantes',
        condition: {
          messagePatterns: [
            'sou cliente há anos',
            'compro sempre',
            'cliente vip',
            'cliente premium',
            'grande volume'
          ]
        },
        priority: 'high',
        autoEscalate: false,
        notificationRequired: true
      },
      {
        id: 'consecutive-low-confidence',
        name: 'Múltiplas Respostas de Baixa Confiança',
        description: 'Escala quando há várias respostas consecutivas com baixa confiança',
        condition: {
          consecutiveLowConfidence: 3,
          confidenceThreshold: 0.75
        },
        priority: 'medium',
        autoEscalate: true,
        notificationRequired: false
      },
      {
        id: 'long-conversation',
        name: 'Conversa Muito Longa',
        description: 'Escala conversas que se estendem por muito tempo',
        condition: {
          timeBasedRules: {
            conversationDuration: 60 // 1 hour
          }
        },
        priority: 'low',
        autoEscalate: false,
        notificationRequired: false
      }
    ];

    for (const rule of defaultRules) {
      this.escalationRules.set(rule.id, rule);
    }

    this.logger.log(`Initialized ${defaultRules.length} default escalation rules`);
  }

  /**
   * Evaluate if a conversation should be escalated
   */
  async evaluateEscalation(
    conversationId: string,
    messageId: string,
    customerMessage: string,
    aiResponse: string,
    confidenceAnalysis: ConfidenceAnalysis,
    goal: ConversationGoalType
  ): Promise<{
    shouldEscalate: boolean;
    escalationEvents: EscalationEvent[];
    manualReviewRequired: boolean;
  }> {
    const triggeredEvents: EscalationEvent[] = [];
    let shouldEscalate = false;
    let manualReviewRequired = false;

    // Get conversation history for context
    const conversation = await this.getConversationWithHistory(conversationId);
    
    // Evaluate each escalation rule
    for (const rule of this.escalationRules.values()) {
      const isTriggered = await this.evaluateRule(
        rule,
        conversationId,
        messageId,
        customerMessage,
        aiResponse,
        confidenceAnalysis,
        goal,
        conversation
      );

      if (isTriggered) {
        const event = this.createEscalationEvent(
          conversationId,
          messageId,
          rule,
          confidenceAnalysis.score,
          customerMessage
        );

        triggeredEvents.push(event);
        this.escalationEvents.set(event.id, event);

        if (rule.autoEscalate) {
          shouldEscalate = true;
        }

        if (rule.priority === 'high' || rule.priority === 'critical') {
          manualReviewRequired = true;
        }

        this.logger.log(`Escalation rule triggered: ${rule.name} for conversation ${conversationId}`);
      }
    }

    // Add to manual review queue if needed
    if (shouldEscalate || manualReviewRequired) {
      await this.addToManualReviewQueue(
        conversationId,
        messageId,
        customerMessage,
        aiResponse,
        confidenceAnalysis,
        triggeredEvents
      );
    }

    return {
      shouldEscalate,
      escalationEvents: triggeredEvents,
      manualReviewRequired
    };
  }

  /**
   * Evaluate a specific escalation rule
   */
  private async evaluateRule(
    rule: EscalationRule,
    conversationId: string,
    messageId: string,
    customerMessage: string,
    aiResponse: string,
    confidenceAnalysis: ConfidenceAnalysis,
    goal: ConversationGoalType,
    conversation?: any
  ): Promise<boolean> {
    const condition = rule.condition;

    // Confidence threshold check
    if (condition.confidenceThreshold !== undefined) {
      if (confidenceAnalysis.score < condition.confidenceThreshold) {
        return true;
      }
    }

    // Goal-specific check
    if (condition.goalSpecific && !condition.goalSpecific.includes(goal)) {
      return false;
    }

    // Keyword check
    if (condition.keywords) {
      const lowerMessage = customerMessage.toLowerCase();
      const hasKeyword = condition.keywords.some(keyword => 
        lowerMessage.includes(keyword.toLowerCase())
      );
      if (hasKeyword) {
        return true;
      }
    }

    // Message pattern check
    if (condition.messagePatterns) {
      const lowerMessage = customerMessage.toLowerCase();
      const hasPattern = condition.messagePatterns.some(pattern => 
        lowerMessage.includes(pattern.toLowerCase())
      );
      if (hasPattern) {
        return true;
      }
    }

    // Consecutive low confidence check
    if (condition.consecutiveLowConfidence && conversation) {
      const recentMessages = conversation.messages
        .filter((m: any) => m.isAI && m.confidence !== null)
        .slice(-condition.consecutiveLowConfidence);

      if (recentMessages.length >= condition.consecutiveLowConfidence) {
        const allLowConfidence = recentMessages.every((m: any) => 
          parseFloat(m.confidence) < (condition.confidenceThreshold || 0.75)
        );
        if (allLowConfidence) {
          return true;
        }
      }
    }

    // Time-based rules check
    if (condition.timeBasedRules && conversation) {
      const conversationStart = new Date(conversation.createdAt);
      const now = new Date();
      const durationMinutes = (now.getTime() - conversationStart.getTime()) / (1000 * 60);

      if (condition.timeBasedRules.conversationDuration && 
          durationMinutes > condition.timeBasedRules.conversationDuration) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create an escalation event
   */
  private createEscalationEvent(
    conversationId: string,
    messageId: string,
    rule: EscalationRule,
    confidenceScore: number,
    customerMessage: string
  ): EscalationEvent {
    return {
      id: `escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      messageId,
      reason: rule.description,
      priority: rule.priority,
      triggeredBy: this.getTriggeredByType(rule),
      confidenceScore,
      escalationRules: [rule.id],
      createdAt: new Date(),
      metadata: {
        ruleName: rule.name,
        customerMessageLength: customerMessage.length,
        autoEscalate: rule.autoEscalate
      }
    };
  }

  /**
   * Determine trigger type based on rule condition
   */
  private getTriggeredByType(rule: EscalationRule): 'confidence' | 'keyword' | 'pattern' | 'manual' | 'time' {
    if (rule.condition.confidenceThreshold !== undefined) {
      return 'confidence';
    }
    if (rule.condition.keywords) {
      return 'keyword';
    }
    if (rule.condition.messagePatterns) {
      return 'pattern';
    }
    if (rule.condition.timeBasedRules) {
      return 'time';
    }
    return 'manual';
  }

  /**
   * Add item to manual review queue
   */
  private async addToManualReviewQueue(
    conversationId: string,
    messageId: string,
    customerMessage: string,
    aiResponse: string,
    confidenceAnalysis: ConfidenceAnalysis,
    escalationEvents: EscalationEvent[]
  ): Promise<void> {
    // Get customer phone from conversation
    const conversation = await this.getConversationById(conversationId);
    
    const priority = this.determinePriority(escalationEvents);
    
    const reviewItem: ManualReviewItem = {
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      messageId,
      customerPhone: conversation.customerPhone,
      customerMessage,
      aiResponse,
      confidenceScore: confidenceAnalysis.score,
      escalationReasons: confidenceAnalysis.escalationReasons,
      priority,
      status: 'pending',
      createdAt: new Date(),
      metadata: {
        escalationEventIds: escalationEvents.map(e => e.id),
        confidenceFactors: confidenceAnalysis.factors,
        reasoning: confidenceAnalysis.reasoning
      }
    };

    this.manualReviewQueue.set(reviewItem.id, reviewItem);
    
    this.logger.log(`Added item to manual review queue: ${reviewItem.id} (Priority: ${priority})`);
  }

  /**
   * Determine priority based on escalation events
   */
  private determinePriority(events: EscalationEvent[]): 'low' | 'medium' | 'high' | 'critical' {
    if (events.some(e => e.priority === 'critical')) return 'critical';
    if (events.some(e => e.priority === 'high')) return 'high';
    if (events.some(e => e.priority === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Get conversation by ID
   */
  private async getConversationById(conversationId: string): Promise<Conversation> {
    const db = this.databaseService.getDatabase();
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    return result[0];
  }

  /**
   * Get conversation with message history
   */
  private async getConversationWithHistory(conversationId: string): Promise<any> {
    const conversation = await this.getConversationById(conversationId);
    
    const db = this.databaseService.getDatabase();
    const messageHistory = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.timestamp))
      .limit(20);

    return {
      ...conversation,
      messages: messageHistory.reverse()
    };
  }

  /**
   * Escalate conversation to manual review
   */
  async escalateConversation(
    conversationId: string,
    reason: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    escalatedBy?: string
  ): Promise<void> {
    // First check if conversation exists
    await this.getConversationById(conversationId);
    
    const db = this.databaseService.getDatabase();
    
    // Update conversation status
    await db
      .update(conversations)
      .set({
        status: ConversationStatus.ESCALATED,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId));

    // Create escalation event
    const event: EscalationEvent = {
      id: `manual_escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      reason,
      priority,
      triggeredBy: 'manual',
      escalationRules: ['manual-escalation'],
      createdAt: new Date(),
      metadata: {
        escalatedBy,
        manualEscalation: true
      }
    };

    this.escalationEvents.set(event.id, event);
    
    this.logger.log(`Conversation ${conversationId} manually escalated by ${escalatedBy || 'system'}: ${reason}`);
  }

  /**
   * Get manual review queue with filtering and pagination
   */
  getManualReviewQueue(filters?: {
    status?: ManualReviewItem['status'];
    priority?: ManualReviewItem['priority'];
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): {
    items: ManualReviewItem[];
    total: number;
  } {
    let items = Array.from(this.manualReviewQueue.values());

    // Apply filters
    if (filters?.status) {
      items = items.filter(item => item.status === filters.status);
    }
    if (filters?.priority) {
      items = items.filter(item => item.priority === filters.priority);
    }
    if (filters?.assignedTo) {
      items = items.filter(item => item.assignedTo === filters.assignedTo);
    }

    // Sort by priority and creation date
    items.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const total = items.length;

    // Apply pagination
    if (filters?.offset !== undefined) {
      items = items.slice(filters.offset);
    }
    if (filters?.limit !== undefined) {
      items = items.slice(0, filters.limit);
    }

    return { items, total };
  }

  /**
   * Update manual review item
   */
  updateManualReviewItem(
    itemId: string,
    updates: Partial<Pick<ManualReviewItem, 'status' | 'assignedTo' | 'reviewNotes' | 'suggestedResponse'>>
  ): ManualReviewItem {
    const item = this.manualReviewQueue.get(itemId);
    if (!item) {
      throw new NotFoundException(`Manual review item ${itemId} not found`);
    }

    const updatedItem = {
      ...item,
      ...updates,
      reviewedAt: updates.status && updates.status !== 'pending' ? new Date() : item.reviewedAt
    };

    this.manualReviewQueue.set(itemId, updatedItem);
    
    this.logger.log(`Manual review item ${itemId} updated: ${JSON.stringify(updates)}`);
    
    return updatedItem;
  }

  /**
   * Resolve escalation event
   */
  resolveEscalationEvent(
    eventId: string,
    resolution: string,
    resolvedBy: string
  ): EscalationEvent {
    const event = this.escalationEvents.get(eventId);
    if (!event) {
      throw new NotFoundException(`Escalation event ${eventId} not found`);
    }

    const resolvedEvent = {
      ...event,
      resolvedAt: new Date(),
      resolvedBy,
      resolution
    };

    this.escalationEvents.set(eventId, resolvedEvent);
    
    this.logger.log(`Escalation event ${eventId} resolved by ${resolvedBy}: ${resolution}`);
    
    return resolvedEvent;
  }

  /**
   * Get escalation metrics
   */
  getEscalationMetrics(timeRange?: { start: Date; end: Date }): EscalationMetrics {
    let events = Array.from(this.escalationEvents.values());
    
    // Filter by time range if provided
    if (timeRange) {
      events = events.filter(event => 
        event.createdAt >= timeRange.start && event.createdAt <= timeRange.end
      );
    }

    const totalEscalations = events.length;
    
    // Count by priority
    const escalationsByPriority = events.reduce((acc, event) => {
      acc[event.priority] = (acc[event.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count by reason
    const escalationsByReason = events.reduce((acc, event) => {
      acc[event.triggeredBy] = (acc[event.triggeredBy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average resolution time
    const resolvedEvents = events.filter(e => e.resolvedAt);
    const averageResolutionTime = resolvedEvents.length > 0 
      ? resolvedEvents.reduce((sum, event) => {
          const resolutionTime = (event.resolvedAt!.getTime() - event.createdAt.getTime()) / (1000 * 60);
          return sum + resolutionTime;
        }, 0) / resolvedEvents.length
      : 0;

    // Count pending reviews
    const pendingReviews = Array.from(this.manualReviewQueue.values())
      .filter(item => item.status === 'pending').length;

    // Calculate escalation rate (would need total messages for accurate calculation)
    const escalationRate = 0; // Placeholder - would need total message count

    // Top escalation triggers
    const triggerCounts = events.reduce((acc, event) => {
      for (const rule of event.escalationRules) {
        acc[rule] = (acc[rule] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topEscalationTriggers = Object.entries(triggerCounts)
      .map(([trigger, count]) => ({ trigger, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEscalations,
      escalationsByPriority,
      escalationsByReason,
      averageResolutionTime,
      pendingReviews,
      escalationRate,
      topEscalationTriggers
    };
  }

  /**
   * Add custom escalation rule
   */
  addEscalationRule(rule: EscalationRule): void {
    this.escalationRules.set(rule.id, rule);
    this.logger.log(`Added custom escalation rule: ${rule.name}`);
  }

  /**
   * Remove escalation rule
   */
  removeEscalationRule(ruleId: string): void {
    if (this.escalationRules.delete(ruleId)) {
      this.logger.log(`Removed escalation rule: ${ruleId}`);
    }
  }

  /**
   * Get all escalation rules
   */
  getEscalationRules(): EscalationRule[] {
    return Array.from(this.escalationRules.values());
  }

  /**
   * Get escalation events for a conversation
   */
  getConversationEscalationEvents(conversationId: string): EscalationEvent[] {
    return Array.from(this.escalationEvents.values())
      .filter(event => event.conversationId === conversationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}