import { Test, TestingModule } from '@nestjs/testing';
import { ConfidenceScoringService } from './confidence-scoring.service';
import { IncomingMessage } from '../interfaces/ai.interface';
import { ConversationGoalType } from '../../database/schema';

describe('ConfidenceScoringService', () => {
  let service: ConfidenceScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfidenceScoringService],
    }).compile();

    service = module.get<ConfidenceScoringService>(ConfidenceScoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateConfidence', () => {
    const mockMessage: IncomingMessage = {
      content: 'Qual é o preço do produto X?',
      customerPhone: '+5511999999999',
      messageId: 'msg_123'
    };

    it('should calculate confidence for helpful goal', () => {
      const response = 'O produto X custa R$ 99,90 e está disponível em nosso estoque. É um excelente produto com ótima qualidade.';
      
      const analysis = service.calculateConfidence(
        mockMessage,
        response,
        'helpful'
      );

      expect(analysis.score).toBeGreaterThan(0.7);
      expect(analysis.shouldEscalate).toBe(false);
      expect(analysis.reasoning.some(r => r.includes('Resposta tem comprimento adequado'))).toBe(true);
      expect(analysis.factors.responseLength).toBeGreaterThan(0);
    });

    it('should penalize very short responses', () => {
      const shortResponse = 'Sim.';
      
      const analysis = service.calculateConfidence(
        mockMessage,
        shortResponse,
        'helpful'
      );

      expect(analysis.score).toBeLessThan(0.8);
      expect(analysis.factors.responseLength).toBeLessThan(0);
      // Check if escalation reasons include short response penalty
      if (analysis.score < 0.7) {
        expect(analysis.shouldEscalate).toBe(true);
        expect(analysis.escalationReasons).toContain('Resposta muito curta ou inadequada');
      }
    });

    it('should penalize generic phrases', () => {
      const genericResponse = 'Desculpe, não sei responder sua pergunta. Não tenho informações sobre isso.';
      
      const analysis = service.calculateConfidence(
        mockMessage,
        genericResponse,
        'helpful'
      );

      expect(analysis.factors.genericPhrasesPenalty).toBeLessThan(0);
      expect(analysis.escalationReasons).toContain('Resposta contém muitas frases genéricas');
    });

    it('should give bonus for deal_closer goal with sales language', () => {
      const salesResponse = 'O produto X está com 20% de desconto! Custa apenas R$ 79,90. É uma oferta especial que termina hoje. Quer comprar agora?';
      
      const analysis = service.calculateConfidence(
        mockMessage,
        salesResponse,
        'deal_closer'
      );

      expect(analysis.factors.goalSpecificBonus).toBeGreaterThan(0);
      expect(analysis.score).toBeGreaterThan(0.8);
    });

    it('should give bonus for support_agent goal with problem-solving language', () => {
      const supportMessage: IncomingMessage = {
        content: 'Estou com problema no produto',
        customerPhone: '+5511999999999'
      };
      
      const supportResponse = 'Entendo seu problema. Vou ajudar você a resolver isso. Primeiro, vamos verificar se o produto está configurado corretamente. Siga estes passos: 1. Verifique a conexão...';
      
      const analysis = service.calculateConfidence(
        supportMessage,
        supportResponse,
        'support_agent'
      );

      expect(analysis.factors.goalSpecificBonus).toBeGreaterThan(0);
      expect(analysis.score).toBeGreaterThan(0.8);
    });

    it('should give bonus for lead_generator goal with questions', () => {
      const leadResponse = 'Interessante! Para te ajudar melhor, qual é o seu orçamento disponível? E quando você precisa do produto?';
      
      const analysis = service.calculateConfidence(
        mockMessage,
        leadResponse,
        'lead_generator'
      );

      expect(analysis.factors.goalSpecificBonus).toBeGreaterThan(0);
      expect(analysis.score).toBeGreaterThan(0.8);
    });

    it('should handle product mentions correctly', () => {
      const response = 'Temos o produto X disponível por R$ 99,90. Também recomendo o produto Y que complementa bem.';
      
      const analysis = service.calculateConfidence(
        mockMessage,
        response,
        'helpful',
        {
          hasProductMentions: true,
          productRecommendations: [
            { id: '1', name: 'Produto X', price: 99.90 },
            { id: '2', name: 'Produto Y', price: 149.90 }
          ]
        }
      );

      expect(analysis.factors.productMentionBonus).toBeGreaterThan(0);
    });

    it('should analyze question handling correctly', () => {
      const questionMessage: IncomingMessage = {
        content: 'Como funciona a entrega?',
        customerPhone: '+5511999999999'
      };
      
      const goodResponse = 'A entrega funciona assim: fazemos o envio em até 2 dias úteis após a confirmação do pagamento.';
      const badResponse = 'Obrigado pelo contato!';
      
      const goodAnalysis = service.calculateConfidence(questionMessage, goodResponse, 'helpful');
      const badAnalysis = service.calculateConfidence(questionMessage, badResponse, 'helpful');

      expect(goodAnalysis.factors.questionHandlingBonus).toBeGreaterThan(0);
      expect(badAnalysis.factors.questionHandlingBonus).toBeLessThan(0);
    });

    it('should consider conversation history for context relevance', () => {
      const response = 'Como mencionei anteriormente, o produto tem garantia de 1 ano.';
      
      const analysis = service.calculateConfidence(
        mockMessage,
        response,
        'helpful',
        {
          conversationHistory: [
            { content: 'Qual a garantia do produto?', type: 'incoming', isAI: false, timestamp: new Date() },
            { content: 'O produto tem garantia de 1 ano', type: 'outgoing', isAI: true, timestamp: new Date() }
          ]
        }
      );

      expect(analysis.factors.contextRelevanceBonus).toBeGreaterThan(0);
    });

    it('should analyze language quality', () => {
      const goodResponse = 'Olá! O produto X está disponível por R$ 99,90. Posso ajudar com mais informações?';
      const poorResponse = 'produto produto produto disponível disponível r$ r$ r$';
      
      const goodAnalysis = service.calculateConfidence(mockMessage, goodResponse, 'helpful');
      const poorAnalysis = service.calculateConfidence(mockMessage, poorResponse, 'helpful');

      expect(goodAnalysis.factors.languageQualityBonus).toBeGreaterThanOrEqual(0);
      expect(poorAnalysis.factors.languageQualityBonus).toBeLessThan(0);
    });
  });

  describe('getConfidenceThreshold', () => {
    it('should return correct thresholds for different goals', () => {
      expect(service.getConfidenceThreshold('helpful')).toBe(0.70);
      expect(service.getConfidenceThreshold('deal_closer')).toBe(0.75);
      expect(service.getConfidenceThreshold('support_agent')).toBe(0.80);
      expect(service.getConfidenceThreshold('lead_generator')).toBe(0.65);
      expect(service.getConfidenceThreshold('custom')).toBe(0.75);
    });
  });

  describe('updateConfidenceThreshold', () => {
    it('should update threshold for a goal', () => {
      service.updateConfidenceThreshold('helpful', 0.85);
      expect(service.getConfidenceThreshold('helpful')).toBe(0.85);
    });

    it('should throw error for invalid threshold', () => {
      expect(() => {
        service.updateConfidenceThreshold('helpful', 1.5);
      }).toThrow('Confidence threshold must be between 0 and 1');

      expect(() => {
        service.updateConfidenceThreshold('helpful', -0.1);
      }).toThrow('Confidence threshold must be between 0 and 1');
    });
  });

  describe('getConfidenceStatistics', () => {
    it('should calculate statistics correctly', () => {
      const scores = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
      const stats = service.getConfidenceStatistics(scores);

      expect(stats.average).toBeCloseTo(0.5);
      expect(stats.median).toBe(0.5);
      expect(stats.min).toBe(0.1);
      expect(stats.max).toBe(0.9);
      expect(stats.belowThreshold).toBe(7); // Below base threshold of 0.75
      expect(stats.distribution).toHaveLength(5);
    });

    it('should handle empty scores array', () => {
      const stats = service.getConfidenceStatistics([]);
      
      expect(stats.average).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.belowThreshold).toBe(0);
      expect(stats.distribution).toEqual([]);
    });

    it('should create correct distribution buckets', () => {
      const scores = [0.1, 0.3, 0.5, 0.7, 0.9];
      const stats = service.getConfidenceStatistics(scores);

      expect(stats.distribution[0]).toEqual({ range: '0.0-0.2', count: 1 });
      expect(stats.distribution[1]).toEqual({ range: '0.2-0.4', count: 1 });
      expect(stats.distribution[2]).toEqual({ range: '0.4-0.6', count: 1 });
      expect(stats.distribution[3]).toEqual({ range: '0.6-0.8', count: 1 });
      expect(stats.distribution[4]).toEqual({ range: '0.8-1.0', count: 1 });
    });
  });

  describe('edge cases', () => {
    it('should handle empty message content', () => {
      const emptyMessage: IncomingMessage = {
        content: '',
        customerPhone: '+5511999999999'
      };
      
      const analysis = service.calculateConfidence(
        emptyMessage,
        'Olá! Como posso ajudar?',
        'helpful'
      );

      expect(analysis.score).toBeGreaterThan(0);
      expect(analysis.shouldEscalate).toBeDefined();
    });

    it('should handle very long responses', () => {
      const longResponse = 'A'.repeat(2000);
      
      const analysis = service.calculateConfidence(
        { content: 'Teste', customerPhone: '+5511999999999' },
        longResponse,
        'helpful'
      );

      expect(analysis.factors.responseLength).toBeLessThanOrEqual(0);
    });

    it('should handle responses with no sentences', () => {
      const noSentenceResponse = 'produto disponível estoque preço';
      
      const analysis = service.calculateConfidence(
        { content: 'Teste', customerPhone: '+5511999999999' },
        noSentenceResponse,
        'helpful'
      );

      expect(analysis.factors.languageQualityBonus).toBeLessThanOrEqual(0.05);
    });
  });

  describe('goal-specific analysis', () => {
    const testMessage: IncomingMessage = {
      content: 'Preciso de ajuda com o produto',
      customerPhone: '+5511999999999'
    };

    it('should analyze deal_closer responses correctly', () => {
      const dealResponse = 'Temos uma promoção especial! O produto está com 30% de desconto. Quer aproveitar essa oportunidade única?';
      
      const analysis = service.calculateConfidence(testMessage, dealResponse, 'deal_closer');
      
      expect(analysis.factors.goalSpecificBonus).toBeGreaterThan(0);
    });

    it('should analyze support_agent responses correctly', () => {
      const supportResponse = 'Vou ajudar você a resolver esse problema. Primeiro, vamos diagnosticar a situação. Pode me informar exatamente o que está acontecendo?';
      
      const analysis = service.calculateConfidence(testMessage, supportResponse, 'support_agent');
      
      expect(analysis.factors.goalSpecificBonus).toBeGreaterThan(0);
    });

    it('should analyze lead_generator responses correctly', () => {
      const leadResponse = 'Entendi sua necessidade! Para te ajudar melhor, qual é o seu orçamento? E quando você precisa do produto?';
      
      const analysis = service.calculateConfidence(testMessage, leadResponse, 'lead_generator');
      
      expect(analysis.factors.goalSpecificBonus).toBeGreaterThan(0);
    });

    it('should analyze helpful responses correctly', () => {
      const helpfulResponse = 'Posso explicar como o produto funciona. Ele tem várias funcionalidades que podem te ajudar. Quer que eu detalhe cada uma?';
      
      const analysis = service.calculateConfidence(testMessage, helpfulResponse, 'helpful');
      
      expect(analysis.factors.goalSpecificBonus).toBeGreaterThan(0);
    });
  });
});