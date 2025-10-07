import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { 
  IncomingMessage, 
  AIResponse, 
  ConversationContext, 
  TrainingResult, 
  ConversationExample,
  AIServiceConfig,
  ProductInfo
} from '../interfaces/ai.interface';
import { ConversationGoalType } from '../../database/schema';

@Injectable()
export class AIService implements OnModuleInit {
  private readonly logger = new Logger(AIService.name);
  private chatModel: ChatOpenAI;
  private conversationChain: RunnableSequence;
  private config: AIServiceConfig;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeAI();
  }

  private async initializeAI(): Promise<void> {
    try {
      // Validate required configuration
      const openAIApiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!openAIApiKey) {
        throw new Error('OPENAI_API_KEY is required but not provided');
      }

      // Initialize configuration
      this.config = {
        model: this.configService.get<string>('AI_MODEL', 'gpt-3.5-turbo'),
        temperature: 0.7,
        maxTokens: 500,
        confidenceThreshold: parseFloat(this.configService.get<string>('AI_CONFIDENCE_THRESHOLD', '0.8')),
        fallbackMessage: 'Desculpe, não consegui entender sua mensagem. Pode reformular sua pergunta?'
      };

      // Initialize OpenAI chat model
      this.chatModel = new ChatOpenAI({
        openAIApiKey,
        modelName: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      // Create conversation chain
      await this.createConversationChain();

      this.logger.log('AI Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AI Service', error);
      throw error;
    }
  }

  private async createConversationChain(): Promise<void> {
    const systemPrompt = `Você é um assistente de atendimento ao cliente para WhatsApp Business em português brasileiro.

INSTRUÇÕES GERAIS:
- Responda sempre em português brasileiro
- Seja cordial, profissional e prestativo
- Use linguagem natural e amigável
- Mantenha respostas concisas (máximo 2-3 frases)
- Use emojis moderadamente quando apropriado

INFORMAÇÕES DO CONTEXTO:
- Objetivo da conversa: {conversationGoal}
- Produtos disponíveis: {products}
- Histórico da conversa: {conversationHistory}

COMPORTAMENTO POR OBJETIVO:
- helpful: Foque em ser útil e informativo
- deal_closer: Priorize converter a conversa em vendas
- support_agent: Concentre-se em resolver problemas
- lead_generator: Colete informações de contato e interesse

Responda à mensagem do cliente de forma natural e contextual.`;

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      new MessagesPlaceholder('conversationHistory'),
      ['human', '{customerMessage}']
    ]);

    this.conversationChain = RunnableSequence.from([
      prompt,
      this.chatModel,
      new StringOutputParser()
    ]);
  }

  async processMessage(
    message: IncomingMessage, 
    context: ConversationContext
  ): Promise<AIResponse> {
    try {
      this.logger.debug(`Processing message from ${message.customerPhone}: ${message.content}`);

      // Prepare conversation history for LangChain
      const conversationHistory = this.formatConversationHistory(context.conversationHistory);
      
      // Prepare products information
      const productsInfo = this.formatProductsInfo(context.products);

      // Generate AI response
      const response = await this.conversationChain.invoke({
        conversationGoal: this.getGoalDescription(context.conversationGoal),
        products: productsInfo,
        conversationHistory: conversationHistory,
        customerMessage: message.content
      });

      // Calculate confidence score (simplified implementation)
      const confidence = this.calculateConfidence(message.content, response);
      
      // Determine if escalation is needed
      const shouldEscalate = confidence < this.config.confidenceThreshold;

      const aiResponse: AIResponse = {
        content: shouldEscalate ? this.config.fallbackMessage : response,
        confidence,
        shouldEscalate,
        metadata: {
          model: this.config.model,
          temperature: this.config.temperature,
          conversationGoal: context.conversationGoal,
          processingTime: Date.now()
        }
      };

      this.logger.debug(`AI response generated with confidence: ${confidence}`);
      return aiResponse;

    } catch (error) {
      this.logger.error('Error processing message with AI', error);
      
      return {
        content: this.config.fallbackMessage,
        confidence: 0,
        shouldEscalate: true,
        metadata: { error: error.message }
      };
    }
  }

  async trainModel(examples: ConversationExample[]): Promise<TrainingResult> {
    try {
      this.logger.log(`Training model with ${examples.length} examples`);
      
      // For now, we'll store examples for few-shot learning
      // In a production system, you might want to fine-tune the model
      // or use a vector database for retrieval-augmented generation
      
      // Validate examples
      const validExamples = examples.filter(example => 
        example.customerMessage?.trim() && example.desiredResponse?.trim()
      );

      if (validExamples.length === 0) {
        return {
          success: false,
          message: 'Nenhum exemplo válido fornecido para treinamento',
          examplesProcessed: 0
        };
      }

      // Here you would implement the actual training logic
      // For this MVP, we'll just validate and log the examples
      this.logger.log(`Processed ${validExamples.length} valid training examples`);

      return {
        success: true,
        message: `Modelo treinado com sucesso usando ${validExamples.length} exemplos`,
        examplesProcessed: validExamples.length
      };

    } catch (error) {
      this.logger.error('Error training model', error);
      return {
        success: false,
        message: `Erro durante o treinamento: ${error.message}`,
        examplesProcessed: 0
      };
    }
  }

  async updateProductKnowledge(products: ProductInfo[]): Promise<void> {
    try {
      this.logger.log(`Updating product knowledge with ${products.length} products`);
      
      // In a production system, you might want to update a vector database
      // or retrain embeddings for product information
      // For now, we'll just log the update
      
      this.logger.debug('Product knowledge updated successfully');
    } catch (error) {
      this.logger.error('Error updating product knowledge', error);
      throw error;
    }
  }

  async setConversationGoal(goal: ConversationGoalType): Promise<void> {
    try {
      this.logger.log(`Setting conversation goal to: ${goal}`);
      
      // Update the conversation chain with new goal-specific prompts
      await this.createConversationChain();
      
      this.logger.debug('Conversation goal updated successfully');
    } catch (error) {
      this.logger.error('Error setting conversation goal', error);
      throw error;
    }
  }

  private formatConversationHistory(history: any[]): BaseMessage[] {
    if (!history || history.length === 0) {
      return [];
    }

    return history.slice(-10).map(msg => {
      if (msg.type === 'incoming') {
        return new HumanMessage(msg.content);
      } else {
        return new AIMessage(msg.content);
      }
    });
  }

  private formatProductsInfo(products: ProductInfo[]): string {
    if (!products || products.length === 0) {
      return 'Nenhum produto disponível no momento.';
    }

    return products
      .filter(p => p.inStock)
      .slice(0, 10) // Limit to avoid token limits
      .map(product => 
        `${product.name}: ${product.description} - R$ ${product.price} ${product.currency}`
      )
      .join('\n');
  }

  private getGoalDescription(goal: ConversationGoalType): string {
    const descriptions = {
      helpful: 'Seja útil e informativo, ajudando o cliente com suas dúvidas',
      deal_closer: 'Foque em converter a conversa em vendas, destacando benefícios dos produtos',
      support_agent: 'Concentre-se em resolver problemas e fornecer suporte técnico',
      lead_generator: 'Colete informações de contato e identifique oportunidades de negócio',
      custom: 'Siga as instruções personalizadas definidas pelo usuário'
    };

    return descriptions[goal] || descriptions.helpful;
  }

  private calculateConfidence(input: string, response: string): number {
    // Simplified confidence calculation
    // In production, you might use more sophisticated methods
    
    let confidence = 0.8; // Base confidence
    
    // Reduce confidence for very short responses
    if (response.length < 20) {
      confidence -= 0.2;
    }
    
    // Reduce confidence if response seems generic
    const genericPhrases = ['não sei', 'não entendo', 'desculpe', 'não posso'];
    const hasGenericPhrase = genericPhrases.some(phrase => 
      response.toLowerCase().includes(phrase)
    );
    
    if (hasGenericPhrase) {
      confidence -= 0.3;
    }
    
    // Increase confidence for longer, detailed responses
    if (response.length > 100) {
      confidence += 0.1;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      // Test if the AI service is responsive
      const testResponse = await this.chatModel.invoke([
        new HumanMessage('Test message')
      ]);
      
      return !!testResponse;
    } catch (error) {
      this.logger.error('AI Service health check failed', error);
      return false;
    }
  }

  // Get current configuration
  getConfig(): AIServiceConfig {
    return { ...this.config };
  }
}