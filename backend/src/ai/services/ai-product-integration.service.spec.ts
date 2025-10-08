import { Test, TestingModule } from '@nestjs/testing';
import { AIProductIntegrationService } from './ai-product-integration.service';
import { ProductService } from '../../products/services/product.service';
import { ProductInfo, ConversationGoalType } from '../interfaces/ai.interface';
import { Product } from '../../database/schema';

describe('AIProductIntegrationService', () => {
  let service: AIProductIntegrationService;
  let mockProductService: jest.Mocked<ProductService>;

  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Smartphone Samsung Galaxy',
      description: 'Smartphone Android com 128GB de armazenamento',
      price: '899.99',
      currency: 'BRL',
      category: 'Eletrônicos',
      inStock: true,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'Notebook Dell Inspiron',
      description: 'Notebook para trabalho e estudos com 8GB RAM',
      price: '2499.99',
      currency: 'BRL',
      category: 'Informática',
      inStock: true,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      name: 'Fone de Ouvido Bluetooth',
      description: 'Fone sem fio com cancelamento de ruído',
      price: '199.99',
      currency: 'BRL',
      category: 'Eletrônicos',
      inStock: false,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(async () => {
    const mockProductServiceMethods = {
      findAll: jest.fn(),
      findByCategory: jest.fn(),
      search: jest.fn(),
      findById: jest.fn(),
      getCategories: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIProductIntegrationService,
        {
          provide: ProductService,
          useValue: mockProductServiceMethods,
        },
      ],
    }).compile();

    service = module.get<AIProductIntegrationService>(AIProductIntegrationService);
    mockProductService = module.get(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllProductsForAI', () => {
    it('should return products in AI format', async () => {
      mockProductService.findAll.mockResolvedValue({
        products: mockProducts.filter(p => p.inStock),
        total: 2,
        page: 1,
        limit: 100,
        totalPages: 1
      });

      const result = await service.getAllProductsForAI();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        name: 'Smartphone Samsung Galaxy',
        description: 'Smartphone Android com 128GB de armazenamento',
        price: 899.99,
        currency: 'BRL',
        category: 'Eletrônicos',
        inStock: true
      });
    });

    it('should handle errors gracefully', async () => {
      mockProductService.findAll.mockRejectedValue(new Error('Database error'));

      const result = await service.getAllProductsForAI();

      expect(result).toEqual([]);
    });
  });

  describe('searchProductsForAI', () => {
    it('should search products and return in AI format', async () => {
      const searchQuery = 'smartphone';
      mockProductService.search.mockResolvedValue([mockProducts[0]]);

      const result = await service.searchProductsForAI(searchQuery);

      expect(mockProductService.search).toHaveBeenCalledWith(searchQuery);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Smartphone Samsung Galaxy');
    });

    it('should filter out out-of-stock products', async () => {
      mockProductService.search.mockResolvedValue(mockProducts);

      const result = await service.searchProductsForAI('produto');

      expect(result).toHaveLength(2); // Only in-stock products
      expect(result.every(p => p.inStock)).toBe(true);
    });
  });

  describe('getProductByIdForAI', () => {
    it('should return product by ID in AI format', async () => {
      mockProductService.findById.mockResolvedValue(mockProducts[0]);

      const result = await service.getProductByIdForAI('1');

      expect(result).toEqual({
        id: '1',
        name: 'Smartphone Samsung Galaxy',
        description: 'Smartphone Android com 128GB de armazenamento',
        price: 899.99,
        currency: 'BRL',
        category: 'Eletrônicos',
        inStock: true
      });
    });

    it('should return null if product not found', async () => {
      mockProductService.findById.mockRejectedValue(new Error('Not found'));

      const result = await service.getProductByIdForAI('999');

      expect(result).toBeNull();
    });
  });

  describe('getProductsInPriceRangeForAI', () => {
    it('should return products within price range', async () => {
      mockProductService.findAll.mockResolvedValue({
        products: [mockProducts[0]], // Only smartphone in range
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1
      });

      const result = await service.getProductsInPriceRangeForAI(800, 1000);

      expect(mockProductService.findAll).toHaveBeenCalledWith({
        minPrice: 800,
        maxPrice: 1000,
        inStock: true,
        limit: 50
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('generateProductSummaryForGoal', () => {
    const aiProducts: ProductInfo[] = [
      {
        id: '1',
        name: 'Smartphone',
        description: 'Smartphone description',
        price: 899.99,
        currency: 'BRL',
        category: 'Eletrônicos',
        inStock: true
      },
      {
        id: '2',
        name: 'Notebook',
        description: 'Notebook description',
        price: 2499.99,
        currency: 'BRL',
        category: 'Informática',
        inStock: true
      }
    ];

    it('should generate summary for helpful goal', () => {
      const result = service.generateProductSummaryForGoal(aiProducts, 'helpful');

      expect(result).toContain('2 produtos disponíveis');
      expect(result).toContain('2 categorias');
      expect(result).toContain('Eletrônicos, Informática');
      expect(result).toContain('R$ 899.99 a R$ 2499.99');
    });

    it('should generate summary for deal_closer goal', () => {
      const result = service.generateProductSummaryForGoal(aiProducts, 'deal_closer');

      expect(result).toContain('ofertas especiais disponíveis');
    });

    it('should generate summary for support_agent goal', () => {
      const result = service.generateProductSummaryForGoal(aiProducts, 'support_agent');

      expect(result).toContain('informações detalhadas');
    });

    it('should generate summary for lead_generator goal', () => {
      const result = service.generateProductSummaryForGoal(aiProducts, 'lead_generator');

      expect(result).toContain('categoria específica');
    });

    it('should handle empty product list', () => {
      const result = service.generateProductSummaryForGoal([], 'helpful');

      expect(result).toBe('Nenhum produto disponível no momento.');
    });
  });

  describe('extractProductMentions', () => {
    const aiProducts: ProductInfo[] = [
      {
        id: '1',
        name: 'Smartphone Samsung',
        description: 'Celular Android com boa qualidade',
        price: 899.99,
        currency: 'BRL',
        category: 'Eletrônicos',
        inStock: true
      },
      {
        id: '2',
        name: 'Notebook Dell',
        description: 'Computador portátil para trabalho',
        price: 2499.99,
        currency: 'BRL',
        category: 'Informática',
        inStock: true
      }
    ];

    it('should extract products mentioned by name', () => {
      const message = 'Estou interessado no Smartphone Samsung';
      const result = service.extractProductMentions(message, aiProducts);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Smartphone Samsung');
    });

    it('should extract products mentioned by category', () => {
      const message = 'Vocês têm produtos de Eletrônicos?';
      const result = service.extractProductMentions(message, aiProducts);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Eletrônicos');
    });

    it('should extract products by description keywords', () => {
      const message = 'Preciso de um computador portátil para trabalho';
      const result = service.extractProductMentions(message, aiProducts);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Notebook Dell');
    });

    it('should return empty array if no mentions found', () => {
      const message = 'Olá, como vocês estão?';
      const result = service.extractProductMentions(message, aiProducts);

      expect(result).toHaveLength(0);
    });
  });

  describe('generateProductComparisonText', () => {
    const products: ProductInfo[] = [
      {
        id: '1',
        name: 'Produto Básico',
        description: 'Produto entry-level',
        price: 100,
        currency: 'BRL',
        inStock: true
      },
      {
        id: '2',
        name: 'Produto Premium',
        description: 'Produto top de linha',
        price: 500,
        currency: 'BRL',
        inStock: true
      },
      {
        id: '3',
        name: 'Produto Intermediário',
        description: 'Produto custo-benefício',
        price: 300,
        currency: 'BRL',
        inStock: true
      }
    ];

    it('should generate comparison for multiple products', () => {
      const result = service.generateProductComparisonText(products);

      expect(result).toContain('Comparando os produtos');
      expect(result).toContain('💰 Mais econômico: Produto Básico - R$ 100');
      expect(result).toContain('💎 Premium: Produto Premium - R$ 500');
      expect(result).toContain('⚖️ Opção intermediária: Produto Intermediário - R$ 300');
    });

    it('should return empty string for less than 2 products', () => {
      const result = service.generateProductComparisonText([products[0]]);

      expect(result).toBe('');
    });

    it('should handle 2 products without intermediate option', () => {
      const twoProducts = [products[0], products[1]];
      const result = service.generateProductComparisonText(twoProducts);

      expect(result).toContain('💰 Mais econômico');
      expect(result).toContain('💎 Premium');
      expect(result).not.toContain('⚖️ Opção intermediária');
    });
  });
});