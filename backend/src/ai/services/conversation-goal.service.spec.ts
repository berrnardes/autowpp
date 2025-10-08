import { Test, TestingModule } from '@nestjs/testing';
import { ConversationGoalService } from './conversation-goal.service';
import { ConversationGoal, ConversationGoalType } from '../../database/schema';

describe('ConversationGoalService', () => {
  let service: ConversationGoalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationGoalService],
    }).compile();

    service = module.get<ConversationGoalService>(ConversationGoalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getGoalConfiguration', () => {
    it('should return configuration for helpful goal', () => {
      const config = service.getGoalConfiguration(ConversationGoal.HELPFUL);
      
      expect(config).toBeDefined();
      expect(config.type).toBe(ConversationGoal.HELPFUL);
      expect(config.name).toBe('Assistente Prestativo');
      expect(config.systemPrompt).toContain('prestativo e informativo');
      expect(config.behaviorInstructions).toBeInstanceOf(Array);
      expect(config.behaviorInstructions.length).toBeGreaterThan(0);
    });

    it('should return configuration for deal_closer goal', () => {
      const config = service.getGoalConfiguration(ConversationGoal.DEAL_CLOSER);
      
      expect(config).toBeDefined();
      expect(config.type).toBe(ConversationGoal.DEAL_CLOSER);
      expect(config.name).toBe('Vendedor Focado');
      expect(config.systemPrompt).toContain('vendedor experiente');
      expect(config.priorityActions).toContain('Apresentar produtos relevantes');
    });

    it('should return configuration for support_agent goal', () => {
      const config = service.getGoalConfiguration(ConversationGoal.SUPPORT_AGENT);
      
      expect(config).toBeDefined();
      expect(config.type).toBe(ConversationGoal.SUPPORT_AGENT);
      expect(config.name).toBe('Agente de Suporte');
      expect(config.systemPrompt).toContain('suporte técnico');
      expect(config.responseStyle.formality).toBe('formal');
    });

    it('should return configuration for lead_generator goal', () => {
      const config = service.getGoalConfiguration(ConversationGoal.LEAD_GENERATOR);
      
      expect(config).toBeDefined();
      expect(config.type).toBe(ConversationGoal.LEAD_GENERATOR);
      expect(config.name).toBe('Gerador de Leads');
      expect(config.systemPrompt).toContain('geração de leads');
      expect(config.priorityActions).toContain('Coletar informações de contato');
    });

    it('should return helpful configuration for invalid goal type', () => {
      const config = service.getGoalConfiguration('invalid_goal' as ConversationGoalType);
      
      expect(config).toBeDefined();
      expect(config.type).toBe(ConversationGoal.HELPFUL);
    });
  });

  describe('getAllGoalConfigurations', () => {
    it('should return all goal configurations', () => {
      const configs = service.getAllGoalConfigurations();
      
      expect(configs).toBeInstanceOf(Array);
      expect(configs.length).toBe(5); // helpful, deal_closer, support_agent, lead_generator, custom
      
      const goalTypes = configs.map(config => config.type);
      expect(goalTypes).toContain(ConversationGoal.HELPFUL);
      expect(goalTypes).toContain(ConversationGoal.DEAL_CLOSER);
      expect(goalTypes).toContain(ConversationGoal.SUPPORT_AGENT);
      expect(goalTypes).toContain(ConversationGoal.LEAD_GENERATOR);
      expect(goalTypes).toContain(ConversationGoal.CUSTOM);
    });
  });

  describe('getAvailableGoals', () => {
    it('should return simplified goal information', () => {
      const goals = service.getAvailableGoals();
      
      expect(goals).toBeInstanceOf(Array);
      expect(goals.length).toBe(5);
      
      const helpfulGoal = goals.find(goal => goal.type === ConversationGoal.HELPFUL);
      expect(helpfulGoal).toBeDefined();
      expect(helpfulGoal!.name).toBe('Assistente Prestativo');
      expect(helpfulGoal!.description).toContain('útil e informativo');
    });
  });

  describe('updateCustomGoalConfiguration', () => {
    it('should update custom goal configuration', () => {
      const customPrompt = 'Você é um assistente personalizado para vendas de carros.';
      const customInstructions = [
        'Sempre mencione características técnicas',
        'Foque em benefícios de segurança',
        'Ofereça test drive'
      ];
      const customStyle = {
        tone: 'entusiasmado',
        length: 'detailed' as const,
        emojiUsage: 'frequent' as const,
        formality: 'casual' as const
      };

      service.updateCustomGoalConfiguration(customPrompt, customInstructions, customStyle);
      
      const updatedConfig = service.getGoalConfiguration(ConversationGoal.CUSTOM);
      
      expect(updatedConfig.systemPrompt).toBe(customPrompt);
      expect(updatedConfig.behaviorInstructions).toEqual(customInstructions);
      expect(updatedConfig.responseStyle.tone).toBe('entusiasmado');
      expect(updatedConfig.responseStyle.length).toBe('detailed');
      expect(updatedConfig.responseStyle.emojiUsage).toBe('frequent');
      expect(updatedConfig.responseStyle.formality).toBe('casual');
    });
  });

  describe('generateContextualPrompt', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Smartphone XYZ',
        description: 'Smartphone com câmera de alta qualidade',
        price: 899.99,
        currency: 'BRL',
        inStock: true
      },
      {
        id: '2',
        name: 'Notebook ABC',
        description: 'Notebook para trabalho e estudos',
        price: 2499.99,
        currency: 'BRL',
        inStock: true
      }
    ];

    it('should generate contextual prompt for helpful goal', () => {
      const prompt = service.generateContextualPrompt(
        ConversationGoal.HELPFUL,
        mockProducts,
        'Loja de eletrônicos com foco em qualidade'
      );
      
      expect(prompt).toContain('prestativo e informativo');
      expect(prompt).toContain('Smartphone XYZ');
      expect(prompt).toContain('Notebook ABC');
      expect(prompt).toContain('Loja de eletrônicos');
      expect(prompt).toContain('INSTRUÇÕES COMPORTAMENTAIS');
      expect(prompt).toContain('ESTILO DE RESPOSTA');
    });

    it('should generate contextual prompt for deal_closer goal', () => {
      const prompt = service.generateContextualPrompt(
        ConversationGoal.DEAL_CLOSER,
        mockProducts
      );
      
      expect(prompt).toContain('vendedor experiente');
      expect(prompt).toContain('converter conversas em vendas');
      expect(prompt).toContain('R$ 899.99');
      expect(prompt).toContain('persuasivo e confiante');
    });

    it('should handle empty products list', () => {
      const prompt = service.generateContextualPrompt(
        ConversationGoal.HELPFUL,
        []
      );
      
      expect(prompt).toContain('prestativo e informativo');
      expect(prompt).not.toContain('PRODUTOS DISPONÍVEIS');
    });

    it('should limit products to 10 items', () => {
      const manyProducts = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Produto ${i + 1}`,
        description: `Descrição do produto ${i + 1}`,
        price: 100 + i,
        currency: 'BRL',
        inStock: true
      }));

      const prompt = service.generateContextualPrompt(
        ConversationGoal.HELPFUL,
        manyProducts
      );
      
      // Should contain first 10 products
      expect(prompt).toContain('Produto 1');
      expect(prompt).toContain('Produto 10');
      // Should not contain products beyond 10
      expect(prompt).not.toContain('Produto 11');
      expect(prompt).not.toContain('Produto 15');
    });
  });

  describe('shouldEscalate', () => {
    it('should escalate for low confidence', () => {
      const shouldEscalate = service.shouldEscalate(
        ConversationGoal.HELPFUL,
        'Preciso de ajuda com meu pedido',
        0.6 // Low confidence
      );
      
      expect(shouldEscalate).toBe(true);
    });

    it('should not escalate for high confidence and normal message', () => {
      const shouldEscalate = service.shouldEscalate(
        ConversationGoal.HELPFUL,
        'Qual o preço do smartphone?',
        0.9 // High confidence
      );
      
      expect(shouldEscalate).toBe(false);
    });

    it('should escalate for support agent with complex technical problem', () => {
      const shouldEscalate = service.shouldEscalate(
        ConversationGoal.SUPPORT_AGENT,
        'Problemas técnicos complexos com o sistema',
        0.8 // Good confidence but complex issue
      );
      
      expect(shouldEscalate).toBe(true);
    });

    it('should escalate for deal closer with serious complaint', () => {
      const shouldEscalate = service.shouldEscalate(
        ConversationGoal.DEAL_CLOSER,
        'Tenho uma reclamação séria sobre o produto',
        0.8
      );
      
      expect(shouldEscalate).toBe(true);
    });
  });

  describe('getGoalSpecificMetrics', () => {
    it('should return correct metrics for deal_closer goal', () => {
      const metrics = service.getGoalSpecificMetrics(ConversationGoal.DEAL_CLOSER);
      
      expect(metrics).toContain('conversion_rate');
      expect(metrics).toContain('sales_generated');
      expect(metrics).toContain('average_order_value');
      expect(metrics).toContain('objections_handled');
    });

    it('should return correct metrics for support_agent goal', () => {
      const metrics = service.getGoalSpecificMetrics(ConversationGoal.SUPPORT_AGENT);
      
      expect(metrics).toContain('resolution_rate');
      expect(metrics).toContain('first_contact_resolution');
      expect(metrics).toContain('customer_satisfaction');
      expect(metrics).toContain('escalation_rate');
    });

    it('should return correct metrics for lead_generator goal', () => {
      const metrics = service.getGoalSpecificMetrics(ConversationGoal.LEAD_GENERATOR);
      
      expect(metrics).toContain('leads_qualified');
      expect(metrics).toContain('contact_info_collected');
      expect(metrics).toContain('follow_ups_scheduled');
      expect(metrics).toContain('lead_quality_score');
    });

    it('should return correct metrics for helpful goal', () => {
      const metrics = service.getGoalSpecificMetrics(ConversationGoal.HELPFUL);
      
      expect(metrics).toContain('information_accuracy');
      expect(metrics).toContain('customer_satisfaction');
      expect(metrics).toContain('problem_resolution');
      expect(metrics).toContain('helpfulness_rating');
    });

    it('should return default metrics for custom goal', () => {
      const metrics = service.getGoalSpecificMetrics(ConversationGoal.CUSTOM);
      
      expect(metrics).toContain('response_quality');
      expect(metrics).toContain('customer_engagement');
      expect(metrics).toContain('goal_achievement');
    });
  });
});