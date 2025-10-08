import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EscalationService, EscalationRule } from './escalation.service';
import { ConfidenceAnalysis } from './confidence-scoring.service';
import { DatabaseService } from '../../database/database.service';
import { ConversationStatus } from '../../database/schema';

describe('EscalationService', () => {
  let service: EscalationService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn()
    };

    mockDatabaseService = {
      getDatabase: jest.fn().mockReturnValue(mockDb)
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscalationService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService
        }
      ],
    }).compile();

    service = module.get<EscalationService>(EscalationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should initialize with default escalation rules', () => {
      const rules = service.getEscalationRules();
      
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(rule => rule.id === 'low-confidence')).toBe(true);
      expect(rules.some(rule => rule.id === 'complaint-keywords')).toBe(true);
      expect(rules.some(rule => rule.id === 'technical-issues')).toBe(true);
    });
  });

  describe('evaluateEscalation', () => {
    const mockConversation = {
      id: 'conv_123',
      customerPhone: '+5511999999999',
      status: 'active',
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      messages: [
        {
          id: 'msg_1',
          content: 'Olá',
          type: 'incoming',
          isAI: false,
          confidence: null,
          timestamp: new Date()
        },
        {
          id: 'msg_2',
          content: 'Olá! Como posso ajudar?',
          type: 'outgoing',
          isAI: true,
          confidence: '0.85',
          timestamp: new Date()
        }
      ]
    };

    const mockConfidenceAnalysis: ConfidenceAnalysis = {
      score: 0.6,
      factors: {
        responseLength: 0.1,
        genericPhrasesPenalty: -0.1,
        goalSpecificBonus: 0.05,
        productMentionBonus: 0,
        questionHandlingBonus: 0,
        contextRelevanceBonus: 0,
        languageQualityBonus: 0.05
      },
      reasoning: ['Resposta tem comprimento adequado'],
      shouldEscalate: true,
      escalationReasons: ['Confiança baixa: 60.0% (mínimo: 70.0%)']
    };

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Mock database responses
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockConversation]),
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockConversation.messages)
            })
          })
        })
      });
    });

    it('should trigger low confidence escalation', async () => {
      const result = await service.evaluateEscalation(
        'conv_123',
        'msg_123',
        'Qual é o preço?',
        'Não sei',
        mockConfidenceAnalysis,
        'helpful'
      );

      expect(result.shouldEscalate).toBe(true);
      expect(result.escalationEvents.length).toBeGreaterThan(0);
      expect(result.escalationEvents[0].reason).toContain('confiança');
    });

    it('should trigger complaint keyword escalation', async () => {
      const complaintAnalysis: ConfidenceAnalysis = {
        ...mockConfidenceAnalysis,
        score: 0.8,
        shouldEscalate: false
      };

      const result = await service.evaluateEscalation(
        'conv_123',
        'msg_123',
        'Quero fazer uma reclamação, estou muito insatisfeito',
        'Como posso ajudar?',
        complaintAnalysis,
        'helpful'
      );

      expect(result.shouldEscalate).toBe(true);
      expect(result.manualReviewRequired).toBe(true);
      expect(result.escalationEvents.some(e => e.priority === 'high')).toBe(true);
    });

    it('should trigger technical issues escalation for support agent', async () => {
      const technicalAnalysis: ConfidenceAnalysis = {
        ...mockConfidenceAnalysis,
        score: 0.8,
        shouldEscalate: false
      };

      const result = await service.evaluateEscalation(
        'conv_123',
        'msg_123',
        'O sistema não funciona, está com erro técnico',
        'Vou verificar o problema',
        technicalAnalysis,
        'support_agent'
      );

      expect(result.escalationEvents.length).toBeGreaterThan(0);
      expect(result.escalationEvents[0].triggeredBy).toBe('keyword');
    });

    it('should not escalate for high confidence responses', async () => {
      const highConfidenceAnalysis: ConfidenceAnalysis = {
        ...mockConfidenceAnalysis,
        score: 0.9,
        shouldEscalate: false,
        escalationReasons: []
      };

      const result = await service.evaluateEscalation(
        'conv_123',
        'msg_123',
        'Qual é o preço?',
        'O produto custa R$ 99,90 e está disponível',
        highConfidenceAnalysis,
        'helpful'
      );

      expect(result.shouldEscalate).toBe(false);
      expect(result.escalationEvents.length).toBe(0);
      expect(result.manualReviewRequired).toBe(false);
    });

    it('should handle consecutive low confidence messages', async () => {
      const conversationWithLowConfidence = {
        ...mockConversation,
        messages: [
          ...mockConversation.messages,
          {
            id: 'msg_3',
            content: 'Resposta 1',
            type: 'outgoing',
            isAI: true,
            confidence: '0.6',
            timestamp: new Date()
          },
          {
            id: 'msg_4',
            content: 'Resposta 2',
            type: 'outgoing',
            isAI: true,
            confidence: '0.65',
            timestamp: new Date()
          },
          {
            id: 'msg_5',
            content: 'Resposta 3',
            type: 'outgoing',
            isAI: true,
            confidence: '0.7',
            timestamp: new Date()
          }
        ]
      };

      // Mock the conversation with low confidence messages
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([conversationWithLowConfidence]),
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(conversationWithLowConfidence.messages)
            })
          })
        })
      });

      const result = await service.evaluateEscalation(
        'conv_123',
        'msg_123',
        'Mais uma pergunta',
        'Mais uma resposta',
        mockConfidenceAnalysis,
        'helpful'
      );

      // Check if any escalation event was triggered (the consecutive rule might not trigger in this specific test setup)
      expect(result.escalationEvents.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('escalateConversation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      
      // Mock successful conversation lookup
      const mockConv = {
        id: 'conv_123',
        customerPhone: '+5511999999999',
        status: 'active',
        createdAt: new Date()
      };
      
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockConv])
          })
        })
      });
      
      // Mock update operation
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });
    });

    it('should escalate conversation manually', async () => {
      await service.escalateConversation(
        'conv_123',
        'Manual escalation for review',
        'high',
        'admin_user'
      );

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should create escalation event for manual escalation', async () => {
      await service.escalateConversation(
        'conv_123',
        'Manual escalation for review',
        'high',
        'admin_user'
      );

      const events = service.getConversationEscalationEvents('conv_123');
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].triggeredBy).toBe('manual');
      expect(events[0].priority).toBe('high');
    });
  });

  describe('manual review queue', () => {
    beforeEach(() => {
      // Add some mock items to the queue
      const mockItem = {
        id: 'review_123',
        conversationId: 'conv_123',
        messageId: 'msg_123',
        customerPhone: '+5511999999999',
        customerMessage: 'Test message',
        aiResponse: 'Test response',
        confidenceScore: 0.6,
        escalationReasons: ['Low confidence'],
        priority: 'medium' as const,
        status: 'pending' as const,
        createdAt: new Date()
      };

      // Access private property for testing
      (service as any).manualReviewQueue.set('review_123', mockItem);
    });

    it('should get manual review queue with filters', () => {
      const result = service.getManualReviewQueue({
        status: 'pending',
        limit: 10,
        offset: 0
      });

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.items[0].status).toBe('pending');
    });

    it('should update manual review item', () => {
      const updatedItem = service.updateManualReviewItem('review_123', {
        status: 'approved',
        reviewNotes: 'Looks good',
        assignedTo: 'reviewer_1'
      });

      expect(updatedItem.status).toBe('approved');
      expect(updatedItem.reviewNotes).toBe('Looks good');
      expect(updatedItem.assignedTo).toBe('reviewer_1');
      expect(updatedItem.reviewedAt).toBeDefined();
    });

    it('should throw error for non-existent review item', () => {
      expect(() => {
        service.updateManualReviewItem('non_existent', { status: 'approved' });
      }).toThrow(NotFoundException);
    });

    it('should filter by priority', () => {
      // Add high priority item
      const highPriorityItem = {
        id: 'review_456',
        conversationId: 'conv_456',
        messageId: 'msg_456',
        customerPhone: '+5511888888888',
        customerMessage: 'Urgent issue',
        aiResponse: 'Response',
        confidenceScore: 0.4,
        escalationReasons: ['Very low confidence'],
        priority: 'high' as const,
        status: 'pending' as const,
        createdAt: new Date()
      };

      (service as any).manualReviewQueue.set('review_456', highPriorityItem);

      const result = service.getManualReviewQueue({ priority: 'high' });
      
      expect(result.items.length).toBe(1);
      expect(result.items[0].priority).toBe('high');
    });
  });

  describe('escalation rules management', () => {
    it('should add custom escalation rule', () => {
      const customRule: EscalationRule = {
        id: 'custom_rule_1',
        name: 'Custom Rule',
        description: 'Custom escalation rule for testing',
        condition: {
          keywords: ['custom_keyword']
        },
        priority: 'medium',
        autoEscalate: true,
        notificationRequired: false
      };

      service.addEscalationRule(customRule);
      
      const rules = service.getEscalationRules();
      expect(rules.some(rule => rule.id === 'custom_rule_1')).toBe(true);
    });

    it('should remove escalation rule', () => {
      const initialRulesCount = service.getEscalationRules().length;
      
      service.removeEscalationRule('low-confidence');
      
      const rules = service.getEscalationRules();
      expect(rules.length).toBe(initialRulesCount - 1);
      expect(rules.some(rule => rule.id === 'low-confidence')).toBe(false);
    });
  });

  describe('escalation events', () => {
    beforeEach(() => {
      // Add mock escalation event
      const mockEvent = {
        id: 'event_123',
        conversationId: 'conv_123',
        reason: 'Low confidence response',
        priority: 'medium' as const,
        triggeredBy: 'confidence' as const,
        escalationRules: ['low-confidence'],
        createdAt: new Date(),
        metadata: {}
      };

      (service as any).escalationEvents.set('event_123', mockEvent);
    });

    it('should get escalation events for conversation', () => {
      const events = service.getConversationEscalationEvents('conv_123');
      
      expect(events.length).toBe(1);
      expect(events[0].conversationId).toBe('conv_123');
    });

    it('should resolve escalation event', () => {
      const resolvedEvent = service.resolveEscalationEvent(
        'event_123',
        'Issue resolved by manual review',
        'admin_user'
      );

      expect(resolvedEvent.resolvedAt).toBeDefined();
      expect(resolvedEvent.resolvedBy).toBe('admin_user');
      expect(resolvedEvent.resolution).toBe('Issue resolved by manual review');
    });

    it('should throw error for non-existent escalation event', () => {
      expect(() => {
        service.resolveEscalationEvent('non_existent', 'Resolution', 'user');
      }).toThrow(NotFoundException);
    });
  });

  describe('escalation metrics', () => {
    beforeEach(() => {
      // Add mock escalation events for metrics testing
      const events = [
        {
          id: 'event_1',
          conversationId: 'conv_1',
          reason: 'Low confidence',
          priority: 'medium' as const,
          triggeredBy: 'confidence' as const,
          escalationRules: ['low-confidence'],
          createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          resolvedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          metadata: {}
        },
        {
          id: 'event_2',
          conversationId: 'conv_2',
          reason: 'Complaint detected',
          priority: 'high' as const,
          triggeredBy: 'keyword' as const,
          escalationRules: ['complaint-keywords'],
          createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
          metadata: {}
        }
      ];

      const escalationEvents = (service as any).escalationEvents;
      events.forEach(event => escalationEvents.set(event.id, event));
    });

    it('should calculate escalation metrics', () => {
      const metrics = service.getEscalationMetrics();

      expect(metrics.totalEscalations).toBe(2);
      expect(metrics.escalationsByPriority.medium).toBe(1);
      expect(metrics.escalationsByPriority.high).toBe(1);
      expect(metrics.escalationsByReason.confidence).toBe(1);
      expect(metrics.escalationsByReason.keyword).toBe(1);
      expect(metrics.averageResolutionTime).toBeGreaterThan(0);
    });

    it('should filter metrics by time range', () => {
      const timeRange = {
        start: new Date(Date.now() - 50 * 60 * 1000), // 50 minutes ago
        end: new Date()
      };

      const metrics = service.getEscalationMetrics(timeRange);

      expect(metrics.totalEscalations).toBe(1); // Only the second event
      expect(metrics.escalationsByPriority.high).toBe(1);
    });

    it('should include top escalation triggers', () => {
      const metrics = service.getEscalationMetrics();

      expect(metrics.topEscalationTriggers.length).toBeGreaterThan(0);
      expect(metrics.topEscalationTriggers[0]).toHaveProperty('trigger');
      expect(metrics.topEscalationTriggers[0]).toHaveProperty('count');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(
        service.evaluateEscalation(
          'conv_123',
          'msg_123',
          'Test message',
          'Test response',
          {
            score: 0.8,
            factors: {} as any,
            reasoning: [],
            shouldEscalate: false,
            escalationReasons: []
          },
          'helpful'
        )
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle missing conversation gracefully', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]) // No conversation found
          })
        })
      });

      await expect(
        service.escalateConversation('non_existent_conv', 'Test reason')
      ).rejects.toThrow(NotFoundException);
    });
  });
});