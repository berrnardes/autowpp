import { Injectable, Logger } from '@nestjs/common';
import { ConversationGoalType } from '../../database/schema';
import { IncomingMessage, AIResponse } from '../interfaces/ai.interface';

export interface ConfidenceFactors {
  responseLength: number;
  genericPhrasesPenalty: number;
  goalSpecificBonus: number;
  productMentionBonus: number;
  questionHandlingBonus: number;
  contextRelevanceBonus: number;
  languageQualityBonus: number;
}

export interface ConfidenceAnalysis {
  score: number;
  factors: ConfidenceFactors;
  reasoning: string[];
  shouldEscalate: boolean;
  escalationReasons: string[];
}

@Injectable()
export class ConfidenceScoringService {
  private readonly logger = new Logger(ConfidenceScoringService.name);
  
  // Base confidence threshold - can be configured per goal
  private readonly baseConfidenceThreshold = 0.75;
  
  // Goal-specific confidence thresholds
  private readonly goalThresholds: Record<ConversationGoalType, number> = {
    helpful: 0.70,
    deal_closer: 0.75,
    support_agent: 0.80, // Higher threshold for support as accuracy is critical
    lead_generator: 0.65, // Lower threshold as engagement is more important
    custom: 0.75
  };

  /**
   * Calculate comprehensive confidence score for AI response
   */
  calculateConfidence(
    message: IncomingMessage,
    response: string,
    goal: ConversationGoalType,
    context?: {
      hasProductMentions?: boolean;
      conversationHistory?: any[];
      productRecommendations?: any[];
    }
  ): ConfidenceAnalysis {
    const factors: ConfidenceFactors = {
      responseLength: 0,
      genericPhrasesPenalty: 0,
      goalSpecificBonus: 0,
      productMentionBonus: 0,
      questionHandlingBonus: 0,
      contextRelevanceBonus: 0,
      languageQualityBonus: 0
    };

    const reasoning: string[] = [];
    let baseScore = 0.8; // Start with base confidence

    // 1. Response Length Analysis
    const lengthScore = this.analyzeResponseLength(response);
    factors.responseLength = lengthScore;
    baseScore += lengthScore;
    
    if (lengthScore > 0) {
      reasoning.push(`Resposta tem comprimento adequado (+${lengthScore.toFixed(2)})`);
    } else if (lengthScore < 0) {
      reasoning.push(`Resposta muito curta ou muito longa (${lengthScore.toFixed(2)})`);
    }

    // 2. Generic Phrases Penalty
    const genericPenalty = this.analyzeGenericPhrases(response);
    factors.genericPhrasesPenalty = genericPenalty;
    baseScore += genericPenalty;
    
    if (genericPenalty < 0) {
      reasoning.push(`Resposta contém frases genéricas (${genericPenalty.toFixed(2)})`);
    }

    // 3. Goal-Specific Analysis
    const goalBonus = this.analyzeGoalSpecificContent(response, goal, message.content);
    factors.goalSpecificBonus = goalBonus;
    baseScore += goalBonus;
    
    if (goalBonus > 0) {
      reasoning.push(`Resposta alinhada com objetivo ${goal} (+${goalBonus.toFixed(2)})`);
    }

    // 4. Product Mention Analysis
    if (context?.hasProductMentions) {
      const productBonus = this.analyzeProductMentions(response, context.productRecommendations);
      factors.productMentionBonus = productBonus;
      baseScore += productBonus;
      
      if (productBonus > 0) {
        reasoning.push(`Resposta menciona produtos relevantes (+${productBonus.toFixed(2)})`);
      }
    }

    // 5. Question Handling Analysis
    const questionBonus = this.analyzeQuestionHandling(message.content, response);
    factors.questionHandlingBonus = questionBonus;
    baseScore += questionBonus;
    
    if (questionBonus > 0) {
      reasoning.push(`Resposta adequada à pergunta do cliente (+${questionBonus.toFixed(2)})`);
    } else if (questionBonus < 0) {
      reasoning.push(`Resposta não aborda adequadamente a pergunta (${questionBonus.toFixed(2)})`);
    }

    // 6. Context Relevance Analysis
    if (context?.conversationHistory && context.conversationHistory.length > 0) {
      const contextBonus = this.analyzeContextRelevance(response, context.conversationHistory);
      factors.contextRelevanceBonus = contextBonus;
      baseScore += contextBonus;
      
      if (contextBonus > 0) {
        reasoning.push(`Resposta considera contexto da conversa (+${contextBonus.toFixed(2)})`);
      }
    }

    // 7. Language Quality Analysis
    const languageBonus = this.analyzeLanguageQuality(response);
    factors.languageQualityBonus = languageBonus;
    baseScore += languageBonus;
    
    if (languageBonus > 0) {
      reasoning.push(`Boa qualidade de linguagem (+${languageBonus.toFixed(2)})`);
    } else if (languageBonus < 0) {
      reasoning.push(`Problemas na qualidade da linguagem (${languageBonus.toFixed(2)})`);
    }

    // Normalize score to 0-1 range
    const finalScore = Math.max(0, Math.min(1, baseScore));
    
    // Determine escalation
    const threshold = this.goalThresholds[goal];
    const shouldEscalate = finalScore < threshold;
    const escalationReasons = this.getEscalationReasons(finalScore, threshold, factors, goal);

    return {
      score: finalScore,
      factors,
      reasoning,
      shouldEscalate,
      escalationReasons
    };
  }

  /**
   * Analyze response length appropriateness
   */
  private analyzeResponseLength(response: string): number {
    const length = response.trim().length;
    
    // Very short responses (likely incomplete)
    if (length < 10) {
      return -0.3;
    }
    
    // Too short for meaningful help
    if (length < 30) {
      return -0.1;
    }
    
    // Good length range
    if (length >= 30 && length <= 500) {
      return 0.1;
    }
    
    // Very long responses (might be overwhelming)
    if (length > 1000) {
      return -0.05;
    }
    
    return 0;
  }

  /**
   * Analyze presence of generic phrases that indicate low confidence
   */
  private analyzeGenericPhrases(response: string): number {
    const genericPhrases = [
      'não sei',
      'não entendo',
      'não posso ajudar',
      'desculpe, não',
      'não tenho informações',
      'não consigo',
      'talvez',
      'pode ser que',
      'não tenho certeza'
    ];

    const lowerResponse = response.toLowerCase();
    let penalty = 0;

    for (const phrase of genericPhrases) {
      if (lowerResponse.includes(phrase)) {
        penalty -= 0.15; // Each generic phrase reduces confidence
      }
    }

    return penalty;
  }

  /**
   * Analyze goal-specific content quality
   */
  private analyzeGoalSpecificContent(response: string, goal: ConversationGoalType, customerMessage: string): number {
    const lowerResponse = response.toLowerCase();
    const lowerMessage = customerMessage.toLowerCase();
    
    switch (goal) {
      case 'deal_closer':
        return this.analyzeDealCloserContent(lowerResponse, lowerMessage);
      
      case 'support_agent':
        return this.analyzeSupportAgentContent(lowerResponse, lowerMessage);
      
      case 'lead_generator':
        return this.analyzeLeadGeneratorContent(lowerResponse, lowerMessage);
      
      case 'helpful':
        return this.analyzeHelpfulContent(lowerResponse, lowerMessage);
      
      default:
        return 0;
    }
  }

  private analyzeDealCloserContent(response: string, customerMessage: string): number {
    let bonus = 0;
    
    // Sales-oriented keywords
    const salesKeywords = [
      'comprar', 'oferta', 'desconto', 'promoção', 'venda', 'preço especial',
      'oportunidade', 'benefício', 'vantagem', 'economia', 'investimento'
    ];
    
    const hasSalesLanguage = salesKeywords.some(keyword => response.includes(keyword));
    if (hasSalesLanguage) {
      bonus += 0.1;
    }
    
    // Price-related responses when customer asks about price
    if (customerMessage.includes('preço') || customerMessage.includes('custa')) {
      if (response.includes('r$') || response.includes('real')) {
        bonus += 0.15;
      }
    }
    
    // Call-to-action presence
    const ctaKeywords = ['entre em contato', 'fale conosco', 'whatsapp', 'telefone', 'compre agora'];
    const hasCTA = ctaKeywords.some(keyword => response.includes(keyword));
    if (hasCTA) {
      bonus += 0.1;
    }
    
    return bonus;
  }

  private analyzeSupportAgentContent(response: string, customerMessage: string): number {
    let bonus = 0;
    
    // Support-oriented keywords
    const supportKeywords = [
      'solução', 'resolver', 'problema', 'ajuda', 'passo', 'instruções',
      'verificar', 'configurar', 'testar', 'diagnosticar'
    ];
    
    const hasSupportLanguage = supportKeywords.some(keyword => response.includes(keyword));
    if (hasSupportLanguage) {
      bonus += 0.1;
    }
    
    // Step-by-step instructions
    if (response.includes('1.') || response.includes('primeiro') || response.includes('passo')) {
      bonus += 0.15;
    }
    
    // Problem acknowledgment
    if (customerMessage.includes('problema') || customerMessage.includes('erro')) {
      const acknowledgmentKeywords = ['entendo', 'compreendo', 'vou ajudar', 'vamos resolver'];
      const hasAcknowledgment = acknowledgmentKeywords.some(keyword => response.includes(keyword));
      if (hasAcknowledgment) {
        bonus += 0.1;
      }
    }
    
    return bonus;
  }

  private analyzeLeadGeneratorContent(response: string, customerMessage: string): number {
    let bonus = 0;
    
    // Question-asking behavior
    const questionMarkers = ['?', 'qual', 'como', 'quando', 'onde', 'quem', 'quantos'];
    const hasQuestions = questionMarkers.some(marker => response.includes(marker));
    if (hasQuestions) {
      bonus += 0.15;
    }
    
    // Information gathering keywords
    const gatheringKeywords = [
      'me conte', 'gostaria de saber', 'pode me informar', 'qual seu',
      'preciso entender', 'para te ajudar melhor'
    ];
    
    const hasGathering = gatheringKeywords.some(keyword => response.includes(keyword));
    if (hasGathering) {
      bonus += 0.1;
    }
    
    // Engagement keywords
    const engagementKeywords = ['interessante', 'ótimo', 'perfeito', 'entendi', 'legal'];
    const hasEngagement = engagementKeywords.some(keyword => response.includes(keyword));
    if (hasEngagement) {
      bonus += 0.05;
    }
    
    return bonus;
  }

  private analyzeHelpfulContent(response: string, customerMessage: string): number {
    let bonus = 0;
    
    // Informative keywords
    const informativeKeywords = [
      'informação', 'explicar', 'esclarecer', 'detalhe', 'exemplo',
      'significa', 'funciona', 'processo', 'método'
    ];
    
    const hasInformative = informativeKeywords.some(keyword => response.includes(keyword));
    if (hasInformative) {
      bonus += 0.1;
    }
    
    // Helpful phrases
    const helpfulPhrases = [
      'posso ajudar', 'vou explicar', 'para esclarecer', 'em outras palavras',
      'por exemplo', 'isso significa', 'funciona assim'
    ];
    
    const hasHelpful = helpfulPhrases.some(phrase => response.includes(phrase));
    if (hasHelpful) {
      bonus += 0.1;
    }
    
    return bonus;
  }

  /**
   * Analyze product mention quality
   */
  private analyzeProductMentions(response: string, productRecommendations?: any[]): number {
    let bonus = 0;
    
    // Check if response mentions products
    const productKeywords = ['produto', 'item', 'r$', 'preço', 'disponível', 'estoque'];
    const hasProductMention = productKeywords.some(keyword => response.toLowerCase().includes(keyword));
    
    if (hasProductMention) {
      bonus += 0.1;
    }
    
    // Bonus for specific product recommendations
    if (productRecommendations && productRecommendations.length > 0) {
      const hasSpecificProducts = productRecommendations.some(product => 
        response.toLowerCase().includes(product.name.toLowerCase())
      );
      
      if (hasSpecificProducts) {
        bonus += 0.15;
      }
    }
    
    return bonus;
  }

  /**
   * Analyze how well the response addresses the customer's question
   */
  private analyzeQuestionHandling(customerMessage: string, response: string): number {
    const lowerMessage = customerMessage.toLowerCase();
    const lowerResponse = response.toLowerCase();
    
    // Check if customer asked a question
    const isQuestion = lowerMessage.includes('?') || 
                      lowerMessage.startsWith('qual') ||
                      lowerMessage.startsWith('como') ||
                      lowerMessage.startsWith('quando') ||
                      lowerMessage.startsWith('onde') ||
                      lowerMessage.startsWith('por que') ||
                      lowerMessage.startsWith('quanto');
    
    if (!isQuestion) {
      return 0; // Not a question, no penalty or bonus
    }
    
    // If it's a question, check if response provides an answer
    const answerIndicators = [
      'é', 'são', 'funciona', 'significa', 'custa', 'fica', 'tem', 'temos',
      'você pode', 'é possível', 'sim', 'não', 'claro', 'certamente'
    ];
    
    const hasAnswer = answerIndicators.some(indicator => lowerResponse.includes(indicator));
    
    if (hasAnswer) {
      return 0.1; // Good answer to question
    } else {
      return -0.1; // Question not properly addressed
    }
  }

  /**
   * Analyze context relevance based on conversation history
   */
  private analyzeContextRelevance(response: string, conversationHistory: any[]): number {
    if (!conversationHistory || conversationHistory.length === 0) {
      return 0;
    }
    
    // Get recent messages to check context continuity
    const recentMessages = conversationHistory.slice(-3);
    const lowerResponse = response.toLowerCase();
    
    let relevanceScore = 0;
    
    // Check if response references previous conversation
    const contextKeywords = [
      'como mencionei', 'conforme falamos', 'voltando ao', 'sobre o que',
      'em relação ao', 'continuando', 'além disso', 'também'
    ];
    
    const hasContextReference = contextKeywords.some(keyword => lowerResponse.includes(keyword));
    if (hasContextReference) {
      relevanceScore += 0.1;
    }
    
    // Check topic consistency
    const topics = this.extractTopics(recentMessages);
    const responseTopics = this.extractTopics([{ content: response }]);
    
    const hasTopicOverlap = topics.some(topic => responseTopics.includes(topic));
    if (hasTopicOverlap) {
      relevanceScore += 0.05;
    }
    
    return relevanceScore;
  }

  /**
   * Analyze language quality (grammar, coherence, etc.)
   */
  private analyzeLanguageQuality(response: string): number {
    let score = 0;
    
    // Check for proper sentence structure
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) {
      return -0.2; // No proper sentences
    }
    
    // Check for proper capitalization
    const properCapitalization = sentences.every(sentence => {
      const trimmed = sentence.trim();
      return trimmed.length === 0 || /^[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]/.test(trimmed);
    });
    
    if (properCapitalization) {
      score += 0.05;
    }
    
    // Check for coherence (no repeated words/phrases)
    const words = response.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    
    if (repetitionRatio > 0.7) {
      score += 0.05; // Good word variety
    } else if (repetitionRatio < 0.5) {
      score -= 0.1; // Too much repetition
    }
    
    return score;
  }

  /**
   * Extract topics from messages for context analysis
   */
  private extractTopics(messages: any[]): string[] {
    const topics: string[] = [];
    
    const topicKeywords = [
      'produto', 'preço', 'entrega', 'pagamento', 'desconto', 'promoção',
      'suporte', 'problema', 'erro', 'ajuda', 'dúvida', 'informação',
      'compra', 'venda', 'pedido', 'estoque', 'disponível'
    ];
    
    for (const message of messages) {
      const content = message.content.toLowerCase();
      for (const keyword of topicKeywords) {
        if (content.includes(keyword) && !topics.includes(keyword)) {
          topics.push(keyword);
        }
      }
    }
    
    return topics;
  }

  /**
   * Generate escalation reasons based on confidence analysis
   */
  private getEscalationReasons(
    score: number, 
    threshold: number, 
    factors: ConfidenceFactors, 
    goal: ConversationGoalType
  ): string[] {
    const reasons: string[] = [];
    
    if (score < threshold) {
      reasons.push(`Confiança baixa: ${(score * 100).toFixed(1)}% (mínimo: ${(threshold * 100).toFixed(1)}%)`);
    }
    
    if (factors.genericPhrasesPenalty < -0.1) {
      reasons.push('Resposta contém muitas frases genéricas');
    }
    
    if (factors.responseLength < -0.2) {
      reasons.push('Resposta muito curta ou inadequada');
    }
    
    if (factors.questionHandlingBonus < -0.05) {
      reasons.push('Pergunta do cliente não foi adequadamente respondida');
    }
    
    if (factors.goalSpecificBonus === 0 && goal !== 'custom') {
      reasons.push(`Resposta não alinhada com objetivo ${goal}`);
    }
    
    if (factors.languageQualityBonus < -0.05) {
      reasons.push('Problemas na qualidade da linguagem');
    }
    
    return reasons;
  }

  /**
   * Get confidence threshold for specific goal
   */
  getConfidenceThreshold(goal: ConversationGoalType): number {
    return this.goalThresholds[goal] || this.baseConfidenceThreshold;
  }

  /**
   * Update confidence threshold for a specific goal
   */
  updateConfidenceThreshold(goal: ConversationGoalType, threshold: number): void {
    if (threshold >= 0 && threshold <= 1) {
      this.goalThresholds[goal] = threshold;
      this.logger.log(`Updated confidence threshold for ${goal}: ${threshold}`);
    } else {
      throw new Error('Confidence threshold must be between 0 and 1');
    }
  }

  /**
   * Get confidence statistics for analysis
   */
  getConfidenceStatistics(scores: number[]): {
    average: number;
    median: number;
    min: number;
    max: number;
    belowThreshold: number;
    distribution: { range: string; count: number }[];
  } {
    if (scores.length === 0) {
      return {
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        belowThreshold: 0,
        distribution: []
      };
    }

    const sorted = [...scores].sort((a, b) => a - b);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const belowThreshold = scores.filter(score => score < this.baseConfidenceThreshold).length;

    // Create distribution buckets
    const buckets = [
      { range: '0.0-0.2', min: 0.0, max: 0.2, count: 0 },
      { range: '0.2-0.4', min: 0.2, max: 0.4, count: 0 },
      { range: '0.4-0.6', min: 0.4, max: 0.6, count: 0 },
      { range: '0.6-0.8', min: 0.6, max: 0.8, count: 0 },
      { range: '0.8-1.0', min: 0.8, max: 1.0, count: 0 }
    ];

    for (const score of scores) {
      for (const bucket of buckets) {
        if (score >= bucket.min && score < bucket.max) {
          bucket.count++;
          break;
        }
      }
    }

    return {
      average,
      median,
      min,
      max,
      belowThreshold,
      distribution: buckets.map(b => ({ range: b.range, count: b.count }))
    };
  }
}