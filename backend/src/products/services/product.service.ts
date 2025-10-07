import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { NewProduct, Product, products } from '../../database/schema';
import { CreateProductDto } from '../dto/create-product.dto';
import { ProductQueryDto } from '../dto/product-query.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const db = this.databaseService.getDatabase();

    // Check if product with same name already exists
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.name, createProductDto.name))
      .limit(1);

    if (existingProduct) {
      throw new ConflictException(
        `Produto com nome "${createProductDto.name}" já existe`,
      );
    }

    // Validate price
    if (createProductDto.price < 0) {
      throw new BadRequestException('Preço deve ser maior ou igual a zero');
    }

    // Set default currency to BRL for Brazilian market
    if (!createProductDto.currency) {
      createProductDto.currency = 'BRL';
    }

    const newProduct: NewProduct = {
      ...createProductDto,
      price: createProductDto.price.toString(), // Convert number to string for decimal field
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [product] = await db.insert(products).values(newProduct).returning();

    return product;
  }

  async findAll(query: ProductQueryDto): Promise<ProductSearchResult> {
    // Validate query parameters
    if (query.minPrice && query.maxPrice && query.minPrice > query.maxPrice) {
      throw new BadRequestException(
        'Preço mínimo não pode ser maior que o preço máximo',
      );
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Página deve ser maior que zero');
    }

    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limite deve estar entre 1 e 100');
    }

    const {
      search,
      category,
      minPrice,
      maxPrice,
      inStock,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build where conditions
    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.description, `%${search}%`),
          ilike(products.category, `%${search}%`),
        ),
      );
    }

    if (category) {
      conditions.push(eq(products.category, category));
    }

    if (minPrice !== undefined) {
      conditions.push(gte(products.price, minPrice.toString()));
    }

    if (maxPrice !== undefined) {
      conditions.push(lte(products.price, maxPrice.toString()));
    }

    if (inStock !== undefined) {
      conditions.push(eq(products.inStock, inStock));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const db = this.databaseService.getDatabase();

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(products)
      .where(whereClause);

    // Get products with pagination and sorting
    const offset = (page - 1) * limit;
    const orderBy =
      sortOrder === 'asc' ? asc(products[sortBy]) : desc(products[sortBy]);

    const productList = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return {
      products: productList,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    };
  }

  async findById(id: string): Promise<Product> {
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID do produto é obrigatório');
    }

    const db = this.databaseService.getDatabase();
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      throw new NotFoundException(`Produto com ID "${id}" não encontrado`);
    }

    return product;
  }

  async findByCategory(category: string): Promise<Product[]> {
    if (!category || category.trim() === '') {
      throw new BadRequestException('Categoria é obrigatória');
    }

    const db = this.databaseService.getDatabase();
    return await db
      .select()
      .from(products)
      .where(eq(products.category, category))
      .orderBy(desc(products.createdAt));
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID do produto é obrigatório');
    }

    const db = this.databaseService.getDatabase();

    // Check if product exists
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existingProduct) {
      throw new NotFoundException(`Produto com ID "${id}" não encontrado`);
    }

    // If updating name, check for conflicts
    if (
      updateProductDto.name &&
      updateProductDto.name !== existingProduct.name
    ) {
      const [productWithSameName] = await db
        .select()
        .from(products)
        .where(eq(products.name, updateProductDto.name))
        .limit(1);

      if (productWithSameName && productWithSameName.id !== id) {
        throw new ConflictException(
          `Produto com nome "${updateProductDto.name}" já existe`,
        );
      }
    }

    // Validate price if provided
    if (updateProductDto.price !== undefined && updateProductDto.price < 0) {
      throw new BadRequestException('Preço deve ser maior ou igual a zero');
    }

    const updateData: any = {
      ...updateProductDto,
      updatedAt: new Date(),
    };

    // Convert price to string if provided
    if (updateProductDto.price !== undefined) {
      updateData.price = updateProductDto.price.toString();
    }

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    if (!updatedProduct) {
      throw new NotFoundException(`Produto com ID "${id}" não encontrado`);
    }

    return updatedProduct;
  }

  async delete(id: string): Promise<void> {
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID do produto é obrigatório');
    }

    const db = this.databaseService.getDatabase();

    // Check if product exists
    const [existingProduct] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existingProduct) {
      throw new NotFoundException(`Produto com ID "${id}" não encontrado`);
    }

    const result = await db
      .delete(products)
      .where(eq(products.id, id));

    if (result.rowCount === 0) {
      throw new NotFoundException(`Produto com ID "${id}" não encontrado`);
    }
  }

  async getCategories(): Promise<string[]> {
    const db = this.databaseService.getDatabase();
    const result = await db
      .selectDistinct({ category: products.category })
      .from(products)
      .where(
        and(
          eq(products.inStock, true),
          // Only get non-null categories
          gte(products.category, ''),
        ),
      );

    return result
      .map((row: { category: string | null }) => row.category)
      .filter((category: string | null): category is string => category !== null && category.trim() !== '')
      .sort();
  }

  async updateStock(id: string, inStock: boolean): Promise<Product> {
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID do produto é obrigatório');
    }

    const db = this.databaseService.getDatabase();
    const [updatedProduct] = await db
      .update(products)
      .set({
        inStock,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (!updatedProduct) {
      throw new NotFoundException(`Produto com ID "${id}" não encontrado`);
    }

    return updatedProduct;
  }

  async bulkUpdateStock(
    productIds: string[],
    inStock: boolean,
  ): Promise<{ updated: number }> {
    if (!productIds || productIds.length === 0) {
      throw new BadRequestException('Lista de IDs de produtos é obrigatória');
    }

    // Validate all IDs are non-empty
    const invalidIds = productIds.filter((id) => !id || id.trim() === '');
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        'Todos os IDs de produtos devem ser válidos',
      );
    }

    const db = this.databaseService.getDatabase();
    const result = await db
      .update(products)
      .set({
        inStock,
        updatedAt: new Date(),
      })
      .where(or(...productIds.map((id) => eq(products.id, id))));

    return { updated: result.rowCount || 0 };
  }

  async search(searchTerm: string): Promise<Product[]> {
    if (!searchTerm || searchTerm.trim() === '') {
      throw new BadRequestException('Termo de busca é obrigatório');
    }

    const query: ProductQueryDto = {
      search: searchTerm.trim(),
      limit: 50, // Reasonable limit for search results
    };

    const result = await this.findAll(query);
    return result.products;
  }
}
