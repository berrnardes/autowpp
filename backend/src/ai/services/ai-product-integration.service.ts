import { Injectable, Logger } from '@nestjs/common';
import { ProductService } from '../../products/services/product.service';
import { ProductInfo } from '../interfaces/ai.interface';
import { Product, ConversationGoalType } from '../../database/schema';

@Injectable()
export class AIProductIntegrationService {
  private readonly logger = new Logger(AIProductIntegrationService.name);

  constructor(private readonly productService: ProductService) {}

  async getAllProductsForAI(): Promise<ProductInfo[]> {
    try {
      const result = await this.productService.findAll({
        inStock: true,
        limit: 100, // Reasonable limit for AI context
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });

      return result.products.map(this.convertProductToAIFormat);
    } catch (error) {
      this.logger.error('Error fetching products for AI', error);
      return [];
    }
  }

  async getProductsForCategory(category: string): Promise<ProductInfo[]> {
    try {
      const products = await this.productService.findByCategory(category);
      return products
        .filter(p => p.inStock)
        .map(this.convertProductToAIFormat);
    } catch (error) {
      this.logger.error(`Error fetching products for category ${category}`, error);
      return [];
    }
  }

  async searchProductsForAI(query: string): Promise<ProductInfo[]> {
    try {
      const products = await this.productService.search(query);
      return products
        .filter(p => p.inStock)
        .map(this.convertProductToAIFormat);
    } catch (error) {
      this.logger.error(`Error searching products for query: ${query}`, error);
      return [];
    }
  }

  async getProductByIdForAI(productId: string): Promise<ProductInfo | null> {
    try {
      const product = await this.productService.findById(productId);
      return product ? this.convertProductToAIFormat(product) : null;
    } catch (error) {
      this.logger.error(`Error fetching product ${productId} for AI`, error);
      return null;
    }
  }

  async getProductsInPriceRangeForAI(minPrice: number, maxPrice: number): Promise<ProductInfo[]> {
    try {
      const result = await this.productService.findAll({
        minPrice,
        maxPrice,
        inStock: true,
        limit: 50
      });

      return result.products.map(this.convertProductToAIFormat);
    } catch (error) {
      this.logger.error(`Error fetching products in price range ${minPrice}-${maxPrice}`, error);
      return [];
    }
  }

  async getAvailableCategories(): Promise<string[]> {
    try {
      return await this.productService.getCategories();
    } catch (error) {
      this.logger.error('Error fetching categories for AI', error);
      return [];
    }
  }

  generateProductSummaryForGoal(products: ProductInfo[], goal: ConversationGoalType): string {
    if (!products || products.length === 0) {
      return 'Nenhum produto disponível no momento.';
    }

    const summary = {
      totalProducts: products.length,
      categories: [...new Set(products.map(p => p.category).filter(Boolean))],
      priceRange: {
        min: Math.min(...products.map(p => p.price)),
        max: Math.max(...products.map(p => p.price))
      },
      averagePrice: products.reduce((sum, p) => sum + p.price, 0) / products.length
    };

    let summaryText = `Temos ${summary.totalProducts} produtos disponíveis`;
    
    if (summary.categories.length > 0) {
      summaryText += ` em ${summary.categories.length} categorias: ${summary.categories.join(', ')}`;
    }
    
    summaryText += `. Preços de R$ ${summary.priceRange.min.toFixed(2)} a R$ ${summary.priceRange.max.toFixed(2)}`;

    // Goal-specific additions
    switch (goal) {
      case 'deal_closer':
        summaryText += '. Temos ofertas especiais disponíveis!';
        break;
      case 'support_agent':
        summaryText += '. Posso ajudar com informações detalhadas sobre qualquer produto.';
        break;
      case 'lead_generator':
        summaryText += '. Gostaria de saber mais sobre alguma categoria específica?';
        break;
    }

    return summaryText;
  }

  extractProductMentions(message: string, products: ProductInfo[]): ProductInfo[] {
    const messageLower = message.toLowerCase();
    const mentionedProducts: ProductInfo[] = [];

    for (const product of products) {
      // Check if product name is mentioned
      if (messageLower.includes(product.name.toLowerCase())) {
        mentionedProducts.push(product);
        continue;
      }

      // Check if category is mentioned
      if (product.category && messageLower.includes(product.category.toLowerCase())) {
        mentionedProducts.push(product);
        continue;
      }

      // Check for partial matches in description
      if (product.description) {
        const descriptionWords = product.description.toLowerCase().split(/\s+/);
        const messageWords = messageLower.split(/\s+/);
        
        const commonWords = descriptionWords.filter(word => 
          word.length > 3 && messageWords.includes(word)
        );
        
        if (commonWords.length >= 2) {
          mentionedProducts.push(product);
        }
      }
    }

    return mentionedProducts;
  }

  generateProductComparisonText(products: ProductInfo[]): string {
    if (products.length < 2) {
      return '';
    }

    const sortedByPrice = [...products].sort((a, b) => a.price - b.price);
    const cheapest = sortedByPrice[0];
    const mostExpensive = sortedByPrice[sortedByPrice.length - 1];

    let comparison = `Comparando os produtos:\n`;
    
    comparison += `💰 Mais econômico: ${cheapest.name} - R$ ${cheapest.price}\n`;
    comparison += `💎 Premium: ${mostExpensive.name} - R$ ${mostExpensive.price}\n`;

    if (products.length > 2) {
      const middle = sortedByPrice[Math.floor(sortedByPrice.length / 2)];
      comparison += `⚖️ Opção intermediária: ${middle.name} - R$ ${middle.price}\n`;
    }

    return comparison;
  }

  private convertProductToAIFormat(product: Product): ProductInfo {
    return {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: parseFloat(product.price),
      currency: product.currency || 'BRL',
      category: product.category || undefined,
      inStock: product.inStock ?? true // Default to true if null
    };
  }
}