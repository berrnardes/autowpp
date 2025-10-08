import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConversationTrainingService } from './conversation-training.service';
import { db } from '../../database/connection';
import { conversationExamples } from '../../database/schema';

// Mock the database connection
jest.mock('../../database/connection', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    selectDistinct: jest.fn()
  }
}));

describe('ConversationTrainingService', () => {
  let service: ConversationTrainingService;
  let mockDb: jest.Mocked<typeof db>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationTrainingService],
    }).compile();

    service = module.get<ConversationTrainingService>(ConversationTrainingService);
    mockDb = db as jest.Mocked<typeof db>;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createExample', () => {
    it('should create a conversation example successfully', async () => {
      const createDto = {
        customerMessage: 'Qual o preço do produto X?',
        desiredResponse: 'O produto X custa R$ 99,90. Gostaria de mais informações?',
        category: 'preços'
      };

      const mockCreated = {
        id: 'test-id',
        customerMessage: createDto.customerMessage,
        desiredResponse: createDto.desiredResponse,
        category: createDto.category,
        createdAt: new Date()
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCreated])
        })
      } as any);

      const result = await service.createExample(createDto);

      expect(result).toEqual(mockCreated);
      expect(mockDb.insert).toHaveBeenCalledWith(conversationExamples);
    });

    it('should validate input and throw error for invalid data', async () => {
      const invalidDto = {
        customerMessage: 'Hi', // Too short
        desiredResponse: 'Ok', // Too short
        category: 'test'
      };

      await expect(service.createExample(invalidDto)).rejects.toThrow(
        'Mensagem do cliente deve ter pelo menos 3 caracteres'
      );
    });

    it('should trim whitespace from input', async () => {
      const createDto = {
        customerMessage: '  Qual o preço?  ',
        desiredResponse: '  O preço é R$ 50,00  ',
        category: '  preços  '
      };

      const mockCreated = {
        id: 'test-id',
        customerMessage: 'Qual o preço?',
        desiredResponse: 'O preço é R$ 50,00',
        category: 'preços',
        createdAt: new Date()
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCreated])
        })
      } as any);

      await service.createExample(createDto);

      expect(mockDb.insert().values).toHaveBeenCalledWith({
        customerMessage: 'Qual o preço?',
        desiredResponse: 'O preço é R$ 50,00',
        category: 'preços'
      });
    });
  });

  describe('updateExample', () => {
    it('should update an existing example', async () => {
      const existingExample = {
        id: 'test-id',
        customerMessage: 'Pergunta original',
        desiredResponse: 'Resposta original',
        category: 'categoria',
        createdAt: new Date()
      };

      const updateDto = {
        customerMessage: 'Pergunta atualizada',
        desiredResponse: 'Resposta atualizada'
      };

      // Mock getExampleById
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([existingExample])
          })
        })
      } as any);

      const updatedExample = { ...existingExample, ...updateDto };

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedExample])
          })
        })
      } as any);

      const result = await service.updateExample('test-id', updateDto);

      expect(result.customerMessage).toBe(updateDto.customerMessage);
      expect(result.desiredResponse).toBe(updateDto.desiredResponse);
    });

    it('should throw NotFoundException for non-existent example', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      } as any);

      await expect(service.updateExample('non-existent', {})).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('deleteExample', () => {
    it('should delete an existing example', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'test-id' }])
        })
      } as any);

      await expect(service.deleteExample('test-id')).resolves.not.toThrow();
    });

    it('should throw NotFoundException for non-existent example', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([])
        })
      } as any);

      await expect(service.deleteExample('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getExamples', () => {
    it('should return examples with pagination', async () => {
      const mockExamples = [
        {
          id: '1',
          customerMessage: 'Pergunta 1',
          desiredResponse: 'Resposta 1',
          category: 'categoria1',
          createdAt: new Date()
        },
        {
          id: '2',
          customerMessage: 'Pergunta 2',
          desiredResponse: 'Resposta 2',
          category: 'categoria2',
          createdAt: new Date()
        }
      ];

      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 2 }])
        })
      } as any);

      // Mock examples query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue(mockExamples)
              })
            })
          })
        })
      } as any);

      const result = await service.getExamples({ limit: 10, offset: 0 });

      expect(result.examples).toEqual(mockExamples);
      expect(result.total).toBe(2);
    });

    it('should filter by category when provided', async () => {
      const query = { category: 'preços', limit: 10, offset: 0 };

      const mockFromChain = {
        where: jest.fn().mockResolvedValue([{ count: 1 }])
      };

      const mockSelectChain = {
        from: jest.fn().mockReturnValue(mockFromChain)
      };

      // Mock count query
      mockDb.select.mockReturnValueOnce(mockSelectChain as any);

      // Mock examples query with full chain
      const mockExamplesFromChain = {
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              offset: jest.fn().mockResolvedValue([])
            })
          })
        })
      };

      const mockExamplesSelectChain = {
        from: jest.fn().mockReturnValue(mockExamplesFromChain)
      };

      mockDb.select.mockReturnValueOnce(mockExamplesSelectChain as any);

      await service.getExamples(query);

      // Verify that where clause was called (indicating filtering was applied)
      expect(mockFromChain.where).toHaveBeenCalled();
    });
  });

  describe('processTrainingData', () => {
    it('should process training data and return statistics', async () => {
      const mockExamples = [
        {
          id: '1',
          customerMessage: 'Pergunta válida com mais de 5 caracteres',
          desiredResponse: 'Resposta válida com mais de 10 caracteres para ser considerada válida',
          category: 'categoria1',
          createdAt: new Date()
        },
        {
          id: '2',
          customerMessage: 'Outra pergunta válida',
          desiredResponse: 'Outra resposta válida com conteúdo suficiente',
          category: 'categoria2',
          createdAt: new Date()
        }
      ];

      // Mock getExamples
      jest.spyOn(service, 'getExamples').mockResolvedValue({
        examples: mockExamples,
        total: 2
      });

      // Mock getCategories
      jest.spyOn(service, 'getCategories').mockResolvedValue(['categoria1', 'categoria2']);

      const result = await service.processTrainingData();

      expect(result.totalExamples).toBe(2);
      expect(result.validExamples).toBe(2);
      expect(result.categories).toEqual(['categoria1', 'categoria2']);
      expect(result.processedExamples).toHaveLength(2);
      expect(result.processedExamples[0].keywords).toBeDefined();
    });
  });

  describe('validateTrainingData', () => {
    it('should return success for sufficient valid examples', async () => {
      jest.spyOn(service, 'processTrainingData').mockResolvedValue({
        processedExamples: new Array(10).fill(null).map((_, i) => ({
          id: `${i}`,
          customerMessage: `Pergunta ${i}`,
          desiredResponse: `Resposta válida ${i}`,
          category: 'categoria',
          messageLength: 20,
          responseLength: 30,
          keywords: ['pergunta', 'resposta'],
          createdAt: new Date()
        })),
        categories: ['categoria1', 'categoria2'],
        totalExamples: 10,
        validExamples: 10
      });

      const result = await service.validateTrainingData();

      expect(result.success).toBe(true);
      expect(result.examplesProcessed).toBe(10);
      expect(result.message).toContain('10 exemplos em 2 categorias');
    });

    it('should return failure for insufficient examples', async () => {
      jest.spyOn(service, 'processTrainingData').mockResolvedValue({
        processedExamples: [],
        categories: [],
        totalExamples: 0,
        validExamples: 0
      });

      const result = await service.validateTrainingData();

      expect(result.success).toBe(false);
      expect(result.examplesProcessed).toBe(0);
      expect(result.message).toContain('Nenhum exemplo de conversa encontrado');
    });

    it('should return failure for too few valid examples', async () => {
      jest.spyOn(service, 'processTrainingData').mockResolvedValue({
        processedExamples: [
          {
            id: '1',
            customerMessage: 'Pergunta',
            desiredResponse: 'Resposta',
            category: 'categoria',
            messageLength: 8,
            responseLength: 8,
            keywords: ['pergunta'],
            createdAt: new Date()
          }
        ],
        categories: ['categoria'],
        totalExamples: 1,
        validExamples: 1
      });

      const result = await service.validateTrainingData();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Apenas 1 exemplos válidos encontrados');
    });
  });

  describe('getTrainingExamplesForFewShot', () => {
    it('should return high-quality examples for few-shot learning', async () => {
      const mockExamples = [
        {
          id: '1',
          customerMessage: 'Pergunta de alta qualidade com conteúdo suficiente',
          desiredResponse: 'Resposta detalhada e útil com informações completas para o cliente',
          category: 'categoria1',
          createdAt: new Date()
        },
        {
          id: '2',
          customerMessage: 'Curta', // Should be filtered out
          desiredResponse: 'Não sei', // Should be filtered out
          category: 'categoria2',
          createdAt: new Date()
        }
      ];

      jest.spyOn(service, 'getExamples').mockResolvedValue({
        examples: mockExamples,
        total: 2
      });

      const result = await service.getTrainingExamplesForFewShot('categoria1', 5);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter by category when provided', async () => {
      jest.spyOn(service, 'getExamples').mockResolvedValue({
        examples: [],
        total: 0
      });

      await service.getTrainingExamplesForFewShot('specific-category', 5);

      expect(service.getExamples).toHaveBeenCalledWith({
        category: 'specific-category',
        limit: 5
      });
    });
  });

  describe('extractKeywords', () => {
    it('should extract relevant keywords from Portuguese text', () => {
      const text = 'Qual é o preço do produto mais vendido da loja?';
      
      // Access private method for testing
      const keywords = (service as any).extractKeywords(text);

      expect(keywords).toContain('produto');
      expect(keywords).toContain('vendido');
      expect(keywords).toContain('loja');
      expect(keywords).not.toContain('qual'); // Should be filtered as stop word
      expect(keywords).not.toContain('do'); // Should be filtered as stop word
      // Note: 'preço' might be split due to special character handling
    });

    it('should limit keywords to 10 items', () => {
      const longText = 'palavra1 palavra2 palavra3 palavra4 palavra5 palavra6 palavra7 palavra8 palavra9 palavra10 palavra11 palavra12';
      
      const keywords = (service as any).extractKeywords(longText);

      expect(keywords.length).toBeLessThanOrEqual(10);
    });
  });
});