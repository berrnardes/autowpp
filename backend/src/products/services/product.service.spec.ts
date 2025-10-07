import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductService } from './product.service';
import { DatabaseService } from '../../database/database.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductQueryDto } from '../dto/product-query.dto';

// Mock database service
const mockDatabase = {
  insert: jest.fn(),
  select: jest.fn(),
  selectDistinct: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockDatabaseService = {
  getDatabase: jest.fn(() => mockDatabase),
  db: mockDatabase, // Keep for backward compatibility
};

// Mock query builder methods
const mockQueryBuilder = {
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
};

describe('ProductService', () => {
  let service: ProductService;
  let databaseService: jest.Mocked<DatabaseService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    databaseService = module.get(DatabaseService);

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock chain
    Object.keys(mockQueryBuilder).forEach(method => {
      mockQueryBuilder[method].mockReturnThis();
    });

    // Reset database mock methods
    Object.keys(mockDatabase).forEach(method => {
      mockDatabase[method].mockReturnValue(mockQueryBuilder);
    });
  });

  describe('create', () => {
    const createProductDto: CreateProductDto = {
      name: 'Smartphone Samsung',
      description: 'Smartphone com ótima qualidade',
      price: 899.99,
      currency: 'BRL',
      category: 'Eletrônicos',
      inStock: true,
    };

    it('should create a new product successfully', async () => {
      const expectedProduct = {
        id: 'uuid-123',
        ...createProductDto,
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock check for existing product (should return empty array)
      mockQueryBuilder.limit.mockResolvedValueOnce([]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      // Mock product creation
      mockQueryBuilder.returning.mockResolvedValueOnce([expectedProduct]);
      databaseService.db.insert.mockReturnValueOnce(mockQueryBuilder);

      const result = await service.create(createProductDto);

      expect(databaseService.db.select).toHaveBeenCalled();
      expect(databaseService.db.insert).toHaveBeenCalled();
      expect(result).toEqual(expectedProduct);
    });

    it('should throw ConflictException when product name already exists', async () => {
      const existingProduct = { id: 'existing-id', name: createProductDto.name };

      mockQueryBuilder.limit.mockResolvedValueOnce([existingProduct]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      await expect(service.create(createProductDto)).rejects.toThrow(
        new ConflictException(`Produto com nome "${createProductDto.name}" já existe`)
      );
    });

    it('should throw BadRequestException for negative price', async () => {
      const invalidDto = { ...createProductDto, price: -10 };

      mockQueryBuilder.limit.mockResolvedValueOnce([]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      await expect(service.create(invalidDto)).rejects.toThrow(
        new BadRequestException('Preço deve ser maior ou igual a zero')
      );
    });

    it('should set default currency to BRL when not provided', async () => {
      const dtoWithoutCurrency = { ...createProductDto };
      delete dtoWithoutCurrency.currency;

      const expectedProduct = {
        id: 'uuid-123',
        ...dtoWithoutCurrency,
        currency: 'BRL',
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQueryBuilder.limit.mockResolvedValueOnce([]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      mockQueryBuilder.returning.mockResolvedValueOnce([expectedProduct]);
      databaseService.db.insert.mockReturnValueOnce(mockQueryBuilder);

      const result = await service.create(dtoWithoutCurrency);

      expect(result.currency).toBe('BRL');
    });
  });

  describe('findById', () => {
    const productId = 'uuid-123';
    const mockProduct = {
      id: productId,
      name: 'Produto Teste',
      description: 'Descrição do produto',
      price: '29.99',
      currency: 'BRL',
      images: [],
      category: 'Eletrônicos',
      inStock: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return product when found', async () => {
      mockQueryBuilder.limit.mockResolvedValueOnce([mockProduct]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      const result = await service.findById(productId);

      expect(databaseService.db.select).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockQueryBuilder.limit.mockResolvedValueOnce([]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      await expect(service.findById(productId)).rejects.toThrow(
        new NotFoundException(`Produto com ID "${productId}" não encontrado`)
      );
    });

    it('should throw BadRequestException for empty ID', async () => {
      await expect(service.findById('')).rejects.toThrow(
        new BadRequestException('ID do produto é obrigatório')
      );

      await expect(service.findById('   ')).rejects.toThrow(
        new BadRequestException('ID do produto é obrigatório')
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const query: ProductQueryDto = {
        page: 1,
        limit: 10,
      };

      const mockProducts = [
        {
          id: 'uuid-1',
          name: 'Produto 1',
          description: 'Descrição 1',
          price: '29.99',
          currency: 'BRL',
          images: [],
          category: 'Eletrônicos',
          inStock: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock count query
      const mockCountResult = { total: 1 };
      const mockCountQueryBuilder = {
        ...mockQueryBuilder,
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockCountResult]),
      };

      // Mock products query
      mockQueryBuilder.offset.mockResolvedValue(mockProducts);

      databaseService.db.select
        .mockReturnValueOnce(mockCountQueryBuilder)
        .mockReturnValueOnce(mockQueryBuilder);

      const result = await service.findAll(query);

      expect(result).toEqual({
        products: mockProducts,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should throw BadRequestException for invalid price range', async () => {
      const query: ProductQueryDto = {
        minPrice: 100,
        maxPrice: 50,
      };

      await expect(service.findAll(query)).rejects.toThrow(
        new BadRequestException('Preço mínimo não pode ser maior que o preço máximo')
      );
    });

    it('should throw BadRequestException for invalid page', async () => {
      const query: ProductQueryDto = {
        page: 0,
      };

      await expect(service.findAll(query)).rejects.toThrow(
        new BadRequestException('Página deve ser maior que zero')
      );
    });

    it('should throw BadRequestException for invalid limit', async () => {
      const query: ProductQueryDto = {
        limit: 0,
      };

      await expect(service.findAll(query)).rejects.toThrow(
        new BadRequestException('Limite deve estar entre 1 e 100')
      );

      const queryTooHigh: ProductQueryDto = {
        limit: 101,
      };

      await expect(service.findAll(queryTooHigh)).rejects.toThrow(
        new BadRequestException('Limite deve estar entre 1 e 100')
      );
    });
  });

  describe('update', () => {
    const productId = 'uuid-123';
    const updateDto: UpdateProductDto = {
      name: 'Produto Atualizado',
      price: 39.99,
    };

    const existingProduct = {
      id: productId,
      name: 'Produto Original',
      description: 'Descrição',
      price: '29.99',
      currency: 'BRL',
      images: [],
      category: 'Eletrônicos',
      inStock: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update product successfully', async () => {
      const updatedProduct = { ...existingProduct, ...updateDto };

      // Mock finding existing product
      mockQueryBuilder.limit.mockResolvedValueOnce([existingProduct]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      // Mock checking for name conflict (should return empty)
      mockQueryBuilder.limit.mockResolvedValueOnce([]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      // Mock update operation
      mockQueryBuilder.returning.mockResolvedValueOnce([updatedProduct]);
      databaseService.db.update.mockReturnValueOnce(mockQueryBuilder);

      const result = await service.update(productId, updateDto);

      expect(result).toEqual(updatedProduct);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockQueryBuilder.limit.mockResolvedValueOnce([]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      await expect(service.update(productId, updateDto)).rejects.toThrow(
        new NotFoundException(`Produto com ID "${productId}" não encontrado`)
      );
    });

    it('should throw ConflictException when updating to existing name', async () => {
      const conflictingProduct = { id: 'other-id', name: updateDto.name };

      // Mock finding existing product
      mockQueryBuilder.limit.mockResolvedValueOnce([existingProduct]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      // Mock finding conflicting name
      mockQueryBuilder.limit.mockResolvedValueOnce([conflictingProduct]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      await expect(service.update(productId, updateDto)).rejects.toThrow(
        new ConflictException(`Produto com nome "${updateDto.name}" já existe`)
      );
    });

    it('should throw BadRequestException for negative price', async () => {
      const invalidUpdateDto = { price: -10 };

      mockQueryBuilder.limit.mockResolvedValueOnce([existingProduct]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      await expect(service.update(productId, invalidUpdateDto)).rejects.toThrow(
        new BadRequestException('Preço deve ser maior ou igual a zero')
      );
    });
  });

  describe('delete', () => {
    const productId = 'uuid-123';

    it('should delete product successfully', async () => {
      const existingProduct = { id: productId };

      mockQueryBuilder.limit.mockResolvedValueOnce([existingProduct]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      databaseService.db.delete.mockReturnValueOnce({
        where: jest.fn().mockResolvedValue({ rowCount: 1 }),
      });

      await expect(service.delete(productId)).resolves.not.toThrow();
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockQueryBuilder.limit.mockResolvedValueOnce([]);
      databaseService.db.select.mockReturnValueOnce(mockQueryBuilder);

      await expect(service.delete(productId)).rejects.toThrow(
        new NotFoundException(`Produto com ID "${productId}" não encontrado`)
      );
    });

    it('should throw BadRequestException for empty ID', async () => {
      await expect(service.delete('')).rejects.toThrow(
        new BadRequestException('ID do produto é obrigatório')
      );
    });
  });

  describe('getCategories', () => {
    it('should return sorted unique categories', async () => {
      const mockCategories = [
        { category: 'Eletrônicos' },
        { category: 'Roupas' },
        { category: 'Casa' },
      ];

      databaseService.db.selectDistinct.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockCategories),
      });

      const result = await service.getCategories();

      expect(result).toEqual(['Casa', 'Eletrônicos', 'Roupas']);
    });

    it('should filter out empty categories', async () => {
      const mockCategories = [
        { category: 'Eletrônicos' },
        { category: '' },
        { category: null },
        { category: '   ' },
        { category: 'Roupas' },
      ];

      databaseService.db.selectDistinct.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockCategories),
      });

      const result = await service.getCategories();

      expect(result).toEqual(['Eletrônicos', 'Roupas']);
    });
  });

  describe('search', () => {
    it('should search products by term', async () => {
      const searchTerm = 'smartphone';
      const mockProducts = [
        {
          id: 'uuid-1',
          name: 'Smartphone Samsung',
          description: 'Ótimo smartphone',
          price: '899.99',
          currency: 'BRL',
          images: [],
          category: 'Eletrônicos',
          inStock: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock the findAll method that search uses internally
      jest.spyOn(service, 'findAll').mockResolvedValueOnce({
        products: mockProducts,
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });

      const result = await service.search(searchTerm);

      expect(service.findAll).toHaveBeenCalledWith({
        search: searchTerm,
        limit: 50,
      });
      expect(result).toEqual(mockProducts);
    });

    it('should throw BadRequestException for empty search term', async () => {
      await expect(service.search('')).rejects.toThrow(
        new BadRequestException('Termo de busca é obrigatório')
      );

      await expect(service.search('   ')).rejects.toThrow(
        new BadRequestException('Termo de busca é obrigatório')
      );
    });
  });
});