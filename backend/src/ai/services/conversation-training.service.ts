import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, desc, and, like, count } from 'drizzle-orm';
import { db } from '../../database/connection';
import { conversationExamples, ConversationExample, NewConversationExample } from '../../database/schema';
import { TrainingResult } from '../interfaces/ai.interface';

export interface CreateConversationExampleDto {
  customerMessage: string;
  desiredResponse: string;
  category?: string;
}

export interface UpdateConversationExampleDto {
  customerMessage?: string;
  desiredResponse?: string;
  category?: string;
}

export interface ConversationExampleQuery {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TrainingDataProcessingResult {
  processedExamples: ProcessedExample[];
  categories: string[];
  totalExamples: number;
  validExamples: number;
}

export interface ProcessedExample {
  id: string;
  customerMessage: string;
  desiredResponse: string;
  category?: string;
  messageLength: number;
  responseLength: number;
  keywords: string[];
  createdAt: Date;
}

@Injectable()
export class ConversationTrainingService {
  private readonly logger = new Logger(ConversationTrainingService.name);

  async createExample(data: CreateConversationExampleDto): Promise<ConversationExample> {
    try {
      this.logger.debug(`Creating conversation example for category: ${data.category || 'general'}`);

      // Validate input
      this.validateExampleData(data);

      const newExample: NewConversationExample = {
        customerMessage: data.customerMessage.trim(),
        desiredResponse: data.desiredResponse.trim(),
        category: data.category?.trim() || null
      };

      const [created] = await db.insert(conversationExamples)
        .values(newExample)
        .returning();

      this.logger.log(`Created conversation example with ID: ${created.id}`);
      return created;

    } catch (error) {
      this.logger.error('Error creating conversation example', error);
      throw error;
    }
  }

  async updateExample(id: string, data: UpdateConversationExampleDto): Promise<ConversationExample> {
    try {
      this.logger.debug(`Updating conversation example: ${id}`);

      // Check if example exists
      const existing = await this.getExampleById(id);
      if (!existing) {
        throw new NotFoundException(`Exemplo de conversa com ID ${id} não encontrado`);
      }

      // Validate updated data
      if (data.customerMessage || data.desiredResponse) {
        this.validateExampleData({
          customerMessage: data.customerMessage || existing.customerMessage,
          desiredResponse: data.desiredResponse || existing.desiredResponse,
          category: data.category
        });
      }

      const updateData: Partial<NewConversationExample> = {};
      if (data.customerMessage !== undefined) {
        updateData.customerMessage = data.customerMessage.trim();
      }
      if (data.desiredResponse !== undefined) {
        updateData.desiredResponse = data.desiredResponse.trim();
      }
      if (data.category !== undefined) {
        updateData.category = data.category?.trim() || null;
      }

      const [updated] = await db.update(conversationExamples)
        .set(updateData)
        .where(eq(conversationExamples.id, id))
        .returning();

      this.logger.log(`Updated conversation example: ${id}`);
      return updated;

    } catch (error) {
      this.logger.error(`Error updating conversation example ${id}`, error);
      throw error;
    }
  }

  async deleteExample(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting conversation example: ${id}`);

      const result = await db.delete(conversationExamples)
        .where(eq(conversationExamples.id, id))
        .returning();

      if (result.length === 0) {
        throw new NotFoundException(`Exemplo de conversa com ID ${id} não encontrado`);
      }

      this.logger.log(`Deleted conversation example: ${id}`);

    } catch (error) {
      this.logger.error(`Error deleting conversation example ${id}`, error);
      throw error;
    }
  }

  async getExampleById(id: string): Promise<ConversationExample | null> {
    try {
      const [example] = await db.select()
        .from(conversationExamples)
        .where(eq(conversationExamples.id, id))
        .limit(1);

      return example || null;

    } catch (error) {
      this.logger.error(`Error fetching conversation example ${id}`, error);
      throw error;
    }
  }

  async getExamples(query: ConversationExampleQuery = {}): Promise<{
    examples: ConversationExample[];
    total: number;
  }> {
    try {
      const { category, search, limit = 50, offset = 0 } = query;

      let whereConditions = [];

      if (category) {
        whereConditions.push(eq(conversationExamples.category, category));
      }

      if (search) {
        const searchTerm = `%${search.toLowerCase()}%`;
        whereConditions.push(
          like(conversationExamples.customerMessage, searchTerm)
        );
      }

      const whereClause = whereConditions.length > 0 
        ? and(...whereConditions) 
        : undefined;

      // Get total count
      const [{ count: totalCount }] = await db.select({ count: count() })
        .from(conversationExamples)
        .where(whereClause);

      // Get examples
      const examples = await db.select()
        .from(conversationExamples)
        .where(whereClause)
        .orderBy(desc(conversationExamples.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        examples,
        total: totalCount
      };

    } catch (error) {
      this.logger.error('Error fetching conversation examples', error);
      throw error;
    }
  }

  async getExamplesByCategory(category: string): Promise<ConversationExample[]> {
    try {
      const examples = await db.select()
        .from(conversationExamples)
        .where(eq(conversationExamples.category, category))
        .orderBy(desc(conversationExamples.createdAt));

      return examples;

    } catch (error) {
      this.logger.error(`Error fetching examples for category ${category}`, error);
      throw error;
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const result = await db.selectDistinct({ category: conversationExamples.category })
        .from(conversationExamples)
        .where(eq(conversationExamples.category, conversationExamples.category)); // Only non-null categories

      return result
        .map(row => row.category)
        .filter(category => category !== null)
        .sort();

    } catch (error) {
      this.logger.error('Error fetching conversation categories', error);
      throw error;
    }
  }

  async processTrainingData(): Promise<TrainingDataProcessingResult> {
    try {
      this.logger.log('Processing training data for AI model');

      const { examples, total } = await this.getExamples({ limit: 1000 });
      
      const processedExamples: ProcessedExample[] = examples.map(example => ({
        id: example.id,
        customerMessage: example.customerMessage,
        desiredResponse: example.desiredResponse,
        category: example.category || undefined,
        messageLength: example.customerMessage.length,
        responseLength: example.desiredResponse.length,
        keywords: this.extractKeywords(example.customerMessage),
        createdAt: example.createdAt
      }));

      const categories = await this.getCategories();
      const validExamples = processedExamples.filter(example => 
        example.messageLength > 5 && example.responseLength > 10
      ).length;

      const result: TrainingDataProcessingResult = {
        processedExamples,
        categories,
        totalExamples: total,
        validExamples
      };

      this.logger.log(`Processed ${validExamples}/${total} valid training examples`);
      return result;

    } catch (error) {
      this.logger.error('Error processing training data', error);
      throw error;
    }
  }

  async validateTrainingData(): Promise<TrainingResult> {
    try {
      const { totalExamples, validExamples, categories } = await this.processTrainingData();

      if (totalExamples === 0) {
        return {
          success: false,
          message: 'Nenhum exemplo de conversa encontrado. Adicione exemplos para treinar o modelo.',
          examplesProcessed: 0
        };
      }

      if (validExamples < 5) {
        return {
          success: false,
          message: `Apenas ${validExamples} exemplos válidos encontrados. Recomendamos pelo menos 5 exemplos para um treinamento eficaz.`,
          examplesProcessed: validExamples
        };
      }

      if (categories.length === 0) {
        return {
          success: true,
          message: `${validExamples} exemplos válidos processados. Considere adicionar categorias para melhor organização.`,
          examplesProcessed: validExamples
        };
      }

      return {
        success: true,
        message: `Dados de treinamento validados com sucesso: ${validExamples} exemplos em ${categories.length} categorias.`,
        examplesProcessed: validExamples
      };

    } catch (error) {
      this.logger.error('Error validating training data', error);
      return {
        success: false,
        message: `Erro na validação dos dados: ${error.message}`,
        examplesProcessed: 0
      };
    }
  }

  async getTrainingExamplesForFewShot(category?: string, limit: number = 10): Promise<ConversationExample[]> {
    try {
      const query: ConversationExampleQuery = { limit };
      if (category) {
        query.category = category;
      }

      const { examples } = await this.getExamples(query);
      
      // Filter for high-quality examples for few-shot learning
      const qualityExamples = examples.filter(example => 
        example.customerMessage.length > 10 &&
        example.desiredResponse.length > 20 &&
        !example.desiredResponse.toLowerCase().includes('não sei') &&
        !example.desiredResponse.toLowerCase().includes('desculpe')
      );

      return qualityExamples.slice(0, limit);

    } catch (error) {
      this.logger.error('Error getting training examples for few-shot learning', error);
      throw error;
    }
  }

  private validateExampleData(data: CreateConversationExampleDto): void {
    if (!data.customerMessage || data.customerMessage.trim().length < 3) {
      throw new Error('Mensagem do cliente deve ter pelo menos 3 caracteres');
    }

    if (!data.desiredResponse || data.desiredResponse.trim().length < 10) {
      throw new Error('Resposta desejada deve ter pelo menos 10 caracteres');
    }

    if (data.customerMessage.trim().length > 1000) {
      throw new Error('Mensagem do cliente não pode exceder 1000 caracteres');
    }

    if (data.desiredResponse.trim().length > 2000) {
      throw new Error('Resposta desejada não pode exceder 2000 caracteres');
    }

    if (data.category && data.category.trim().length > 100) {
      throw new Error('Categoria não pode exceder 100 caracteres');
    }
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction for Portuguese
    const stopWords = new Set([
      'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
      'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
      'por', 'para', 'com', 'sem', 'sobre', 'entre', 'até', 'desde',
      'e', 'ou', 'mas', 'que', 'se', 'quando', 'onde', 'como', 'porque',
      'é', 'são', 'foi', 'foram', 'ser', 'estar', 'ter', 'haver',
      'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas',
      'meu', 'minha', 'meus', 'minhas', 'seu', 'sua', 'seus', 'suas',
      'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
      'aquele', 'aquela', 'aqueles', 'aquelas'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to 10 keywords
  }
}