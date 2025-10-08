import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AIProductController } from './ai-product.controller';
import { AIService } from '../services/ai.service';
import { AIProductIntegrationService } from '../services/ai-product-integration.service';
import { ProductInfo } from '../interfaces/ai.interface';
import { ConversationGoalType } from 'src/database/schema'; 

describe('AIProductController', () => {
  let controller: AIProductController;
  let mockAIService: jest.Mocked<AIService>;
  let mockAIProductIntegrationService: jest.Mocked<AIProductIntegrationService>;

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
    const mockAIServiceMethods = {
      recommendProducts: jest.fn(),
      searchProducts: jest.fn(),
      getProductsInPriceRange: jest.fn(),
      updateProductKnowledge: jest.fn()
    };

    const mockAIProductIntegrationServiceMethods = {
      getAllProductsForAI: jest.fn(),
      getProductsForCategory: jest.fn(),
      getProductByIdForAI: jest.fn(),
      getAvailableCategories: jest.fn(),
      extractProductMentions: jest.fn(),
      generateProductComparisonText: jest.fn(),
      generateProductSummaryForGoal: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIProductController],
      providers: [
        {
          provide: AIService,
          useValue: mockAIServiceMethods
        },
        {
          provide: AIProductIntegrationService,
          useValue: mockAIProductIntegrationServiceMethods
        }
      ],
    }).compile();

    controller = module.get<AIProductController>(AIProductController);
    mockAIService = module.get(AIService);
    mockAIProductIntegrationService = module.get(AIProductIntegrationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProductRecommendations', () => {
    it('should return product recommendations', async () => {
      const dto = {
        customerMessage: 'Preciso de um smartphone bom e barato',
        conversationGoal: 'deal_closer' as ConversationGoalType,
        maxRecommendations: 3
      };

      mockAIService.recommendProducts.mockResolvedValue([mockProducts[0]]);
      mockAIProductIntegrationService.generateProductSummaryForGoal.mockReturnValue(
        'Temos 1 produto recomendado'
      );

      const result = await controller.getProductRecommendations(dto);

      expect(result.recommendations).toHaveLength(1);
      expect(result.summary).toBe('Temos 1 produto recomendado');
      expect(mockAIService.recommendProducts).toHaveBeenCalledWith(
        dto.customerMessage,
        dto.conversationGoal,
        dto.maxRecommendations
      );
    });

    it('should throw error for empty customer message', async () => {
      const dto = {
        customerMessage: '',
        conversationGoal: 'helpful' as ConversationGoalType
      };

      await expect(controller.getProductRecommendations(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error for missing conversation goal', async () => {
      const dto = {
        customerMessage: 'Preciso de ajuda',
        conversationGoal: undefined as any
      };

      await expect(controller.getProductRecommendations(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('searchProducts', () => {
    it('should search products successfully', async () => {
      const dto = { query: 'smartphone' };
      
      mockAIService.searchProducts.mockResolvedValue([mockProducts[0]]);

      const result = await controller.searchProducts(dto);

      expect(result.products).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockAIService.searchProducts).toHaveBeenCalledWith('smartphone');
    });

    it('should throw error for empty search query', async () => {
      const dto = { query: '' };

      await expect(controller.searchProducts(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAvailableCategories', () => {
    it('should return available categories', async () => {
      const categories = ['Eletrônicos', 'Informática', 'Casa'];
      mockAIProductIntegrationService.getAvailableCategories.mockResolvedValue(categories);

      const result = await controller.getAvailableCategories();

      expect(result.categories).toEqual(categories);
    });
  });

  describe('getProductsByCategory', () => {
    it('should return products by category', async () => {
      const category = 'Eletrônicos';
      mockAIProductIntegrationService.getProductsForCategory.mockResolvedValue([mockProducts[0]]);

      const result = await controller.getProductsByCategory(category);

      expect(result.products).toHaveLength(1);
      expect(result.category).toBe(category);
    });

    it('should throw error for empty category', async () => {
      await expect(controller.getProductsByCategory('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProductsInPriceRange', () => {
    it('should return products in price range', async () => {
      const dto = { minPrice: 500, maxPrice: 1000 };
      mockAIService.getProductsInPriceRange.mockResolvedValue([mockProducts[0]]);

      const result = await controller.getProductsInPriceRange(dto);

      expect(result.products).toHaveLength(1);
      expect(result.priceRange).toEqual({ min: 500, max: 1000 });
    });

    it('should throw error for negative prices', async () => {
      const dto = { minPrice: -100, maxPrice: 1000 };

      await expect(controller.getProductsInPriceRange(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when min price > max price', async () => {
      const dto = { minPrice: 1000, maxPrice: 500 };

      await expect(controller.getProductsInPriceRange(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProductById', () => {
    it('should return product by ID', async () => {
      const productId = '1';
      mockAIProductIntegrationService.getProductByIdForAI.mockResolvedValue(mockProducts[0]);

      const result = await controller.getProductById(productId);

      expect(result.product).toEqual(mockProducts[0]);
    });

    it('should return null for non-existent product', async () => {
      const productId = '999';
      mockAIProductIntegrationService.getProductByIdForAI.mockResolvedValue(null);

      const result = await controller.getProductById(productId);

      expect(result.product).toBeNull();
    });

    it('should throw error for empty ID', async () => {
      await expect(controller.getProductById('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('extractProductMentions', () => {
    it('should extract product mentions from message', async () => {
      const body = {
        message: 'Estou interessado no Smartphone Samsung',
        products: mockProducts
      };

      mockAIProductIntegrationService.extractProductMentions.mockReturnValue([mockProducts[0]]);

      const result = await controller.extractProductMentions(body);

      expect(result.mentionedProducts).toHaveLength(1);
      expect(result.comparison).toBeUndefined();
    });

    it('should generate comparison for multiple mentioned products', async () => {
      const body = {
        message: 'Qual a diferença entre o smartphone e o notebook?',
        products: mockProducts
      };

      mockAIProductIntegrationService.extractProductMentions.mockReturnValue(mockProducts);
      mockAIProductIntegrationService.generateProductComparisonText.mockReturnValue(
        'Comparação entre produtos'
      );

      const result = await controller.extractProductMentions(body);

      expect(result.mentionedProducts).toHaveLength(2);
      expect(result.comparison).toBe('Comparação entre produtos');
    });

    it('should fetch products when not provided', async () => {
      const body = {
        message: 'Quais produtos vocês têm?'
      };

      mockAIProductIntegrationService.getAllProductsForAI.mockResolvedValue(mockProducts);
      mockAIProductIntegrationService.extractProductMentions.mockReturnValue([]);

      const result = await controller.extractProductMentions(body);

      expect(mockAIProductIntegrationService.getAllProductsForAI).toHaveBeenCalled();
      expect(result.mentionedProducts).toHaveLength(0);
    });

    it('should throw error for empty message', async () => {
      const body = { message: '' };

      await expect(controller.extractProductMentions(body)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProductSummaryForGoal', () => {
    it('should return product summary for valid goal', async () => {
      const goal: ConversationGoalType = 'deal_closer';
      
      mockAIProductIntegrationService.getAllProductsForAI.mockResolvedValue(mockProducts);
      mockAIProductIntegrationService.generateProductSummaryForGoal.mockReturnValue(
        'Temos 2 produtos com ofertas especiais'
      );

      const result = await controller.getProductSummaryForGoal(goal);

      expect(result.summary).toBe('Temos 2 produtos com ofertas especiais');
      expect(result.totalProducts).toBe(2);
    });

    it('should throw error for invalid goal', async () => {
      const invalidGoal = 'invalid_goal' as ConversationGoalType;

      await expect(controller.getProductSummaryForGoal(invalidGoal)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateProductKnowledge', () => {
    it('should update product knowledge successfully', async () => {
      mockAIProductIntegrationService.getAllProductsForAI.mockResolvedValue(mockProducts);
      mockAIService.updateProductKnowledge.mockResolvedValue();

      const result = await controller.updateProductKnowledge();

      expect(result.success).toBe(true);
      expect(result.productsLoaded).toBe(2);
      expect(result.message).toContain('sucesso');
    });

    it('should handle errors during knowledge update', async () => {
      mockAIProductIntegrationService.getAllProductsForAI.mockRejectedValue(
        new Error('Database error')
      );

      const result = await controller.updateProductKnowledge();

      expect(result.success).toBe(false);
      expect(result.productsLoaded).toBe(0);
      expect(result.message).toContain('Erro');
    });
  });
});