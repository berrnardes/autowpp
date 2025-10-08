import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConversationTrainingController } from './conversation-training.controller';
import { ConversationTrainingService } from '../services/conversation-training.service';
import { AIService } from '../services/ai.service';
import {
  CreateConversationExampleDto,
  UpdateConversationExampleDto,
  ConversationExampleQueryDto,
  TrainModelDto,
  BulkCreateExamplesDto
} from '../dto/conversation-example.dto';

describe('ConversationTrainingController', () => {
  let controller: ConversationTrainingController;
  let trainingService: jest.Mocked<ConversationTrainingService>;
  let aiService: jest.Mocked<AIService>;

  beforeEach(async () => {
    const mockTrainingService = {
      createExample: jest.fn(),
      getExamples: jest.fn(),
      getExampleById: jest.fn(),
      updateExample: jest.fn(),
      deleteExample: jest.fn(),
      getCategories: jest.fn(),
      validateTrainingData: jest.fn(),
      getTrainingExamplesForFewShot: jest.fn(),
      processTrainingData: jest.fn()
    };

    const mockAIService = {
      trainModel: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationTrainingController],
      providers: [
        {
          provide: ConversationTrainingService,
          useValue: mockTrainingService
        },
        {
          provide: AIService,
          useValue: mockAIService
        }
      ],
    }).compile();

    controller = module.get<ConversationTrainingController>(ConversationTrainingController);
    trainingService = module.get(ConversationTrainingService);
    aiService = module.get(AIService);
  });

  describe('createExample', () => {
    it('should create a conversation example', async () => {
      const createDto: CreateConversationExampleDto = {
        customerMessage: 'Qual o preço do produto X?',
        desiredResponse: 'O produto X custa R$ 99,90. Gostaria de mais informações?',
        category: 'preços'
      };

      const mockExample = {
        id: 'test-id',
        ...createDto,
        createdAt: new Date()
      };

      trainingService.createExample.mockResolvedValue(mockExample);

      const result = await controller.createExample(createDto);

      expect(result).toEqual({
        id: mockExample.id,
        customerMessage: mockExample.customerMessage,
        desiredResponse: mockExample.desiredResponse,
        category: mockExample.category,
        createdAt: mockExample.createdAt
      });
      expect(trainingService.createExample).toHaveBeenCalledWith(createDto);
    });

    it('should handle creation errors', async () => {
      const createDto: CreateConversationExampleDto = {
        customerMessage: 'Test',
        desiredResponse: 'Test response',
        category: 'test'
      };

      trainingService.createExample.mockRejectedValue(new Error('Creation failed'));

      await expect(controller.createExample(createDto)).rejects.toThrow('Creation failed');
    });
  });

  describe('getExamples', () => {
    it('should return paginated examples with categories', async () => {
      const query: ConversationExampleQueryDto = {
        limit: 10,
        offset: 0,
        category: 'preços'
      };

      const mockExamples = [
        {
          id: '1',
          customerMessage: 'Pergunta 1',
          desiredResponse: 'Resposta 1',
          category: 'preços',
          createdAt: new Date()
        }
      ];

      const mockCategories = ['preços', 'suporte', 'geral'];

      trainingService.getExamples.mockResolvedValue({
        examples: mockExamples,
        total: 1
      });

      trainingService.getCategories.mockResolvedValue(mockCategories);

      const result = await controller.getExamples(query);

      expect(result.examples).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.categories).toEqual(mockCategories);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });
  });

  describe('getExample', () => {
    it('should return a specific example', async () => {
      const mockExample = {
        id: 'test-id',
        customerMessage: 'Test message',
        desiredResponse: 'Test response',
        category: 'test',
        createdAt: new Date()
      };

      trainingService.getExampleById.mockResolvedValue(mockExample);

      const result = await controller.getExample('test-id');

      expect(result).toEqual({
        id: mockExample.id,
        customerMessage: mockExample.customerMessage,
        desiredResponse: mockExample.desiredResponse,
        category: mockExample.category,
        createdAt: mockExample.createdAt
      });
    });

    it('should throw BadRequestException for non-existent example', async () => {
      trainingService.getExampleById.mockResolvedValue(null);

      await expect(controller.getExample('non-existent')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateExample', () => {
    it('should update an existing example', async () => {
      const updateDto: UpdateConversationExampleDto = {
        customerMessage: 'Updated message',
        desiredResponse: 'Updated response'
      };

      const mockUpdated = {
        id: 'test-id',
        customerMessage: updateDto.customerMessage!,
        desiredResponse: updateDto.desiredResponse!,
        category: 'test',
        createdAt: new Date()
      };

      trainingService.updateExample.mockResolvedValue(mockUpdated);

      const result = await controller.updateExample('test-id', updateDto);

      expect(result.customerMessage).toBe(updateDto.customerMessage);
      expect(result.desiredResponse).toBe(updateDto.desiredResponse);
      expect(trainingService.updateExample).toHaveBeenCalledWith('test-id', updateDto);
    });
  });

  describe('deleteExample', () => {
    it('should delete an example', async () => {
      trainingService.deleteExample.mockResolvedValue();

      await expect(controller.deleteExample('test-id')).resolves.not.toThrow();
      expect(trainingService.deleteExample).toHaveBeenCalledWith('test-id');
    });
  });

  describe('getCategories', () => {
    it('should return available categories', async () => {
      const mockCategories = ['preços', 'suporte', 'geral'];
      trainingService.getCategories.mockResolvedValue(mockCategories);

      const result = await controller.getCategories();

      expect(result).toEqual(mockCategories);
    });
  });

  describe('trainModel', () => {
    it('should train model with few-shot learning', async () => {
      const trainDto: TrainModelDto = {
        trainingType: 'few_shot',
        maxExamples: 10,
        category: 'preços'
      };

      const mockExamples = [
        {
          id: '1',
          customerMessage: 'Qual o preço?',
          desiredResponse: 'O preço é R$ 50,00',
          category: 'preços',
          createdAt: new Date()
        }
      ];

      const mockTrainingResult = {
        success: true,
        message: 'Modelo treinado com sucesso',
        examplesProcessed: 1
      };

      trainingService.getTrainingExamplesForFewShot.mockResolvedValue(mockExamples);
      aiService.trainModel.mockResolvedValue(mockTrainingResult);
      trainingService.getCategories.mockResolvedValue(['preços']);

      const result = await controller.trainModel(trainDto);

      expect(result.success).toBe(true);
      expect(result.trainingType).toBe('few_shot');
      expect(result.examplesProcessed).toBe(1);
      expect(trainingService.getTrainingExamplesForFewShot).toHaveBeenCalledWith('preços', 10);
      expect(aiService.trainModel).toHaveBeenCalledWith(mockExamples);
    });

    it('should validate training data when trainingType is validation', async () => {
      const trainDto: TrainModelDto = {
        trainingType: 'validation'
      };

      const mockValidationResult = {
        success: true,
        message: 'Dados validados com sucesso',
        examplesProcessed: 5
      };

      const mockStats = {
        totalExamples: 5,
        validExamples: 5,
        categories: ['preços'],
        averageMessageLength: 25,
        averageResponseLength: 50,
        examplesByCategory: { 'preços': 5 },
        recentExamples: []
      };

      trainingService.validateTrainingData.mockResolvedValue(mockValidationResult);
      // Mock the getTrainingStats method
      jest.spyOn(controller as any, 'getTrainingStats').mockResolvedValue(mockStats);

      const result = await controller.trainModel(trainDto);

      expect(result.success).toBe(true);
      expect(result.trainingType).toBe('validation');
      expect(result.validationResults).toBeDefined();
      expect(result.validationResults!.totalExamples).toBe(5);
    });

    it('should handle no examples found', async () => {
      const trainDto: TrainModelDto = {
        trainingType: 'few_shot',
        category: 'non-existent'
      };

      trainingService.getTrainingExamplesForFewShot.mockResolvedValue([]);

      const result = await controller.trainModel(trainDto);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Nenhum exemplo encontrado para a categoria');
    });

    it('should handle training errors', async () => {
      const trainDto: TrainModelDto = {
        trainingType: 'few_shot'
      };

      trainingService.getTrainingExamplesForFewShot.mockRejectedValue(new Error('Database error'));

      const result = await controller.trainModel(trainDto);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Erro durante o treinamento');
    });
  });

  describe('getTrainingStats', () => {
    it('should return comprehensive training statistics', async () => {
      const mockProcessedData = {
        processedExamples: [
          {
            id: '1',
            customerMessage: 'Pergunta teste',
            desiredResponse: 'Resposta teste',
            category: 'teste',
            messageLength: 13,
            responseLength: 13,
            keywords: ['pergunta', 'teste'],
            createdAt: new Date()
          }
        ],
        categories: ['teste'],
        totalExamples: 1,
        validExamples: 1
      };

      trainingService.processTrainingData.mockResolvedValue(mockProcessedData);

      const result = await controller.getTrainingStats();

      expect(result.totalExamples).toBe(1);
      expect(result.validExamples).toBe(1);
      expect(result.categories).toEqual(['teste']);
      expect(result.averageMessageLength).toBe(13);
      expect(result.averageResponseLength).toBe(13);
      expect(result.examplesByCategory).toEqual({ 'teste': 1 });
      expect(result.recentExamples).toHaveLength(1);
    });

    it('should handle empty training data', async () => {
      const mockProcessedData = {
        processedExamples: [],
        categories: [],
        totalExamples: 0,
        validExamples: 0
      };

      trainingService.processTrainingData.mockResolvedValue(mockProcessedData);

      const result = await controller.getTrainingStats();

      expect(result.totalExamples).toBe(0);
      expect(result.validExamples).toBe(0);
      expect(result.averageMessageLength).toBe(0);
      expect(result.averageResponseLength).toBe(0);
    });
  });

  describe('bulkCreateExamples', () => {
    it('should create examples from CSV data', async () => {
      const bulkDto: BulkCreateExamplesDto = {
        data: 'customerMessage,desiredResponse,category\n"Qual o preço?","R$ 50,00","preços"\n"Como comprar?","Acesse nosso site","vendas"',
        format: 'csv',
        defaultCategory: 'geral'
      };

      // Mock successful creation for both examples
      trainingService.createExample
        .mockResolvedValueOnce({
          id: '1',
          customerMessage: 'Qual o preço?',
          desiredResponse: 'R$ 50,00',
          category: 'preços',
          createdAt: new Date()
        })
        .mockResolvedValueOnce({
          id: '2',
          customerMessage: 'Como comprar?',
          desiredResponse: 'Acesse nosso site',
          category: 'vendas',
          createdAt: new Date()
        });

      const result = await controller.bulkCreateExamples(bulkDto);

      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(trainingService.createExample).toHaveBeenCalledTimes(2);
    });

    it('should create examples from JSON data', async () => {
      const bulkDto: BulkCreateExamplesDto = {
        data: JSON.stringify([
          {
            customerMessage: 'Pergunta 1',
            desiredResponse: 'Resposta 1',
            category: 'categoria1'
          },
          {
            customerMessage: 'Pergunta 2',
            desiredResponse: 'Resposta 2',
            category: 'categoria2'
          }
        ]),
        format: 'json'
      };

      trainingService.createExample
        .mockResolvedValueOnce({
          id: '1',
          customerMessage: 'Pergunta 1',
          desiredResponse: 'Resposta 1',
          category: 'categoria1',
          createdAt: new Date()
        })
        .mockResolvedValueOnce({
          id: '2',
          customerMessage: 'Pergunta 2',
          desiredResponse: 'Resposta 2',
          category: 'categoria2',
          createdAt: new Date()
        });

      const result = await controller.bulkCreateExamples(bulkDto);

      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle creation errors and continue processing', async () => {
      const bulkDto: BulkCreateExamplesDto = {
        data: 'customerMessage,desiredResponse\n"Valid message","Valid response"\n"","Invalid empty"',
        format: 'csv'
      };

      trainingService.createExample
        .mockResolvedValueOnce({
          id: '1',
          customerMessage: 'Valid message',
          desiredResponse: 'Valid response',
          category: null,
          createdAt: new Date()
        });

      const result = await controller.bulkCreateExamples(bulkDto);

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Mensagem do cliente e resposta são obrigatórias');
    });

    it('should throw BadRequestException for invalid JSON', async () => {
      const bulkDto: BulkCreateExamplesDto = {
        data: 'invalid json',
        format: 'json'
      };

      await expect(controller.bulkCreateExamples(bulkDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateTrainingData', () => {
    it('should validate training data', async () => {
      const mockValidationResult = {
        success: true,
        message: 'Dados validados com sucesso',
        examplesProcessed: 10
      };

      trainingService.validateTrainingData.mockResolvedValue(mockValidationResult);
      trainingService.getCategories.mockResolvedValue(['categoria1', 'categoria2']);

      const result = await controller.validateTrainingData();

      expect(result.success).toBe(true);
      expect(result.trainingType).toBe('validation');
      expect(result.categories).toEqual(['categoria1', 'categoria2']);
    });
  });
});