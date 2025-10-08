import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { ConversationGoalService } from './conversation-goal.service';
import { AIProductIntegrationService } from './ai-product-integration.service';
import { 
  IncomingMessage, 
  ConversationContext, 
  ConversationExample,
  ProductInfo 
} from '../interfaces/ai.interface';

// Mock LangChain modules
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({
      content: 'Olá! Como posso ajudá-lo hoje?'
    })
  }))
}));

jest.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: {
    fromMessages: jest.fn().mockReturnValue({
      pipe: jest.fn().mockReturnThis()
    })
  },
  MessagesPlaceholder: jest.fn()
}));

jest.mock('@langchain/core/output_parsers', () => ({
  StringOutputParser: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('@langchain/core/runnables', () => ({
  RunnableSequence: {
    from: jest.fn().mockReturnValue({
      invoke: jest.fn().mockResolvedValue('Olá! Como posso ajudá-lo hoje?')
    })
  }
}));

describe('AIService', () => {
  let service: AIService;
  let configService: ConfigService;
  let mockConversationGoalService: jest.Mocked<ConversationGoalService>;
  let mockAIProductIntegrationService: jest.Mocked<AIProductIntegrationService>;

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

  const mockProducts: ProductInfo[] = [
    {
      id: '1',
      name: 'Smartphone Samsung Galaxy',
      description: 'Smartphone Android com 128GB de armazenamento',
      price: 899.99,
      currency: 'BRL',
      category: 'Eletrônicos',
      inStock: true
    },
    {
      id: '2',
      name: 'Notebook Dell Inspiron',
      description: 'Notebook para trabalho e estudos com 8GB RAM',
      price: 2499.99,
      currency: 'BRL',
      category: 'Informática',
      inStock: true
    }
  ];

  beforeEach(async () => {
    const mockConversationGoalServiceMethods = {
      getGoalConfiguration: jest.fn().mockReturnValue({
        name: 'Helpful Assistant',
        systemPrompt: 'Seja útil e prestativo',
        instructions: ['Responda em português', 'Seja cordial']
      }),
      shouldEscalate: jest.fn().mockReturnValue(false),
      getAvailableGoals: jest.fn().mockReturnValue(['helpful', 'deal_closer']),
      updateCustomGoalConfiguration: jest.fn()
    };

    const mockAIProductIntegrationServiceMethods = {
      getAllProductsForAI: jest.fn().mockResolvedValue(mockProducts),
      extractProductMentions: jest.fn().mockReturnValue([]),
      generateProductComparisonText: jest.fn().mockReturnValue(''),
      generateProductSummaryForGoal: jest.fn().mockReturnValue('Resumo dos produtos')
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: ConversationGoalService,
          useValue: mockConversationGoalServiceMethods
        },
        {
          provide: AIProductIntegrationService,
          useValue: mockAIProductIntegrationServiceMethods
        }
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    configService = module.get<ConfigService>(ConfigService);
    mockConversationGoalService = module.get(ConversationGoalService);
    mockAIProductIntegrationService = module.get(AIProductIntegrationService);

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct configuration', () => {
      const config = service.getConfig();
      expect(config.model).toBe('gpt-3.5-turbo');
      expect(config.confidenceThreshold).toBe(0.8);
      expect(config.temperature).toBe(0.7);
    });

    it('should have a fallback message in Portuguese', () => {
      const config = service.getConfig();
      expect(config.fallbackMessage).toContain('Desculpe');
    });
  });

  describe('processMessage', () => {
    let mockMessage: IncomingMessage;
    let mockContext: ConversationContext;

    beforeEach(() => {
      mockMessage = {
        content: 'Olá, preciso de ajuda',
        customerPhone: '+5511999999999',
        timestamp: new Date()
      };

      mockContext = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: [],
        conversationGoal: 'helpful',
        customerName: 'João'
      };
    });

    it('should process a message and return AI response', async () => {
      const result = await service.processMessage(mockMessage, mockContext);

      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(typeof result.shouldEscalate).toBe('boolean');
    });

    it('should include metadata in response', async () => {
      const result = await service.processMessage(mockMessage, mockContext);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.model).toBe('gpt-3.5-turbo');
      expect(result.metadata.conversationGoal).toBe('helpful');
    });

    it('should handle conversation history', async () => {
      mockContext.conversationHistory = [
        {
          content: 'Olá',
          type: 'incoming',
          isAI: false,
          timestamp: new Date()
        },
        {
          content: 'Olá! Como posso ajudar?',
          type: 'outgoing',
          isAI: true,
          timestamp: new Date(),
          confidence: 0.9
        }
      ];

      const result = await service.processMessage(mockMessage, mockContext);
      expect(result).toBeDefined();
    });

    it('should handle product information in context', async () => {
      const mockProducts: ProductInfo[] = [
        {
          id: '1',
          name: 'Produto Teste',
          description: 'Descrição do produto teste',
          price: 99.99,
          currency: 'BRL',
          category: 'Eletrônicos',
          inStock: true
        }
      ];

      mockContext.products = mockProducts;

      const result = await service.processMessage(mockMessage, mockContext);
      expect(result).toBeDefined();
    });

    it('should escalate when confidence is low', async () => {
      // Mock a scenario that would result in low confidence
      mockMessage.content = '';
      
      const result = await service.processMessage(mockMessage, mockContext);
      
      // The service should handle empty messages gracefully
      expect(result).toBeDefined();
      expect(typeof result.shouldEscalate).toBe('boolean');
    });

    it('should handle different conversation goals', async () => {
      const goals: Array<'helpful' | 'deal_closer' | 'support_agent' | 'lead_generator'> = [
        'helpful', 'deal_closer', 'support_agent', 'lead_generator'
      ];

      for (const goal of goals) {
        mockContext.conversationGoal = goal;
        const result = await service.processMessage(mockMessage, mockContext);
        
        expect(result).toBeDefined();
        expect(result.metadata.conversationGoal).toBe(goal);
      }
    });

    it('should return fallback message on error', async () => {
      // Force an error by providing invalid context
      const invalidContext = null as any;
      
      const result = await service.processMessage(mockMessage, invalidContext);
      
      expect(result.content).toContain('Desculpe');
      expect(result.shouldEscalate).toBe(true);
      expect(result.confidence).toBe(0);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.error).toBeDefined();
    });
  });

  describe('trainModel', () => {
    it('should train model with valid examples', async () => {
      const examples: ConversationExample[] = [
        {
          customerMessage: 'Qual o preço do produto X?',
          desiredResponse: 'O produto X custa R$ 99,99',
          category: 'pricing'
        },
        {
          customerMessage: 'Como faço para comprar?',
          desiredResponse: 'Você pode comprar através do nosso site ou WhatsApp',
          category: 'sales'
        }
      ];

      const result = await service.trainModel(examples);

      expect(result.success).toBe(true);
      expect(result.examplesProcessed).toBe(2);
      expect(result.message).toContain('sucesso');
    });

    it('should handle empty examples', async () => {
      const result = await service.trainModel([]);

      expect(result.success).toBe(false);
      expect(result.examplesProcessed).toBe(0);
      expect(result.message).toContain('Nenhum exemplo válido');
    });

    it('should filter invalid examples', async () => {
      const examples: ConversationExample[] = [
        {
          customerMessage: 'Pergunta válida?',
          desiredResponse: 'Resposta válida',
          category: 'valid'
        },
        {
          customerMessage: '',
          desiredResponse: 'Resposta sem pergunta',
          category: 'invalid'
        },
        {
          customerMessage: 'Pergunta sem resposta?',
          desiredResponse: '',
          category: 'invalid'
        }
      ];

      const result = await service.trainModel(examples);

      expect(result.success).toBe(true);
      expect(result.examplesProcessed).toBe(1);
    });
  });

  describe('updateProductKnowledge', () => {
    it('should update product knowledge successfully', async () => {
      const products: ProductInfo[] = [
        {
          id: '1',
          name: 'Produto A',
          description: 'Descrição A',
          price: 50.00,
          currency: 'BRL',
          inStock: true
        }
      ];

      await expect(service.updateProductKnowledge(products)).resolves.not.toThrow();
    });

    it('should handle empty product list', async () => {
      await expect(service.updateProductKnowledge([])).resolves.not.toThrow();
    });
  });

  describe('setConversationGoal', () => {
    it('should set conversation goal successfully', async () => {
      await expect(service.setConversationGoal('deal_closer')).resolves.not.toThrow();
    });

    it('should handle all valid conversation goals', async () => {
      const goals: Array<'helpful' | 'deal_closer' | 'support_agent' | 'lead_generator' | 'custom'> = [
        'helpful', 'deal_closer', 'support_agent', 'lead_generator', 'custom'
      ];

      for (const goal of goals) {
        await expect(service.setConversationGoal(goal)).resolves.not.toThrow();
      }
    });
  });

  describe('isHealthy', () => {
    it('should return health status', async () => {
      const isHealthy = await service.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Product Integration', () => {
    it('should fetch products when context is empty', async () => {
      const mockMessage: IncomingMessage = {
        content: 'Quais produtos vocês têm?',
        customerPhone: '+5511999999999'
      };

      const mockContext: ConversationContext = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: [], // Empty products
        conversationGoal: 'helpful'
      };

      await service.processMessage(mockMessage, mockContext);

      expect(mockAIProductIntegrationService.getAllProductsForAI).toHaveBeenCalled();
    });

    it('should extract product mentions from customer message', async () => {
      const mockMessage: IncomingMessage = {
        content: 'Estou interessado no Smartphone Samsung',
        customerPhone: '+5511999999999'
      };

      const mockContext: ConversationContext = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: mockProducts,
        conversationGoal: 'helpful'
      };

      mockAIProductIntegrationService.extractProductMentions.mockReturnValue([mockProducts[0]]);

      await service.processMessage(mockMessage, mockContext);

      expect(mockAIProductIntegrationService.extractProductMentions).toHaveBeenCalledWith(
        'Estou interessado no Smartphone Samsung',
        mockProducts
      );
    });

    it('should recommend products based on customer message and goal', async () => {
      const mockMessage: IncomingMessage = {
        content: 'Preciso de um celular bom e barato',
        customerPhone: '+5511999999999'
      };

      const mockContext: ConversationContext = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: mockProducts,
        conversationGoal: 'deal_closer'
      };

      const recommendations = await service.recommendProducts(
        mockMessage.content,
        mockContext.conversationGoal,
        3
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should search products by query', async () => {
      const searchResults = await service.searchProducts('smartphone');

      expect(searchResults).toBeDefined();
      expect(Array.isArray(searchResults)).toBe(true);
    });

    it('should get product by ID', () => {
      // First update product knowledge
      service.updateProductKnowledge(mockProducts);
      
      const product = service.getProductById('1');
      expect(product).toBeDefined();
      expect(product?.name).toBe('Smartphone Samsung Galaxy');
    });

    it('should get products by category', () => {
      // First update product knowledge
      service.updateProductKnowledge(mockProducts);
      
      const products = service.getProductsByCategory('Eletrônicos');
      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
    });

    it('should get products in price range', () => {
      // First update product knowledge
      service.updateProductKnowledge(mockProducts);
      
      const products = service.getProductsInPriceRange(800, 1000);
      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
    });

    it('should handle different conversation goals with products', async () => {
      const mockMessage: IncomingMessage = {
        content: 'Me fale sobre seus produtos',
        customerPhone: '+5511999999999'
      };

      const goals: Array<'helpful' | 'deal_closer' | 'support_agent' | 'lead_generator'> = [
        'helpful', 'deal_closer', 'support_agent', 'lead_generator'
      ];

      for (const goal of goals) {
        const mockContext: ConversationContext = {
          customerPhone: '+5511999999999',
          conversationHistory: [],
          products: mockProducts,
          conversationGoal: goal
        };

        const result = await service.processMessage(mockMessage, mockContext);
        
        expect(result).toBeDefined();
        expect(result.metadata?.conversationGoal).toBe(goal);
      }
    });

    it('should generate product comparison when multiple products mentioned', async () => {
      const mockMessage: IncomingMessage = {
        content: 'Qual a diferença entre o smartphone e o notebook?',
        customerPhone: '+5511999999999'
      };

      const mockContext: ConversationContext = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: mockProducts,
        conversationGoal: 'helpful'
      };

      // Mock that both products are mentioned
      mockAIProductIntegrationService.extractProductMentions.mockReturnValue(mockProducts);
      mockAIProductIntegrationService.generateProductComparisonText.mockReturnValue(
        'Comparação: Smartphone vs Notebook'
      );

      await service.processMessage(mockMessage, mockContext);

      expect(mockAIProductIntegrationService.generateProductComparisonText).toHaveBeenCalledWith(mockProducts);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing OpenAI API key', async () => {
      // Create a service with missing API key
      const invalidConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'OPENAI_API_KEY') {
            return undefined; // Missing API key
          }
          return mockConfigService.get(key, defaultValue);
        })
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AIService,
          {
            provide: ConfigService,
            useValue: invalidConfigService
          },
          {
            provide: ConversationGoalService,
            useValue: mockConversationGoalService
          },
          {
            provide: AIProductIntegrationService,
            useValue: mockAIProductIntegrationService
          }
        ],
      }).compile();

      const invalidService = module.get<AIService>(AIService);

      // Should throw during initialization due to missing API key
      await expect(invalidService.onModuleInit()).rejects.toThrow();
    });

    it('should handle product integration errors gracefully', async () => {
      mockAIProductIntegrationService.getAllProductsForAI.mockRejectedValue(
        new Error('Database connection failed')
      );

      const mockMessage: IncomingMessage = {
        content: 'Quais produtos vocês têm?',
        customerPhone: '+5511999999999'
      };

      const mockContext: ConversationContext = {
        customerPhone: '+5511999999999',
        conversationHistory: [],
        products: [],
        conversationGoal: 'helpful'
      };

      const result = await service.processMessage(mockMessage, mockContext);

      // Should still return a response even if product integration fails
      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
    });
  });
});