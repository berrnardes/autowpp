import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { ConversationGoalService } from './conversation-goal.service';
import { ConversationExample } from '../interfaces/ai.interface';

// Mock LangChain modules
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue('Mocked AI response')
  }))
}));

jest.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: {
    fromMessages: jest.fn().mockReturnValue({
      pipe: jest.fn()
    })
  },
  MessagesPlaceholder: jest.fn()
}));

jest.mock('@langchain/core/runnables', () => ({
  RunnableSequence: {
    from: jest.fn().mockReturnValue({
      invoke: jest.fn().mockResolvedValue('Mocked chain response')
    })
  }
}));

jest.mock('@langchain/core/output_parsers', () => ({
  StringOutputParser: jest.fn()
}));

describe('AIService - Training Features', () => {
  let service: AIService;
  let configService: jest.Mocked<ConfigService>;
  let conversationGoalService: jest.Mocked<ConversationGoalService>;

  beforeEach(async () => {
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

    const mockConversationGoalService = {
      getGoalConfiguration: jest.fn().mockReturnValue({
        name: 'Helpful Assistant',
        systemPrompt: 'Be helpful and informative',
        instructions: ['Be polite', 'Provide accurate information']
      }),
      shouldEscalate: jest.fn().mockReturnValue(false)
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
          useValue: mockConversationGoalService
        }
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    configService = module.get(ConfigService);
    conversationGoalService = module.get(ConversationGoalService);

    // Initialize the service
    await service.onModuleInit();
  });

  describe('trainModel', () => {
    it('should successfully train model with valid examples', async () => {
      const examples: ConversationExample[] = [
        {
          customerMessage: 'Qual o preço do produto X?',
          desiredResponse: 'O produto X custa R$ 99,90. Gostaria de mais informações sobre suas características?',
          category: 'preços'
        },
        {
          customerMessage: 'Como posso fazer um pedido?',
          desiredResponse: 'Para fazer um pedido, você pode acessar nosso site ou entrar em contato pelo WhatsApp. Posso ajudá-lo com o processo!',
          category: 'vendas'
        }
      ];

      const result = await service.trainModel(examples);

      expect(result.success).toBe(true);
      expect(result.examplesProcessed).toBe(2);
      expect(result.message).toContain('2 exemplos');
      expect(service.getTrainingExamplesCount()).toBe(2);
    });

    it('should filter out invalid examples', async () => {
      const examples: ConversationExample[] = [
        {
          customerMessage: 'Oi', // Too short
          desiredResponse: 'Oi!', // Too short
          category: 'saudação'
        },
        {
          customerMessage: 'Qual o preço do produto X?',
          desiredResponse: 'O produto X custa R$ 99,90. Gostaria de mais informações?',
          category: 'preços'
        },
        {
          customerMessage: '', // Empty
          desiredResponse: '', // Empty
          category: 'invalid'
        }
      ];

      const result = await service.trainModel(examples);

      expect(result.success).toBe(true);
      expect(result.examplesProcessed).toBe(1);
      expect(service.getTrainingExamplesCount()).toBe(1);
    });

    it('should return failure when no valid examples provided', async () => {
      const examples: ConversationExample[] = [
        {
          customerMessage: 'Hi', // Too short
          desiredResponse: 'Hi!', // Too short
          category: 'greeting'
        }
      ];

      const result = await service.trainModel(examples);

      expect(result.success).toBe(false);
      expect(result.examplesProcessed).toBe(0);
      expect(result.message).toContain('Nenhum exemplo válido');
    });

    it('should handle training errors gracefully', async () => {
      // Mock an error in the conversation chain creation
      jest.spyOn(service as any, 'createConversationChain').mockRejectedValue(new Error('Chain creation failed'));

      const examples: ConversationExample[] = [
        {
          customerMessage: 'Valid question about products?',
          desiredResponse: 'This is a valid response with enough content to pass validation.',
          category: 'products'
        }
      ];

      const result = await service.trainModel(examples);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Erro durante o treinamento');
    });
  });

  describe('buildFewShotExamples', () => {
    beforeEach(async () => {
      // Set up training examples
      const examples: ConversationExample[] = [
        {
          customerMessage: 'Qual o preço do produto A?',
          desiredResponse: 'O produto A custa R$ 50,00. Temos uma promoção especial hoje!',
          category: 'vendas'
        },
        {
          customerMessage: 'Estou com problema no meu pedido',
          desiredResponse: 'Sinto muito pelo inconveniente. Vou ajudá-lo a resolver isso imediatamente. Pode me fornecer o número do seu pedido?',
          category: 'suporte'
        },
        {
          customerMessage: 'Vocês entregam na minha região?',
          desiredResponse: 'Para verificar se entregamos na sua região, preciso do seu CEP. Pode me informar?',
          category: 'geral'
        }
      ];

      await service.trainModel(examples);
    });

    it('should build few-shot examples for deal_closer goal', () => {
      const fewShotText = (service as any).buildFewShotExamples('deal_closer');

      expect(fewShotText).toContain('EXEMPLOS DE CONVERSAS PARA APRENDIZADO');
      expect(fewShotText).toContain('Qual o preço do produto A?');
      expect(fewShotText).toContain('promoção especial');
    });

    it('should build few-shot examples for support_agent goal', () => {
      const fewShotText = (service as any).buildFewShotExamples('support_agent');

      expect(fewShotText).toContain('EXEMPLOS DE CONVERSAS PARA APRENDIZADO');
      expect(fewShotText).toContain('problema no meu pedido');
      expect(fewShotText).toContain('Sinto muito pelo inconveniente');
    });

    it('should include general examples for all goals', () => {
      const fewShotText = (service as any).buildFewShotExamples('helpful');

      expect(fewShotText).toContain('entregam na minha região');
      expect(fewShotText).toContain('preciso do seu CEP');
    });

    it('should return empty string when no training examples exist', () => {
      service.clearTrainingExamples();
      
      const fewShotText = (service as any).buildFewShotExamples('helpful');

      expect(fewShotText).toBe('');
    });

    it('should limit examples to avoid token limits', () => {
      // Create many examples
      const manyExamples: ConversationExample[] = [];
      for (let i = 0; i < 20; i++) {
        manyExamples.push({
          customerMessage: `Pergunta número ${i} sobre produtos e serviços?`,
          desiredResponse: `Esta é a resposta número ${i} com informações detalhadas sobre nossos produtos e serviços.`,
          category: 'geral'
        });
      }

      service.trainModel(manyExamples);
      
      const fewShotText = (service as any).buildFewShotExamples('helpful');
      
      // Should not contain all 20 examples (limited to 8)
      const exampleCount = (fewShotText.match(/Exemplo \d+:/g) || []).length;
      expect(exampleCount).toBeLessThanOrEqual(8);
    });
  });

  describe('training examples management', () => {
    it('should track training examples count', async () => {
      expect(service.getTrainingExamplesCount()).toBe(0);

      const examples: ConversationExample[] = [
        {
          customerMessage: 'Test question with sufficient length?',
          desiredResponse: 'This is a test response with sufficient length to pass validation.',
          category: 'test'
        }
      ];

      await service.trainModel(examples);
      expect(service.getTrainingExamplesCount()).toBe(1);
    });

    it('should clear training examples', async () => {
      const examples: ConversationExample[] = [
        {
          customerMessage: 'Test question with sufficient length?',
          desiredResponse: 'This is a test response with sufficient length to pass validation.',
          category: 'test'
        }
      ];

      await service.trainModel(examples);
      expect(service.getTrainingExamplesCount()).toBe(1);

      service.clearTrainingExamples();
      expect(service.getTrainingExamplesCount()).toBe(0);
    });
  });

  describe('conversation chain with few-shot learning', () => {
    it('should recreate conversation chain after training', async () => {
      const createChainSpy = jest.spyOn(service as any, 'createConversationChain');
      
      const examples: ConversationExample[] = [
        {
          customerMessage: 'Test question with sufficient length for training?',
          desiredResponse: 'This is a comprehensive test response that provides detailed information.',
          category: 'test'
        }
      ];

      await service.trainModel(examples);

      // Should call createConversationChain during training
      expect(createChainSpy).toHaveBeenCalled();
    });

    it('should include few-shot examples in system prompt', async () => {
      const examples: ConversationExample[] = [
        {
          customerMessage: 'Como posso comprar este produto?',
          desiredResponse: 'Para comprar, você pode clicar no botão "Comprar Agora" ou entrar em contato conosco. Posso ajudá-lo com o processo!',
          category: 'vendas'
        }
      ];

      await service.trainModel(examples);

      // Mock the prompt creation to verify few-shot examples are included
      const buildFewShotSpy = jest.spyOn(service as any, 'buildFewShotExamples');
      
      // Trigger chain recreation
      await (service as any).createConversationChain('deal_closer');

      expect(buildFewShotSpy).toHaveBeenCalledWith('deal_closer');
    });
  });

  describe('goal-specific example filtering', () => {
    beforeEach(async () => {
      const examples: ConversationExample[] = [
        {
          customerMessage: 'Quanto custa este produto?',
          desiredResponse: 'Este produto custa R$ 100,00. Temos uma oferta especial hoje com 20% de desconto!',
          category: 'vendas'
        },
        {
          customerMessage: 'Meu produto chegou com defeito',
          desiredResponse: 'Peço desculpas pelo inconveniente. Vamos resolver isso imediatamente. Pode me enviar uma foto do problema?',
          category: 'suporte'
        },
        {
          customerMessage: 'Vocês têm loja física?',
          desiredResponse: 'Sim, temos uma loja física no centro da cidade. O endereço é Rua das Flores, 123.',
          category: 'informações'
        }
      ];

      await service.trainModel(examples);
    });

    it('should filter examples for deal_closer goal', () => {
      const fewShotText = (service as any).buildFewShotExamples('deal_closer');
      
      expect(fewShotText).toContain('custa este produto');
      expect(fewShotText).toContain('oferta especial');
      // Should include general information as well
      expect(fewShotText).toContain('loja física');
    });

    it('should filter examples for support_agent goal', () => {
      const fewShotText = (service as any).buildFewShotExamples('support_agent');
      
      expect(fewShotText).toContain('chegou com defeito');
      expect(fewShotText).toContain('Peço desculpas');
      // Should include general information as well
      expect(fewShotText).toContain('loja física');
    });

    it('should include all examples for helpful goal', () => {
      const fewShotText = (service as any).buildFewShotExamples('helpful');
      
      expect(fewShotText).toContain('custa este produto');
      expect(fewShotText).toContain('chegou com defeito');
      expect(fewShotText).toContain('loja física');
    });
  });
});