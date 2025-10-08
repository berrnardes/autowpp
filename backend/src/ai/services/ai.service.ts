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
import { ConversationGoalService } from './conversation-goal.service';
import { AIProductIntegrationService } from './ai-product-integration.service';
import { ConfidenceScoringService } from './confidence-scoring.service';
import { EscalationService } from './escalation.service';

@Injectable()
export class AIService implements OnModuleInit {
  private readonly logger = new Logger(AIService.name);
  private chatModel: ChatOpenAI;
  private conversationChain: RunnableSequence;
  private config: AIServiceConfig;
  private currentGoal: ConversationGoalType = 'helpful';
  private trainingExamples: ConversationExample[] = [];
  private productKnowledge: ProductInfo[] = [];
  private productEmbeddings: Map<string, number[]> = new Map();

  constructor(
    private configService: ConfigService,
    private conversationGoalService: ConversationGoalService,
    private aiProductIntegrationService: AIProductIntegrationService,
    private confidenceScoringService: ConfidenceScoringService,
    private escalationService: EscalationService
  ) { }

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

  private async createConversationChain(goalType?: ConversationGoalType): Promise<void> {
    const goal = goalType || this.currentGoal;

    // Get goal-specific system prompt
    const goalConfig = this.conversationGoalService.getGoalConfiguration(goal);

    // Build few-shot examples section
    const fewShotExamples = this.buildFewShotExamples(goal);

    const systemPrompt = `Você é um assistente de atendimento ao cliente para WhatsApp Business em português brasileiro.

INSTRUÇÕES GERAIS:
- Responda sempre em português brasileiro
- Seja cordial, profissional e prestativo
- Use linguagem natural e amigável
- Use emojis moderadamente quando apropriado

${goalConfig.systemPrompt}

${fewShotExamples}

INFORMAÇÕES DO CONTEXTO:
- Produtos disponíveis: {products}
- Histórico da conversa disponível no contexto

Responda à mensagem do cliente seguindo as diretrizes do seu objetivo atual, os exemplos de treinamento fornecidos, e mantendo consistência com sua personalidade definida.`;

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

      // Update conversation chain if goal has changed
      if (context.conversationGoal !== this.currentGoal) {
        this.currentGoal = context.conversationGoal;
        await this.createConversationChain(context.conversationGoal);
      }

      // Prepare conversation history for LangChain
      const conversationHistory = this.formatConversationHistory(context.conversationHistory);

      // Get fresh product data from database if context is empty or outdated
      let currentProducts = context.products;
      if (!currentProducts || currentProducts.length === 0) {
        currentProducts = await this.aiProductIntegrationService.getAllProductsForAI();
      }

      // Update product knowledge
      if (currentProducts && currentProducts.length > 0) {
        await this.updateProductKnowledge(currentProducts);
      }

      // Check for specific product mentions in the message
      const mentionedProducts = this.aiProductIntegrationService.extractProductMentions(
        message.content,
        currentProducts
      );

      // Prepare products information with recommendations and mentions
      const productsInfo = await this.formatProductsInfoWithRecommendations(
        currentProducts,
        message.content,
        context.conversationGoal,
        mentionedProducts
      );

      // Generate AI response
      const response = await this.conversationChain.invoke({
        products: productsInfo,
        conversationHistory: conversationHistory,
        customerMessage: message.content
      });

      // Calculate comprehensive confidence score
      const confidenceAnalysis = this.confidenceScoringService.calculateConfidence(
        message,
        response,
        context.conversationGoal,
        {
          hasProductMentions: mentionedProducts.length > 0,
          conversationHistory: context.conversationHistory,
          productRecommendations: currentProducts
        }
      );

      // Evaluate escalation based on confidence and other factors
      const escalationResult = await this.escalationService.evaluateEscalation(
        context.conversationId || 'temp_conversation',
        message.messageId || 'temp_message',
        message.content,
        response,
        confidenceAnalysis,
        context.conversationGoal
      );

      const confidence = confidenceAnalysis.score;
      const shouldEscalate = escalationResult.shouldEscalate || confidenceAnalysis.shouldEscalate;

      const aiResponse: AIResponse = {
        content: shouldEscalate ? this.config.fallbackMessage : response,
        confidence,
        shouldEscalate,
        metadata: {
          model: this.config.model,
          temperature: this.config.temperature,
          conversationGoal: context.conversationGoal,
          goalConfig: this.conversationGoalService.getGoalConfiguration(context.conversationGoal).name,
          processingTime: Date.now(),
          confidenceAnalysis: {
            factors: confidenceAnalysis.factors,
            reasoning: confidenceAnalysis.reasoning,
            escalationReasons: confidenceAnalysis.escalationReasons
          },
          escalationEvents: escalationResult.escalationEvents.map(e => e.id),
          manualReviewRequired: escalationResult.manualReviewRequired
        }
      };

      this.logger.debug(`AI response generated with confidence: ${confidence} for goal: ${context.conversationGoal}`);
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

      // Validate examples
      const validExamples = examples.filter(example =>
        example.customerMessage?.trim() &&
        example.desiredResponse?.trim() &&
        example.customerMessage.length > 5 &&
        example.desiredResponse.length > 10
      );

      if (validExamples.length === 0) {
        return {
          success: false,
          message: 'Nenhum exemplo válido fornecido para treinamento',
          examplesProcessed: 0
        };
      }

      // Store examples for few-shot learning
      this.trainingExamples = validExamples.map(example => ({
        customerMessage: example.customerMessage,
        desiredResponse: example.desiredResponse,
        category: example.category || 'general'
      }));

      // Update conversation chain with few-shot examples
      await this.createConversationChain(this.currentGoal);

      this.logger.log(`Model trained with ${validExamples.length} examples for few-shot learning`);

      return {
        success: true,
        message: `Modelo treinado com sucesso usando ${validExamples.length} exemplos para aprendizado few-shot`,
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

      // Store products for AI context and recommendations
      this.productKnowledge = products;

      // Create product embeddings for better search and recommendations
      this.productEmbeddings = await this.createProductEmbeddings(products);

      // Update conversation chain to include new product knowledge
      await this.createConversationChain(this.currentGoal);

      this.logger.debug('Product knowledge updated successfully');
    } catch (error) {
      this.logger.error('Error updating product knowledge', error);
      throw error;
    }
  }

  async setConversationGoal(goal: ConversationGoalType): Promise<void> {
    try {
      this.logger.log(`Setting conversation goal to: ${goal}`);

      // Update current goal and recreate conversation chain
      this.currentGoal = goal;
      await this.createConversationChain(goal);

      this.logger.debug(`Conversation goal updated successfully to: ${goal}`);
    } catch (error) {
      this.logger.error('Error setting conversation goal', error);
      throw error;
    }
  }

  async updateCustomGoal(
    customPrompt: string,
    customInstructions: string[],
    customStyle?: any
  ): Promise<void> {
    try {
      this.logger.log('Updating custom conversation goal configuration');

      this.conversationGoalService.updateCustomGoalConfiguration(
        customPrompt,
        customInstructions,
        customStyle
      );

      // If current goal is custom, recreate the chain
      if (this.currentGoal === 'custom') {
        await this.createConversationChain('custom');
      }

      this.logger.debug('Custom goal configuration updated successfully');
    } catch (error) {
      this.logger.error('Error updating custom goal configuration', error);
      throw error;
    }
  }

  getAvailableGoals() {
    return this.conversationGoalService.getAvailableGoals();
  }

  getCurrentGoal(): ConversationGoalType {
    return this.currentGoal;
  }

  getGoalConfiguration(goalType: ConversationGoalType) {
    return this.conversationGoalService.getGoalConfiguration(goalType);
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

  private formatProductsInfoForGoal(products: ProductInfo[], goal: ConversationGoalType): string {
    if (!products || products.length === 0) {
      return 'Nenhum produto disponível no momento.';
    }

    const goalConfig = this.conversationGoalService.getGoalConfiguration(goal);
    const availableProducts = products.filter(p => p.inStock).slice(0, 10);

    switch (goal) {
      case 'deal_closer':
        return availableProducts
          .map(product =>
            `🔥 ${product.name}: ${product.description} - R$ ${product.price} ${product.currency} - OFERTA ESPECIAL!`
          )
          .join('\n');

      case 'support_agent':
        return availableProducts
          .map(product =>
            `${product.name} (ID: ${product.id}): ${product.description} - R$ ${product.price} ${product.currency}`
          )
          .join('\n');

      case 'lead_generator':
        return availableProducts
          .map(product =>
            `${product.name}: ${product.description} - A partir de R$ ${product.price} ${product.currency}`
          )
          .join('\n');

      default:
        return this.formatProductsInfo(products);
    }
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

  private calculateConfidenceForGoal(
    input: string,
    response: string,
    goal: ConversationGoalType
  ): number {
    let baseConfidence = this.calculateConfidence(input, response);
    const goalConfig = this.conversationGoalService.getGoalConfiguration(goal);

    // Goal-specific confidence adjustments
    switch (goal) {
      case 'deal_closer':
        // Higher confidence for responses that mention products or prices
        if (response.toLowerCase().includes('r$') || response.toLowerCase().includes('produto')) {
          baseConfidence += 0.1;
        }
        // Lower confidence if no sales-oriented language
        const salesKeywords = ['comprar', 'oferta', 'desconto', 'promoção', 'venda'];
        const hasSalesLanguage = salesKeywords.some(keyword =>
          response.toLowerCase().includes(keyword)
        );
        if (!hasSalesLanguage && input.toLowerCase().includes('preço')) {
          baseConfidence -= 0.1;
        }
        break;

      case 'support_agent':
        // Higher confidence for structured, problem-solving responses
        const supportKeywords = ['solução', 'resolver', 'problema', 'ajuda', 'passo'];
        const hasSupportLanguage = supportKeywords.some(keyword =>
          response.toLowerCase().includes(keyword)
        );
        if (hasSupportLanguage) {
          baseConfidence += 0.1;
        }
        break;

      case 'lead_generator':
        // Higher confidence for responses that ask qualifying questions
        const questionMarkers = ['?', 'qual', 'como', 'quando', 'onde', 'quem'];
        const hasQuestions = questionMarkers.some(marker =>
          response.toLowerCase().includes(marker)
        );
        if (hasQuestions) {
          baseConfidence += 0.1;
        }
        break;

      case 'helpful':
        // Higher confidence for informative responses
        if (response.length > 50 && !response.toLowerCase().includes('não sei')) {
          baseConfidence += 0.05;
        }
        break;
    }

    return Math.max(0, Math.min(1, baseConfidence));
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

  // Get training examples count
  getTrainingExamplesCount(): number {
    return this.trainingExamples.length;
  }

  // Clear training examples
  clearTrainingExamples(): void {
    this.trainingExamples = [];
    this.logger.log('Training examples cleared');
  }

  private buildFewShotExamples(goal: ConversationGoalType): string {
    if (this.trainingExamples.length === 0) {
      return '';
    }

    // Filter examples by category if relevant to goal, otherwise use all
    const relevantExamples = this.trainingExamples
      .filter(example => {
        // If example has no category, include it for all goals
        if (!example.category || example.category === 'general') {
          return true;
        }

        // Goal-specific filtering
        switch (goal) {
          case 'deal_closer':
            return example.category.toLowerCase().includes('venda') ||
              example.category.toLowerCase().includes('produto') ||
              example.category.toLowerCase().includes('preço');
          case 'support_agent':
            return example.category.toLowerCase().includes('suporte') ||
              example.category.toLowerCase().includes('problema') ||
              example.category.toLowerCase().includes('ajuda');
          case 'lead_generator':
            return example.category.toLowerCase().includes('lead') ||
              example.category.toLowerCase().includes('contato') ||
              example.category.toLowerCase().includes('informação');
          default:
            return true;
        }
      })
      .slice(0, 8); // Limit to 8 examples to avoid token limits

    if (relevantExamples.length === 0) {
      return '';
    }

    const examplesText = relevantExamples
      .map((example, index) =>
        `Exemplo ${index + 1}:
Cliente: ${example.customerMessage}
Assistente: ${example.desiredResponse}`
      )
      .join('\n\n');

    return `
EXEMPLOS DE CONVERSAS PARA APRENDIZADO:
Use os exemplos abaixo como referência para o estilo e tipo de resposta esperado:

${examplesText}

IMPORTANTE: Use estes exemplos como guia para o tom, estilo e abordagem, mas adapte suas respostas ao contexto específico de cada conversa.
`;
  }

  // Product recommendation and search methods
  async recommendProducts(
    customerMessage: string,
    conversationGoal: ConversationGoalType,
    maxRecommendations: number = 3
  ): Promise<ProductInfo[]> {
    try {
      if (!this.productKnowledge || this.productKnowledge.length === 0) {
        return [];
      }

      // Filter available products
      const availableProducts = this.productKnowledge.filter(p => p.inStock);

      if (availableProducts.length === 0) {
        return [];
      }

      // Score products based on message content and conversation goal
      const scoredProducts = availableProducts.map(product => ({
        product,
        score: this.calculateProductRelevanceScore(product, customerMessage, conversationGoal)
      }));

      // Sort by score and return top recommendations
      return scoredProducts
        .sort((a, b) => b.score - a.score)
        .slice(0, maxRecommendations)
        .map(item => item.product);

    } catch (error) {
      this.logger.error('Error generating product recommendations', error);
      return [];
    }
  }

  async searchProducts(query: string): Promise<ProductInfo[]> {
    try {
      if (!this.productKnowledge || this.productKnowledge.length === 0) {
        return [];
      }

      const queryLower = query.toLowerCase().trim();

      if (!queryLower) {
        return this.productKnowledge.filter(p => p.inStock).slice(0, 5);
      }

      // Search in product name, description, and category
      const matchingProducts = this.productKnowledge.filter(product => {
        if (!product.inStock) return false;

        const nameMatch = product.name.toLowerCase().includes(queryLower);
        const descriptionMatch = product.description?.toLowerCase().includes(queryLower) || false;
        const categoryMatch = product.category?.toLowerCase().includes(queryLower) || false;

        return nameMatch || descriptionMatch || categoryMatch;
      });

      // Score and sort results
      const scoredResults = matchingProducts.map(product => ({
        product,
        score: this.calculateSearchScore(product, queryLower)
      }));

      return scoredResults
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(item => item.product);

    } catch (error) {
      this.logger.error('Error searching products', error);
      return [];
    }
  }

  getProductById(productId: string): ProductInfo | null {
    return this.productKnowledge.find(p => p.id === productId) || null;
  }

  getProductsByCategory(category: string): ProductInfo[] {
    return this.productKnowledge.filter(p =>
      p.inStock &&
      p.category?.toLowerCase() === category.toLowerCase()
    );
  }

  getProductsInPriceRange(minPrice: number, maxPrice: number): ProductInfo[] {
    return this.productKnowledge.filter(p =>
      p.inStock &&
      p.price >= minPrice &&
      p.price <= maxPrice
    );
  }

  private calculateProductRelevanceScore(
    product: ProductInfo,
    customerMessage: string,
    conversationGoal: ConversationGoalType
  ): number {
    let score = 0;
    const messageLower = customerMessage.toLowerCase();

    // Base relevance from text matching
    if (product.name.toLowerCase().includes(messageLower)) {
      score += 3;
    }

    if (product.description?.toLowerCase().includes(messageLower)) {
      score += 2;
    }

    if (product.category?.toLowerCase().includes(messageLower)) {
      score += 1.5;
    }

    // Goal-specific scoring
    switch (conversationGoal) {
      case 'deal_closer':
        // Prioritize higher-priced items for deal closing
        score += (product.price / 1000) * 0.5;
        break;
      case 'support_agent':
        // Prioritize products mentioned in support context
        const supportKeywords = ['problema', 'defeito', 'garantia', 'troca', 'devolução'];
        if (supportKeywords.some(keyword => messageLower.includes(keyword))) {
          score += 2;
        }
        break;
      case 'lead_generator':
        // Prioritize popular categories or entry-level products
        if (product.price < 100) {
          score += 1;
        }
        break;
    }

    // Keyword-based scoring
    const productKeywords = this.extractProductKeywords(product);
    const messageWords = messageLower.split(/\s+/);

    for (const word of messageWords) {
      if (productKeywords.includes(word)) {
        score += 0.5;
      }
    }

    return score;
  }

  private calculateSearchScore(product: ProductInfo, query: string): number {
    let score = 0;

    // Exact name match gets highest score
    if (product.name.toLowerCase() === query) {
      score += 10;
    } else if (product.name.toLowerCase().includes(query)) {
      score += 5;
    }

    // Description matches
    if (product.description?.toLowerCase().includes(query)) {
      score += 3;
    }

    // Category matches
    if (product.category?.toLowerCase().includes(query)) {
      score += 2;
    }

    // Boost score for products with more complete information
    if (product.description && product.description.length > 50) {
      score += 0.5;
    }

    if (product.category) {
      score += 0.3;
    }

    return score;
  }

  private extractProductKeywords(product: ProductInfo): string[] {
    const keywords: string[] = [];

    // Add name words
    keywords.push(...product.name.toLowerCase().split(/\s+/));

    // Add description words (first 10 words)
    if (product.description) {
      keywords.push(...product.description.toLowerCase().split(/\s+/).slice(0, 10));
    }

    // Add category
    if (product.category) {
      keywords.push(product.category.toLowerCase());
    }

    return keywords.filter(word => word.length > 2); // Filter out short words
  }

  private async createProductEmbeddings(products: ProductInfo[]): Promise<Map<string, number[]>> {
    // Simplified embedding creation - in production, you'd use proper embeddings
    const embeddings = new Map<string, number[]>();

    for (const product of products) {
      // Create a simple hash-based embedding for demonstration
      const text = `${product.name} ${product.description || ''} ${product.category || ''}`;
      const embedding = this.createSimpleEmbedding(text);
      embeddings.set(product.id, embedding);
    }

    return embeddings;
  }

  private createSimpleEmbedding(text: string): number[] {
    // Simplified embedding - in production, use proper embedding models
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(50).fill(0);

    for (let i = 0; i < words.length && i < 50; i++) {
      const word = words[i];
      // Simple hash to number conversion
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash + word.charCodeAt(j)) & 0xffffffff;
      }
      embedding[i % 50] += Math.abs(hash) / 1000000000;
    }

    return embedding;
  }

  // Enhanced product formatting with recommendations
  private async formatProductsInfoWithRecommendations(
    products: ProductInfo[],
    customerMessage: string,
    goal: ConversationGoalType,
    mentionedProducts?: ProductInfo[]
  ): Promise<string> {
    if (!products || products.length === 0) {
      return 'Nenhum produto disponível no momento.';
    }

    // Get recommendations based on customer message
    const recommendations = await this.recommendProducts(customerMessage, goal, 3);

    let formattedInfo = '';

    // Handle mentioned products first
    if (mentionedProducts && mentionedProducts.length > 0) {
      formattedInfo += 'PRODUTOS MENCIONADOS:\n';
      formattedInfo += mentionedProducts
        .map(product => this.formatSingleProduct(product, goal))
        .join('\n');

      // Add comparison if multiple products mentioned
      if (mentionedProducts.length > 1) {
        formattedInfo += '\n\n' + this.aiProductIntegrationService.generateProductComparisonText(mentionedProducts);
      }

      formattedInfo += '\n\n';
    }

    if (recommendations.length > 0) {
      formattedInfo += 'PRODUTOS RECOMENDADOS:\n';
      formattedInfo += recommendations
        .map(product => this.formatSingleProduct(product, goal))
        .join('\n');

      // Add other available products if there are more
      const excludeIds = [
        ...(mentionedProducts?.map(p => p.id) || []),
        ...recommendations.map(r => r.id)
      ];

      const otherProducts = products
        .filter(p => p.inStock && !excludeIds.includes(p.id))
        .slice(0, 3);

      if (otherProducts.length > 0) {
        formattedInfo += '\n\nOUTROS PRODUTOS DISPONÍVEIS:\n';
        formattedInfo += otherProducts
          .map(product => this.formatSingleProduct(product, goal))
          .join('\n');
      }
    } else if (!mentionedProducts || mentionedProducts.length === 0) {
      // Fallback to regular formatting if no recommendations or mentions
      formattedInfo = this.formatProductsInfoForGoal(products, goal);
    }

    // Add product summary for context
    if (products.length > 5) {
      formattedInfo += '\n\n' + this.aiProductIntegrationService.generateProductSummaryForGoal(products, goal);
    }

    return formattedInfo;
  }

  private formatSingleProduct(product: ProductInfo, goal: ConversationGoalType): string {
    const baseInfo = `${product.name}: ${product.description || 'Sem descrição'} - R$ ${product.price} ${product.currency}`;

    switch (goal) {
      case 'deal_closer':
        return `🔥 ${baseInfo} - OFERTA ESPECIAL! 💰`;
      case 'support_agent':
        return `${baseInfo} (ID: ${product.id})`;
      case 'lead_generator':
        return `✨ ${baseInfo} - Quer saber mais?`;
      default:
        return baseInfo;
    }
  }
}