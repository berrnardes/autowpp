import { Test, TestingModule } from '@nestjs/testing';
import { MessageProcessorService } from './message-processor.service';
import { DatabaseService } from '../../database/database.service';
import { IncomingMessage } from '../interfaces/whatsapp.interface';
import { ConversationStatus, MessageType } from '../../database/schema';

describe('MessageProcessorService', () => {
  let service: MessageProcessorService;
  let mockDb: any;

  const mockIncomingMessage: IncomingMessage = {
    messageId: 'msg_123',
    from: '+1234567890',
    content: 'Hello, I need help',
    timestamp: new Date(),
    customerName: 'John Doe'
  };

  const mockConversation = {
    id: 'conv_123',
    customerPhone: '+1234567890',
    customerName: 'John Doe',
    status: ConversationStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockMessage = {
    id: 'msg_456',
    conversationId: 'conv_123',
    content: 'Hello, I need help',
    type: MessageType.INCOMING,
    isAI: false,
    timestamp: new Date()
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };

    // Mock DatabaseService
    const mockDatabaseService = {
      getDatabase: jest.fn().mockReturnValue(mockDb)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageProcessorService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService
        }
      ]
    }).compile();

    service = module.get<MessageProcessorService>(MessageProcessorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processIncomingMessage', () => {
    it('should process incoming message and create new conversation', async () => {
      // Mock no existing conversation (findOrCreateConversation)
      mockDb.limit.mockResolvedValueOnce([]);
      
      // Mock conversation creation
      mockDb.returning.mockResolvedValueOnce([mockConversation]);
      
      // Mock message storage
      mockDb.returning.mockResolvedValueOnce([mockMessage]);
      
      // Mock shouldRespondToMessage - conversation lookup
      mockDb.limit.mockResolvedValueOnce([mockConversation]);
      
      // Mock getConversationHistory call (inside getConversationContext)
      mockDb.limit.mockResolvedValueOnce([mockMessage]);
      
      // Mock conversation lookup for context (inside getConversationContext)
      mockDb.limit.mockResolvedValueOnce([mockConversation]);

      const result = await service.processIncomingMessage(mockIncomingMessage);

      expect(result).toEqual({
        conversationId: mockConversation.id,
        messageId: mockMessage.id,
        shouldRespond: true,
        context: expect.objectContaining({
          conversationId: mockConversation.id,
          customerPhone: mockConversation.customerPhone,
          customerName: mockConversation.customerName
        })
      });

      expect(mockDb.insert).toHaveBeenCalledTimes(2); // conversation + message
    });

    it('should use existing conversation if found', async () => {
      // Mock existing conversation (findOrCreateConversation)
      mockDb.limit.mockResolvedValueOnce([mockConversation]);
      
      // Mock message storage
      mockDb.returning.mockResolvedValueOnce([mockMessage]);
      
      // Mock shouldRespondToMessage - conversation lookup
      mockDb.limit.mockResolvedValueOnce([mockConversation]);
      
      // Mock getConversationHistory call (inside getConversationContext)
      mockDb.limit.mockResolvedValueOnce([mockMessage]);
      
      // Mock conversation lookup for context (inside getConversationContext)
      mockDb.limit.mockResolvedValueOnce([mockConversation]);

      const result = await service.processIncomingMessage(mockIncomingMessage);

      expect(result.conversationId).toBe(mockConversation.id);
      expect(mockDb.insert).toHaveBeenCalledTimes(1); // only message, not conversation
    });

    it('should not respond to messages with stop words', async () => {
      const stopMessage: IncomingMessage = {
        ...mockIncomingMessage,
        content: 'Please stop sending me messages'
      };

      // Mock existing conversation (findOrCreateConversation)
      mockDb.limit.mockResolvedValueOnce([mockConversation]);
      
      // Mock message storage
      mockDb.returning.mockResolvedValueOnce([mockMessage]);
      
      // Mock shouldRespondToMessage - conversation lookup
      mockDb.limit.mockResolvedValueOnce([mockConversation]);
      
      // Mock getConversationHistory call (inside getConversationContext)
      mockDb.limit.mockResolvedValueOnce([mockMessage]);
      
      // Mock conversation lookup for context (inside getConversationContext)
      mockDb.limit.mockResolvedValueOnce([mockConversation]);

      const result = await service.processIncomingMessage(stopMessage);

      expect(result.shouldRespond).toBe(false);
      expect(mockDb.update).toHaveBeenCalled(); // Should update conversation status
    });
  });

  describe('storeOutgoingMessage', () => {
    it('should store outgoing message successfully', async () => {
      const messageContent = 'Thank you for your message!';
      
      mockDb.returning.mockResolvedValue([{ id: 'msg_outgoing_123' }]);

      const messageId = await service.storeOutgoingMessage(
        mockConversation.id,
        messageContent,
        true,
        0.95
      );

      expect(messageId).toBe('msg_outgoing_123');
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: mockConversation.id,
          content: messageContent,
          type: MessageType.OUTGOING,
          isAI: true,
          confidence: '0.95'
        })
      );
    });

    it('should update conversation timestamp when storing message', async () => {
      mockDb.returning.mockResolvedValue([{ id: 'msg_123' }]);

      await service.storeOutgoingMessage(mockConversation.id, 'Test message');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedAt: expect.any(Date)
        })
      );
    });
  });

  describe('getConversationHistory', () => {
    it('should retrieve conversation history in chronological order', async () => {
      const mockMessages = [
        { ...mockMessage, id: 'msg_1', timestamp: new Date('2023-01-01') },
        { ...mockMessage, id: 'msg_2', timestamp: new Date('2023-01-02') },
        { ...mockMessage, id: 'msg_3', timestamp: new Date('2023-01-03') }
      ];

      mockDb.limit.mockResolvedValue(mockMessages.reverse()); // Simulate DESC order from DB

      const history = await service.getConversationHistory(mockConversation.id, 10);

      expect(history).toHaveLength(3);
      expect(history[0].id).toBe('msg_1'); // Should be in chronological order
      expect(history[2].id).toBe('msg_3');
    });

    it('should limit conversation history to specified count', async () => {
      const mockMessages = Array.from({ length: 5 }, (_, i) => ({
        ...mockMessage,
        id: `msg_${i}`
      }));

      mockDb.limit.mockResolvedValue(mockMessages);

      await service.getConversationHistory(mockConversation.id, 3);

      expect(mockDb.limit).toHaveBeenCalledWith(3);
    });
  });

  describe('markConversationAsEscalated', () => {
    it('should update conversation status to escalated', async () => {
      await service.markConversationAsEscalated(mockConversation.id);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ConversationStatus.ESCALATED,
          updatedAt: expect.any(Date)
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.limit.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.processIncomingMessage(mockIncomingMessage))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle message storage errors', async () => {
      mockDb.limit.mockResolvedValueOnce([mockConversation]);
      mockDb.returning.mockRejectedValue(new Error('Insert failed'));

      await expect(service.processIncomingMessage(mockIncomingMessage))
        .rejects.toThrow('Insert failed');
    });
  });

  describe('conversation context', () => {
    it('should include recent messages and conversation details in context', async () => {
      // Mock existing conversation (findOrCreateConversation)
      mockDb.limit.mockResolvedValueOnce([mockConversation]);
      
      // Mock message storage
      mockDb.returning.mockResolvedValueOnce([mockMessage]);
      
      // Mock shouldRespondToMessage - conversation lookup
      mockDb.limit.mockResolvedValueOnce([mockConversation]);
      
      // Mock getConversationHistory call (inside getConversationContext)
      const recentMessages = [mockMessage];
      mockDb.limit.mockResolvedValueOnce(recentMessages);
      
      // Mock conversation lookup for context (inside getConversationContext)
      mockDb.limit.mockResolvedValueOnce([mockConversation]);

      const result = await service.processIncomingMessage(mockIncomingMessage);

      expect(result.context).toEqual({
        conversationId: mockConversation.id,
        customerPhone: mockConversation.customerPhone,
        customerName: mockConversation.customerName,
        recentMessages,
        conversationStatus: mockConversation.status
      });
    });
  });
});