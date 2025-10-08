import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { ConversationGoalService } from './conversation-goal.service';
import { ConversationGoal, ConversationGoalType } from '../../database/schema';

// Mock LangChain modules
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({
      content: 'Mocked AI response'
    })
  }))
}));

jest.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: {
    fromMessages: jest.fn().mockReturnValue({})
  },
  MessagesPlaceholder: jest.fn()
}));

jest.mock('@langchain/core/messages', () => ({
  HumanMessage: jest.fn(),
  AIMessage: jest.fn()
}));

jest.mock('@langchain/core/output_parsers', () => ({
  StringOutputParser: jest.fn()
}));

jest.mock('@langchain/core/runnables', () => ({
  RunnableSequence: {
    from: jest.fn().mockReturnValue({
      invoke: jest.fn().mockResolvedValue('Olá! Como posso ajudá-lo hoje? 😊')
    })
  }
}));

describe('AIService - Conversation Goal Integration', () => {
  let aiService: AIService;
  let conversationGoalService: ConversationGoalService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        'OPENAI_API_KEY': 'test-api-key',
        'AI_MODEL': 'gpt-3.5-turbo',
        'AI_CONFIDENCE_THRESHOLD': '0.8'
      };
      return config[key] || defaultValue;
    })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        ConversationGoalService,
        {
          provide: ConfigService,
          useValue: mockConfigService
        }
      ],
    }).compile();

    aiService = module.get<AIService>(AIService);
    conversationGoalService = module.get<ConversationGoalService>(ConversationGoalService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize the service
    await aiService.onModuleInit();
  });

  describe('Goal Management', () => {
    it('should set conversation goal successfully', async () => {
      await aiService.setConversationGoal(ConversationGoal.DEAL_CLOSER);
      
      const currentGoal = aiService.getCurrentGoal();
      expect(currentGoal).toBe(ConversationGoal.DEAL_CLOSER);
    });

    it('should get available goals', () => {
      const goals = aiService.getAvailableGoals();
      
      expect(goals).toBeInstanceOf(Array);
      expect(goals.length).toBe(5);
      
      const goalTypes = goals.map(goal => goal.type);
      expect(goalTypes).toContain(ConversationGoal.HELPFUL);
      expect(goalTypes).toContain(ConversationGoal.DEAL_CLOSER);
      expect(goalTypes).toContain(ConversationGoal.SUPPORT_AGENT);
      expect(goalTypes).toContain(ConversationGoal.LEAD_GENERATOR);
      expect(goalTypes).toContain(ConversationGoal.CUSTOM);
    });

    it('should get goal configuration', () => {
      const config = aiService.getGoalConfiguration(ConversationGoal.HELPFUL);
      
      expect(config).toBeDefined();
      expect(config.type).toBe(ConversationGoal.HELPFUL);
      expect(config.name).toBe('Assistente Prestativo');
    });

    it('should update custom goal configuration', async () => {
      const customPrompt = 'Você é um assistente especializado em vendas de carros.';
      const customInstructions = ['Sempre mencione segurança', 'Ofereça test drive'];
      const customStyle = {
        tone: 'entusiasmado',
        length: 'detailed' as const,
        emojiUsage: 'frequent' as const,
        formality: 'casual' as const
      };

      await aiService.updateCustomGoal(customPrompt, customInstructions, customStyle);
      
      const updatedConfig = aiService.getGoalConfiguration(ConversationGoal.CUSTOM);
      expect(updatedConfig.systemPrompt).toBe(customPrompt);
      expect(updatedConfig.behaviorInstructions).toEqual(customInstructions);
    });
  });

  describe('Goal-Specific Message Processing', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Smartphone XYZ',
        description: 'Smartphone com câmera de alta qualidade',
        price: 899.99,
        currency: 'BRL',
        inStock: true
      }
    ];

    it('should process message with helpful goal', async () => {
      await aiService.setConversationGoal(ConversationGoal.HELPFUL);
      
      const message = {
        content: 'Preciso de informações sobre smartphones',
        customerPhone: '+5511999999999'
      };

      const context = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: mockProducts,
        conversationGoal: ConversationGoal.HELPFUL as ConversationGoalType
      };

      const response = await aiService.processMessage(message, context);
      
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.metadata?.conversationGoal).toBe(ConversationGoal.HELPFUL);
      expect(response.metadata?.goalConfig).toBe('Assistente Prestativo');
    });

    it('should process message with deal_closer goal', async () => {
      await aiService.setConversationGoal(ConversationGoal.DEAL_CLOSER);
      
      const message = {
        content: 'Estou interessado em comprar um smartphone',
        customerPhone: '+5511999999999'
      };

      const context = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: mockProducts,
        conversationGoal: ConversationGoal.DEAL_CLOSER as ConversationGoalType
      };

      const response = await aiService.processMessage(message, context);
      
      expect(response).toBeDefined();
      expect(response.metadata?.conversationGoal).toBe(ConversationGoal.DEAL_CLOSER);
      expect(response.metadata?.goalConfig).toBe('Vendedor Focado');
    });

    it('should process message with support_agent goal', async () => {
      await aiService.setConversationGoal(ConversationGoal.SUPPORT_AGENT);
      
      const message = {
        content: 'Meu smartphone não está funcionando corretamente',
        customerPhone: '+5511999999999'
      };

      const context = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: mockProducts,
        conversationGoal: ConversationGoal.SUPPORT_AGENT as ConversationGoalType
      };

      const response = await aiService.processMessage(message, context);
      
      expect(response).toBeDefined();
      expect(response.metadata?.conversationGoal).toBe(ConversationGoal.SUPPORT_AGENT);
      expect(response.metadata?.goalConfig).toBe('Agente de Suporte');
    });

    it('should process message with lead_generator goal', async () => {
      await aiService.setConversationGoal(ConversationGoal.LEAD_GENERATOR);
      
      const message = {
        content: 'Gostaria de saber mais sobre seus produtos',
        customerPhone: '+5511999999999'
      };

      const context = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: mockProducts,
        conversationGoal: ConversationGoal.LEAD_GENERATOR as ConversationGoalType
      };

      const response = await aiService.processMessage(message, context);
      
      expect(response).toBeDefined();
      expect(response.metadata?.conversationGoal).toBe(ConversationGoal.LEAD_GENERATOR);
      expect(response.metadata?.goalConfig).toBe('Gerador de Leads');
    });

    it('should update conversation chain when goal changes', async () => {
      // Start with helpful goal
      await aiService.setConversationGoal(ConversationGoal.HELPFUL);
      
      const message = {
        content: 'Olá',
        customerPhone: '+5511999999999'
      };

      const helpfulContext = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: mockProducts,
        conversationGoal: ConversationGoal.HELPFUL as ConversationGoalType
      };

      const helpfulResponse = await aiService.processMessage(message, helpfulContext);
      expect(helpfulResponse.metadata?.conversationGoal).toBe(ConversationGoal.HELPFUL);

      // Change to deal_closer goal in context
      const dealCloserContext = {
        ...helpfulContext,
        conversationGoal: ConversationGoal.DEAL_CLOSER as ConversationGoalType
      };

      const dealCloserResponse = await aiService.processMessage(message, dealCloserContext);
      expect(dealCloserResponse.metadata?.conversationGoal).toBe(ConversationGoal.DEAL_CLOSER);
      
      // Verify the service updated its current goal
      expect(aiService.getCurrentGoal()).toBe(ConversationGoal.DEAL_CLOSER);
    });
  });

  describe('Goal-Specific Product Formatting', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Smartphone XYZ',
        description: 'Smartphone com câmera de alta qualidade',
        price: 899.99,
        currency: 'BRL',
        inStock: true
      },
      {
        id: '2',
        name: 'Notebook ABC',
        description: 'Notebook para trabalho',
        price: 2499.99,
        currency: 'BRL',
        inStock: false
      }
    ];

    it('should format products differently for deal_closer goal', async () => {
      await aiService.setConversationGoal(ConversationGoal.DEAL_CLOSER);
      
      const message = {
        content: 'Quais produtos vocês têm?',
        customerPhone: '+5511999999999'
      };

      const context = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: mockProducts,
        conversationGoal: ConversationGoal.DEAL_CLOSER as ConversationGoalType
      };

      // The formatProductsInfoForGoal method should be called internally
      // We can't directly test it, but we can verify the message processing works
      const response = await aiService.processMessage(message, context);
      
      expect(response).toBeDefined();
      expect(response.metadata?.conversationGoal).toBe(ConversationGoal.DEAL_CLOSER);
    });
  });

  describe('Goal-Specific Confidence Calculation', () => {
    it('should calculate higher confidence for sales-oriented responses in deal_closer goal', async () => {
      await aiService.setConversationGoal(ConversationGoal.DEAL_CLOSER);
      
      // Mock the conversation chain to return a sales-oriented response
      const mockChain = {
        invoke: jest.fn().mockResolvedValue('Temos uma oferta especial no smartphone por R$ 799! Gostaria de comprar?')
      };
      
      // Replace the conversation chain
      (aiService as any).conversationChain = mockChain;
      
      const message = {
        content: 'Qual o preço do smartphone?',
        customerPhone: '+5511999999999'
      };

      const context = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: [],
        conversationGoal: ConversationGoal.DEAL_CLOSER as ConversationGoalType
      };

      const response = await aiService.processMessage(message, context);
      
      // The confidence should be adjusted based on sales language
      expect(response.confidence).toBeGreaterThan(0.7);
    });

    it('should calculate higher confidence for question-based responses in lead_generator goal', async () => {
      await aiService.setConversationGoal(ConversationGoal.LEAD_GENERATOR);
      
      // Mock the conversation chain to return a question-based response
      const mockChain = {
        invoke: jest.fn().mockResolvedValue('Qual é o seu orçamento para um smartphone? Como você pretende usar o aparelho?')
      };
      
      (aiService as any).conversationChain = mockChain;
      
      const message = {
        content: 'Preciso de um smartphone',
        customerPhone: '+5511999999999'
      };

      const context = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: [],
        conversationGoal: ConversationGoal.LEAD_GENERATOR as ConversationGoalType
      };

      const response = await aiService.processMessage(message, context);
      
      expect(response.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully when setting invalid goal', async () => {
      // This should not throw an error, but use the default helpful goal
      const invalidGoal = 'invalid_goal' as ConversationGoalType;
      
      await expect(aiService.setConversationGoal(invalidGoal)).resolves.not.toThrow();
      
      // Should fall back to helpful goal
      const config = aiService.getGoalConfiguration(invalidGoal);
      expect(config.type).toBe(ConversationGoal.HELPFUL);
    });

    it('should handle processing errors and return fallback response', async () => {
      // Mock the conversation chain to throw an error
      const mockChain = {
        invoke: jest.fn().mockRejectedValue(new Error('AI processing failed'))
      };
      
      (aiService as any).conversationChain = mockChain;
      
      const message = {
        content: 'Test message',
        customerPhone: '+5511999999999'
      };

      const context = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: [],
        conversationGoal: ConversationGoal.HELPFUL as ConversationGoalType
      };

      const response = await aiService.processMessage(message, context);
      
      expect(response.confidence).toBe(0);
      expect(response.shouldEscalate).toBe(true);
      expect(response.metadata?.error).toBeDefined();
    });
  });
});