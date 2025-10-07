import { Test, TestingModule } from '@nestjs/testing';
import { ConversationContextService } from './conversation-context.service';

describe('ConversationContextService', () => {
  let service: ConversationContextService;

  // Mock database connection
  const mockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationContextService,
        {
          provide: 'DATABASE_CONNECTION',
          useValue: mockDb
        }
      ],
    }).compile();

    service = module.get<ConversationContextService>(ConversationContextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getConversationContext', () => {
    beforeEach(() => {
      // Mock database responses
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.orderBy.mockReturnValue(mockDb);
      mockDb.limit.mockReturnValue(mockDb);
    });

    it('should build conversation context for existing customer', async () => {
      const customerPhone = '+5511999999999';
      
      // Mock existing conversation
      mockDb.limit.mockResolvedValueOnce([{
        id: 'conv-1',
        customerPhone,
        customerName: 'João',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      // Mock conversation history
      mockDb.limit.mockResolvedValueOnce([
        {
          content: 'Olá',
          type: 'incoming',
          isAI: false,
          timestamp: new Date(),
          confidence: null
        }
      ]);

      // Mock products
      mockDb.limit.mockResolvedValueOnce([
        {
          id: 'prod-1',
          name: 'Produto Teste',
          description: 'Descrição teste',
          price: '99.99',
          currency: 'BRL',
          category: 'Eletrônicos',
          inStock: true
        }
      ]);

      // Mock AI configuration
      mockDb.limit.mockResolvedValueOnce([
        {
          conversationGoal: 'helpful',
          businessHours: {
            timezone: 'America/Sao_Paulo',
            schedule: {}
          }
        }
      ]);

      const context = await service.getConversationContext(customerPhone);

      expect(context).toBeDefined();
      expect(context.customerPhone).toBe(customerPhone);
      expect(context.customerName).toBe('João');
      expect(context.conversationGoal).toBe('helpful');
      expect(context.conversationHistory).toHaveLength(1);
      expect(context.products).toHaveLength(1);
    });

    it('should create new conversation for new customer', async () => {
      const customerPhone = '+5511888888888';
      
      // Mock no existing conversation
      mockDb.limit.mockResolvedValueOnce([]);

      // Mock conversation creation
      mockDb.returning.mockResolvedValueOnce([{
        id: 'new-conv-1',
        customerPhone,
        customerName: null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      // Mock empty history, products, and config
      mockDb.limit.mockResolvedValueOnce([]); // history
      mockDb.limit.mockResolvedValueOnce([]); // products
      mockDb.limit.mockResolvedValueOnce([]); // config

      const context = await service.getConversationContext(customerPhone);

      expect(context).toBeDefined();
      expect(context.customerPhone).toBe(customerPhone);
      expect(context.conversationHistory).toHaveLength(0);
      expect(context.products).toHaveLength(0);
      expect(context.conversationGoal).toBe('helpful'); // default
    });

    it('should handle database errors gracefully', async () => {
      const customerPhone = '+5511777777777';
      
      // Mock database error
      mockDb.limit.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(service.getConversationContext(customerPhone)).rejects.toThrow();
    });
  });

  describe('updateConversationHistory', () => {
    beforeEach(() => {
      // Mock existing conversation
      mockDb.limit.mockResolvedValue([{
        id: 'conv-1',
        customerPhone: '+5511999999999',
        status: 'active'
      }]);

      mockDb.values.mockReturnValue(mockDb);
      mockDb.set.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
    });

    it('should add incoming message to conversation', async () => {
      const customerPhone = '+5511999999999';
      const content = 'Olá, preciso de ajuda';
      
      await service.updateConversationHistory(customerPhone, content, 'incoming');

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          content,
          type: 'incoming',
          isAI: false
        })
      );
    });

    it('should add outgoing AI message with confidence', async () => {
      const customerPhone = '+5511999999999';
      const content = 'Como posso ajudá-lo?';
      const confidence = 0.95;
      
      await service.updateConversationHistory(
        customerPhone, 
        content, 
        'outgoing', 
        true, 
        confidence
      );

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          content,
          type: 'outgoing',
          isAI: true,
          confidence: confidence.toString()
        })
      );
    });

    it('should update conversation timestamp', async () => {
      const customerPhone = '+5511999999999';
      
      await service.updateConversationHistory(customerPhone, 'test', 'incoming');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedAt: expect.any(Date)
        })
      );
    });
  });

  describe('setConversationStatus', () => {
    beforeEach(() => {
      mockDb.limit.mockResolvedValue([{
        id: 'conv-1',
        customerPhone: '+5511999999999'
      }]);
      mockDb.set.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
    });

    it('should update conversation status to escalated', async () => {
      const customerPhone = '+5511999999999';
      
      await service.setConversationStatus(customerPhone, 'escalated');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'escalated',
          updatedAt: expect.any(Date)
        })
      );
    });

    it('should update conversation status to resolved', async () => {
      const customerPhone = '+5511999999999';
      
      await service.setConversationStatus(customerPhone, 'resolved');

      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved'
        })
      );
    });
  });

  describe('getConversationStats', () => {
    it('should return conversation statistics', async () => {
      const mockConversations = [
        { status: 'active' },
        { status: 'active' },
        { status: 'resolved' },
        { status: 'escalated' }
      ];

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockResolvedValue(mockConversations);

      const stats = await service.getConversationStats();

      expect(stats).toEqual({
        total: 4,
        active: 2,
        resolved: 1,
        escalated: 1
      });
    });

    it('should return stats for specific customer', async () => {
      const customerPhone = '+5511999999999';
      const mockConversations = [
        { status: 'active' },
        { status: 'resolved' }
      ];

      mockDb.select.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.from.mockResolvedValue(mockConversations);

      const stats = await service.getConversationStats(customerPhone);

      expect(stats).toEqual({
        total: 2,
        active: 1,
        resolved: 1,
        escalated: 0
      });
    });

    it('should handle empty conversation list', async () => {
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockResolvedValue([]);

      const stats = await service.getConversationStats();

      expect(stats).toEqual({
        total: 0,
        active: 0,
        resolved: 0,
        escalated: 0
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in updateConversationHistory', async () => {
      mockDb.limit.mockRejectedValue(new Error('Database error'));

      await expect(
        service.updateConversationHistory('+5511999999999', 'test', 'incoming')
      ).rejects.toThrow();
    });

    it('should handle database errors in setConversationStatus', async () => {
      mockDb.limit.mockRejectedValue(new Error('Database error'));

      await expect(
        service.setConversationStatus('+5511999999999', 'escalated')
      ).rejects.toThrow();
    });

    it('should handle database errors in getConversationStats', async () => {
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockRejectedValue(new Error('Database error'));

      await expect(service.getConversationStats()).rejects.toThrow();
    });
  });
});