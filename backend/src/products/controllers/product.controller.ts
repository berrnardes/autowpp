import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse
} from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductQueryDto } from '../dto/product-query.dto';
import { Product } from '../../database/schema';

@ApiTags('Products')
@Controller('api/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create new product',
    description: 'Creates a new product in the catalog'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product created successfully',
    type: Object
  })
  @ApiBadRequestResponse({ description: 'Invalid product data provided' })
  async createProduct(
    @Body(ValidationPipe) createProductDto: CreateProductDto
  ): Promise<Product> {
    try {
      return await this.productService.create(createProductDto);
    } catch (error) {
      throw new BadRequestException(`Error creating product: ${error.message}`);
    }
  }

  @Get()
  @ApiOperation({ 
    summary: 'List products',
    description: 'Lists products with optional filters and pagination'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products list returned successfully'
  })
  async findProducts(
    @Query(ValidationPipe) query: ProductQueryDto
  ): Promise<{ products: Product[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const result = await this.productService.findAll(query);
      
      return result;
    } catch (error) {
      throw new BadRequestException(`Error fetching products: ${error.message}`);
    }
  }

  @Get('search')
  @ApiOperation({ 
    summary: 'Search products',
    description: 'Search products by name, description, or category'
  })
  @ApiQuery({
    name: 'q',
    description: 'Search query',
    required: true,
    type: 'string'
  })
  @ApiQuery({
    name: 'category',
    description: 'Filter by category',
    required: false,
    type: 'string'
  })
  @ApiQuery({
    name: 'minPrice',
    description: 'Minimum price filter',
    required: false,
    type: 'number'
  })
  @ApiQuery({
    name: 'maxPrice',
    description: 'Maximum price filter',
    required: false,
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results returned successfully'
  })
  async searchProducts(
    @Query('q') query: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number
  ): Promise<{ products: Product[]; total: number; query: string }> {
    if (!query?.trim()) {
      throw new BadRequestException('Search query is required');
    }

    try {
      const searchFilters = {
        search: query,
        category,
        minPrice,
        maxPrice
      };

      const products = await this.productService.search(query);
      
      return {
        products,
        total: products.length,
        query
      };
    } catch (error) {
      throw new BadRequestException(`Error searching products: ${error.message}`);
    }
  }

  @Get('categories')
  @ApiOperation({ 
    summary: 'Get product categories',
    description: 'Returns all available product categories'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories returned successfully'
  })
  async getCategories(): Promise<{ categories: string[] }> {
    try {
      const categories = await this.productService.getCategories();
      return { categories };
    } catch (error) {
      throw new BadRequestException(`Error fetching categories: ${error.message}`);
    }
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get product by ID',
    description: 'Returns a specific product by its ID'
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product found',
    type: Object
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async findProductById(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<Product> {
    try {
      const product = await this.productService.findById(id);
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Error fetching product: ${error.message}`);
    }
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Update product',
    description: 'Updates an existing product'
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated successfully',
    type: Object
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({ description: 'Invalid product data provided' })
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateProductDto: UpdateProductDto
  ): Promise<Product> {
    try {
      const product = await this.productService.update(id, updateProductDto);
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Error updating product: ${error.message}`);
    }
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete product',
    description: 'Deletes a product from the catalog'
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product deleted successfully'
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async deleteProduct(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{ message: string; deletedId: string }> {
    try {
      await this.productService.delete(id);
      return {
        message: 'Product deleted successfully',
        deletedId: id
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      throw new BadRequestException(`Error deleting product: ${error.message}`);
    }
  }

  @Put(':id/toggle-stock')
  @ApiOperation({ 
    summary: 'Toggle product stock status',
    description: 'Toggles the in-stock status of a product'
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product stock status updated successfully'
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async toggleStock(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{ product: Product; message: string }> {
    try {
      const product = await this.productService.findById(id);
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      const updatedProduct = await this.productService.update(id, {
        inStock: !product.inStock
      });

      return {
        product: updatedProduct,
        message: `Product is now ${updatedProduct.inStock ? 'in stock' : 'out of stock'}`
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Error toggling stock status: ${error.message}`);
    }
  }

  @Post('bulk-update')
  @ApiOperation({ 
    summary: 'Bulk update products',
    description: 'Updates multiple products at once'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products updated successfully'
  })
  @ApiBadRequestResponse({ description: 'Invalid bulk update data' })
  async bulkUpdateProducts(
    @Body() bulkUpdateDto: { 
      productIds: string[]; 
      updates: Partial<UpdateProductDto> 
    }
  ): Promise<{ 
    updated: number; 
    errors: string[]; 
    products: Product[] 
  }> {
    if (!bulkUpdateDto.productIds?.length) {
      throw new BadRequestException('Product IDs are required');
    }

    if (!bulkUpdateDto.updates || Object.keys(bulkUpdateDto.updates).length === 0) {
      throw new BadRequestException('Update data is required');
    }

    const results = {
      updated: 0,
      errors: [] as string[],
      products: [] as Product[]
    };

    for (const productId of bulkUpdateDto.productIds) {
      try {
        const updatedProduct = await this.productService.update(productId, bulkUpdateDto.updates);
        if (updatedProduct) {
          results.updated++;
          results.products.push(updatedProduct);
        }
      } catch (error) {
        results.errors.push(`Product ${productId}: ${error.message}`);
      }
    }

    return results;
  }
}