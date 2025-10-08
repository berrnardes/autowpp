import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Query, 
  Param, 
  HttpCode, 
  HttpStatus,
  BadRequestException 
} from '@nestjs/common';
import { AIService } from '../services/ai.service';
import { AIProductIntegrationService } from '../services/ai-product-integration.service';
import { ProductInfo } from '../interfaces/ai.interface';
import type { ConversationGoalType } from 'src/database/schema';

export class ProductRecommendationDto {
  customerMessage: string;
  conversationGoal: ConversationGoalType;
  maxRecommendations?: number;
}

export class ProductSearchDto {
  query: string;
}

export class PriceRangeDto {
  minPrice: number;
  maxPrice: number;
}

@Controller('ai/products')
export class AIProductController {
  constructor(
    private readonly aiService: AIService,
    private readonly aiProductIntegrationService: AIProductIntegrationService
  ) {}

  @Post('recommendations')
  @HttpCode(HttpStatus.OK)
  async getProductRecommendations(
    @Body() dto: ProductRecommendationDto
  ): Promise<{ recommendations: ProductInfo[]; summary: string }> {
    if (!dto.customerMessage?.trim()) {
      throw new BadRequestException('Mensagem do cliente é obrigatória');
    }

    if (!dto.conversationGoal) {
      throw new BadRequestException('Objetivo da conversa é obrigatório');
    }

    const recommendations = await this.aiService.recommendProducts(
      dto.customerMessage,
      dto.conversationGoal,
      dto.maxRecommendations || 3
    );

    const summary = this.aiProductIntegrationService.generateProductSummaryForGoal(
      recommendations,
      dto.conversationGoal
    );

    return {
      recommendations,
      summary
    };
  }

  @Get('search')
  async searchProducts(
    @Query() dto: ProductSearchDto
  ): Promise<{ products: ProductInfo[]; total: number }> {
    if (!dto.query?.trim()) {
      throw new BadRequestException('Termo de busca é obrigatório');
    }

    const products = await this.aiService.searchProducts(dto.query);

    return {
      products,
      total: products.length
    };
  }

  @Get('categories')
  async getAvailableCategories(): Promise<{ categories: string[] }> {
    const categories = await this.aiProductIntegrationService.getAvailableCategories();
    
    return {
      categories
    };
  }

  @Get('category/:category')
  async getProductsByCategory(
    @Param('category') category: string
  ): Promise<{ products: ProductInfo[]; category: string }> {
    if (!category?.trim()) {
      throw new BadRequestException('Categoria é obrigatória');
    }

    const products = await this.aiProductIntegrationService.getProductsForCategory(category);

    return {
      products,
      category
    };
  }

  @Post('price-range')
  @HttpCode(HttpStatus.OK)
  async getProductsInPriceRange(
    @Body() dto: PriceRangeDto
  ): Promise<{ products: ProductInfo[]; priceRange: { min: number; max: number } }> {
    if (dto.minPrice < 0 || dto.maxPrice < 0) {
      throw new BadRequestException('Preços devem ser maiores ou iguais a zero');
    }

    if (dto.minPrice > dto.maxPrice) {
      throw new BadRequestException('Preço mínimo não pode ser maior que o preço máximo');
    }

    const products = await this.aiService.getProductsInPriceRange(dto.minPrice, dto.maxPrice);

    return {
      products,
      priceRange: {
        min: dto.minPrice,
        max: dto.maxPrice
      }
    };
  }

  @Get(':id')
  async getProductById(
    @Param('id') id: string
  ): Promise<{ product: ProductInfo | null }> {
    if (!id?.trim()) {
      throw new BadRequestException('ID do produto é obrigatório');
    }

    const product = await this.aiProductIntegrationService.getProductByIdForAI(id);

    return {
      product
    };
  }

  @Post('mentions')
  @HttpCode(HttpStatus.OK)
  async extractProductMentions(
    @Body() body: { message: string; products?: ProductInfo[] }
  ): Promise<{ mentionedProducts: ProductInfo[]; comparison?: string }> {
    if (!body.message?.trim()) {
      throw new BadRequestException('Mensagem é obrigatória');
    }

    // Get products from context or fetch all available
    let products = body.products;
    if (!products || products.length === 0) {
      products = await this.aiProductIntegrationService.getAllProductsForAI();
    }

    const mentionedProducts = this.aiProductIntegrationService.extractProductMentions(
      body.message,
      products
    );

    let comparison: string | undefined;
    if (mentionedProducts.length > 1) {
      comparison = this.aiProductIntegrationService.generateProductComparisonText(mentionedProducts);
    }

    return {
      mentionedProducts,
      comparison
    };
  }

  @Get('summary/:goal')
  async getProductSummaryForGoal(
    @Param('goal') goal: ConversationGoalType
  ): Promise<{ summary: string; totalProducts: number }> {
    const validGoals: ConversationGoalType[] = ['helpful', 'deal_closer', 'support_agent', 'lead_generator', 'custom'];
    
    if (!validGoals.includes(goal)) {
      throw new BadRequestException('Objetivo de conversa inválido');
    }

    const products = await this.aiProductIntegrationService.getAllProductsForAI();
    const summary = this.aiProductIntegrationService.generateProductSummaryForGoal(products, goal);

    return {
      summary,
      totalProducts: products.length
    };
  }

  @Post('knowledge/update')
  @HttpCode(HttpStatus.OK)
  async updateProductKnowledge(): Promise<{ 
    success: boolean; 
    message: string; 
    productsLoaded: number 
  }> {
    try {
      const products = await this.aiProductIntegrationService.getAllProductsForAI();
      await this.aiService.updateProductKnowledge(products);

      return {
        success: true,
        message: 'Conhecimento de produtos atualizado com sucesso',
        productsLoaded: products.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao atualizar conhecimento de produtos: ${error.message}`,
        productsLoaded: 0
      };
    }
  }
}