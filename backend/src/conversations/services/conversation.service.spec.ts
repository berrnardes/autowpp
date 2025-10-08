import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { DatabaseService } from '../../database/database.service';
import { ConversationStatus, MessageType } from '../../database/schema';

describe('ConversationService', () => {
  let service: ConversationService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockDb: any;

  const mockConversation = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    customerPhone: '+5511999999999',
    customerName: 'João Silva',
    status: ConversationStatus.ACTIVE,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z')
  };

  const mockMessage = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    conversationId: mockConversation.id,
    content: 'Olá, como posso ajudar?',
    type: MessageType.OUTGOING,
    isAI: true,
    confidence: 0.95,
    timestamp: new Date('2024-01-01T10:01:00Z'),
    metadata: {}
  };

  beforeEach(async () => {
    // Create a comprehensive mock database
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn()
    };

    mockDatabaseService = {
      getDatabase: jest.fn(() => mockDb)
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService
        }
      ]
    }).compile();

    service = module.get<ConversationService>(ConversationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createConversation', () => {
    it('should create a new conversation when none exists', async () => {
      const createDto = {
        customerPhone: '+5511999999999',
        customerName: 'João Silva'
      };

      // Mock database calls
      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]) // No existing conversation
      };

      const insertQuery = {
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockConversation])
      };

      mockDb.select.mockReturnValue(selectQuery);
      mockDb.insert.mockReturnValue(insertQuery);

      const result = await service.createConversation(createDto);

      expect(result).toEqual(mockConversation);
    });

    it('should return existing active conversation', async () => {
      const createDto = {
        customerPhone: '+5511999999999',
        customerName: 'João Silva'
      };

      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockConversation]) // Existing conversation
      };

      mockDb.select.mockReturnValue(selectQuery);

      const result = await service.createConversation(createDto);

      expect(result).toEqual(mockConversation);
    });
  });

  describe('findConversationById', () => {
    it('should return conversation with messages when found', async () => {
      const conversationId = mockConversation.id;

      const selectQuery1 = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockConversation])
      };

      const selectQuery2 = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([mockMessage])
      };

      mockDb.select
        .mockReturnValueOnce(selectQuery1)
        .mockReturnValueOnce(selectQuery2);

      const result = await service.findConversationById(conversationId);

      expect(result).toEqual({
        ...mockConversation,
        messages: [mockMessage]
      });
    });

    it('should throw NotFoundException when conversation not found', async () => {
      const conversationId = 'non-existent-id';

      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]) // No conversation found
      };

      mockDb.select.mockReturnValue(selectQuery);

      await expect(service.findConversationById(conversationId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updateConversation', () => {
    it('should update conversation when it exists', async () => {
      const conversationId = mockConversation.id;
      const updateDto = { status: ConversationStatus.RESOLVED };
      const updatedConversation = { ...mockConversation, ...updateDto };

      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockConversation])
      };

      const updateQuery = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedConversation])
      };

      mockDb.select.mockReturnValue(selectQuery);
      mockDb.update.mockReturnValue(updateQuery);

      const result = await service.updateConversation(conversationId, updateDto);

      expect(result).toEqual(updatedConversation);
    });

    it('should throw NotFoundException when conversation not found', async () => {
      const conversationId = 'non-existent-id';
      const updateDto = { status: ConversationStatus.RESOLVED };

      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]) // No conversation found
      };

      mockDb.select.mockReturnValue(selectQuery);

      await expect(service.updateConversation(conversationId, updateDto))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('addMessage', () => {
    it('should add message to existing conversation', async () => {
      const conversationId = mockConversation.id;
      const createMessageDto = {
        content: 'Nova mensagem',
        type: MessageType.INCOMING,
        isAI: false
      };

      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockConversation])
      };

      const insertQuery = {
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockMessage])
      };

      const updateQuery = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockConversation])
      };

      mockDb.select.mockReturnValue(selectQuery);
      mockDb.insert.mockReturnValue(insertQuery);
      mockDb.update.mockReturnValue(updateQuery);

      const result = await service.addMessage(conversationId, createMessageDto);

      expect(result).toEqual(mockMessage);
    });

    it('should throw NotFoundException when conversation not found', async () => {
      const conversationId = 'non-existent-id';
      const createMessageDto = {
        content: 'Nova mensagem',
        type: MessageType.INCOMING,
        isAI: false
      };

      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]) // No conversation found
      };

      mockDb.select.mockReturnValue(selectQuery);

      await expect(service.addMessage(conversationId, createMessageDto))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getConversationHistory', () => {
    it('should return conversation history when conversation exists', async () => {
      const conversationId = mockConversation.id;

      const selectQuery1 = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockConversation])
      };

      const selectQuery2 = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([mockMessage])
      };

      mockDb.select
        .mockReturnValueOnce(selectQuery1)
        .mockReturnValueOnce(selectQuery2);

      const result = await service.getConversationHistory(conversationId);

      expect(result).toEqual([mockMessage]);
    });

    it('should throw NotFoundException when conversation not found', async () => {
      const conversationId = 'non-existent-id';

      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]) // No conversation found
      };

      mockDb.select.mockReturnValue(selectQuery);

      await expect(service.getConversationHistory(conversationId))
        .rejects.toThrow(NotFoundException);
    });
  });
});