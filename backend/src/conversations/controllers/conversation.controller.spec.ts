import { Test, TestingModule } from '@nestjs/testing';
import { ConversationController } from './conversation.controller';
import { ConversationService } from '../services/conversation.service';
import { ConversationStatus, MessageType } from '../../database/schema';

describe('ConversationController', () => {
  let controller: ConversationController;
  let mockConversationService: jest.Mocked<ConversationService>;

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

  const mockConversationWithMessages = {
    ...mockConversation,
    messages: [mockMessage]
  };

  beforeEach(async () => {
    mockConversationService = {
      createConversation: jest.fn(),
      findConversationById: jest.fn(),
      findConversationByPhone: jest.fn(),
      findConversations: jest.fn(),
      updateConversation: jest.fn(),
      addMessage: jest.fn(),
      getConversationHistory: jest.fn(),
      resolveConversation: jest.fn(),
      escalateConversation: jest.fn(),
      findConversationsNeedingAttention: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      providers: [
        {
          provide: ConversationService,
          useValue: mockConversationService
        }
      ]
    }).compile();

    controller = module.get<ConversationController>(ConversationController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const createDto = {
        customerPhone: '+5511999999999',
        customerName: 'João Silva'
      };

      mockConversationService.createConversation.mockResolvedValue(mockConversation);

      const result = await controller.createConversation(createDto);

      expect(result).toEqual(mockConversation);
      expect(mockConversationService.createConversation).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findConversations', () => {
    it('should return paginated conversations', async () => {
      const query = { page: 1, limit: 20 };
      const paginatedResult = {
        conversations: [mockConversationWithMessages],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      };

      mockConversationService.findConversations.mockResolvedValue(paginatedResult);

      const result = await controller.findConversations(query);

      expect(result).toEqual(paginatedResult);
      expect(mockConversationService.findConversations).toHaveBeenCalledWith(query);
    });
  });

  describe('findConversationsNeedingAttention', () => {
    it('should return conversations needing attention', async () => {
      const conversationsNeedingAttention = [mockConversationWithMessages];

      mockConversationService.findConversationsNeedingAttention
        .mockResolvedValue(conversationsNeedingAttention);

      const result = await controller.findConversationsNeedingAttention();

      expect(result).toEqual(conversationsNeedingAttention);
      expect(mockConversationService.findConversationsNeedingAttention).toHaveBeenCalled();
    });
  });

  describe('findConversationByPhone', () => {
    it('should return conversation by phone number', async () => {
      const phoneNumber = '+5511999999999';

      mockConversationService.findConversationByPhone
        .mockResolvedValue(mockConversationWithMessages);

      const result = await controller.findConversationByPhone(phoneNumber);

      expect(result).toEqual(mockConversationWithMessages);
      expect(mockConversationService.findConversationByPhone).toHaveBeenCalledWith(phoneNumber);
    });

    it('should return null when no conversation found', async () => {
      const phoneNumber = '+5511999999999';

      mockConversationService.findConversationByPhone.mockResolvedValue(null);

      const result = await controller.findConversationByPhone(phoneNumber);

      expect(result).toBeNull();
    });
  });

  describe('findConversationById', () => {
    it('should return conversation by ID', async () => {
      const conversationId = mockConversation.id;

      mockConversationService.findConversationById
        .mockResolvedValue(mockConversationWithMessages);

      const result = await controller.findConversationById(conversationId);

      expect(result).toEqual(mockConversationWithMessages);
      expect(mockConversationService.findConversationById).toHaveBeenCalledWith(conversationId);
    });
  });

  describe('updateConversation', () => {
    it('should update conversation', async () => {
      const conversationId = mockConversation.id;
      const updateDto = { status: ConversationStatus.RESOLVED };
      const updatedConversation = { ...mockConversation, ...updateDto };

      mockConversationService.updateConversation.mockResolvedValue(updatedConversation);

      const result = await controller.updateConversation(conversationId, updateDto);

      expect(result).toEqual(updatedConversation);
      expect(mockConversationService.updateConversation)
        .toHaveBeenCalledWith(conversationId, updateDto);
    });
  });

  describe('addMessage', () => {
    it('should add message to conversation', async () => {
      const conversationId = mockConversation.id;
      const createMessageDto = {
        content: 'Nova mensagem',
        type: MessageType.INCOMING,
        isAI: false
      };

      mockConversationService.addMessage.mockResolvedValue(mockMessage);

      const result = await controller.addMessage(conversationId, createMessageDto);

      expect(result).toEqual(mockMessage);
      expect(mockConversationService.addMessage)
        .toHaveBeenCalledWith(conversationId, createMessageDto);
    });
  });

  describe('getConversationHistory', () => {
    it('should return conversation history', async () => {
      const conversationId = mockConversation.id;
      const messages = [mockMessage];

      mockConversationService.getConversationHistory.mockResolvedValue(messages);

      const result = await controller.getConversationHistory(conversationId);

      expect(result).toEqual(messages);
      expect(mockConversationService.getConversationHistory)
        .toHaveBeenCalledWith(conversationId, undefined);
    });

    it('should return limited conversation history', async () => {
      const conversationId = mockConversation.id;
      const limit = 10;
      const messages = [mockMessage];

      mockConversationService.getConversationHistory.mockResolvedValue(messages);

      const result = await controller.getConversationHistory(conversationId, limit);

      expect(result).toEqual(messages);
      expect(mockConversationService.getConversationHistory)
        .toHaveBeenCalledWith(conversationId, limit);
    });
  });

  describe('resolveConversation', () => {
    it('should resolve conversation', async () => {
      const conversationId = mockConversation.id;
      const resolvedConversation = { 
        ...mockConversation, 
        status: ConversationStatus.RESOLVED 
      };

      mockConversationService.resolveConversation.mockResolvedValue(resolvedConversation);

      const result = await controller.resolveConversation(conversationId);

      expect(result).toEqual(resolvedConversation);
      expect(mockConversationService.resolveConversation).toHaveBeenCalledWith(conversationId);
    });
  });

  describe('escalateConversation', () => {
    it('should escalate conversation', async () => {
      const conversationId = mockConversation.id;
      const escalatedConversation = { 
        ...mockConversation, 
        status: ConversationStatus.ESCALATED 
      };

      mockConversationService.escalateConversation.mockResolvedValue(escalatedConversation);

      const result = await controller.escalateConversation(conversationId);

      expect(result).toEqual(escalatedConversation);
      expect(mockConversationService.escalateConversation).toHaveBeenCalledWith(conversationId);
    });
  });
});