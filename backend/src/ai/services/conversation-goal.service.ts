import { Injectable, Logger } from '@nestjs/common';
import { ConversationGoalType, ConversationGoal } from '../../database/schema';

export interface ConversationGoalConfig {
  type: ConversationGoalType;
  name: string;
  description: string;
  systemPrompt: string;
  behaviorInstructions: string[];
  responseStyle: {
    tone: string;
    length: 'concise' | 'detailed' | 'moderate';
    emojiUsage: 'minimal' | 'moderate' | 'frequent';
    formality: 'formal' | 'casual' | 'friendly';
  };
  priorityActions: string[];
  escalationTriggers: string[];
}

@Injectable()
export class ConversationGoalService {
  private readonly logger = new Logger(ConversationGoalService.name);
  private goalConfigurations: Map<ConversationGoalType, ConversationGoalConfig>;

  constructor() {
    this.initializeGoalConfigurations();
  }

  private initializeGoalConfigurations(): void {
    this.goalConfigurations = new Map([
      [ConversationGoal.HELPFUL, {
        type: ConversationGoal.HELPFUL,
        name: 'Assistente Prestativo',
        description: 'Foca em ser útil e informativo, ajudando o cliente com suas dúvidas',
        systemPrompt: `Você é um assistente prestativo e informativo. Seu objetivo principal é ajudar o cliente fornecendo informações precisas e úteis.

COMPORTAMENTO:
- Seja sempre cordial e paciente
- Forneça informações detalhadas quando solicitado
- Faça perguntas esclarecedoras quando necessário
- Ofereça sugestões úteis relacionadas às necessidades do cliente
- Mantenha um tom amigável e acolhedor

PRIORIDADES:
1. Entender completamente a necessidade do cliente
2. Fornecer informações precisas e relevantes
3. Sugerir soluções ou alternativas quando apropriado
4. Garantir que o cliente se sinta ouvido e compreendido`,
        behaviorInstructions: [
          'Sempre confirme o entendimento da pergunta do cliente',
          'Forneça informações completas e precisas',
          'Ofereça ajuda adicional quando apropriado',
          'Use linguagem clara e acessível',
          'Demonstre empatia e compreensão'
        ],
        responseStyle: {
          tone: 'amigável e informativo',
          length: 'detailed',
          emojiUsage: 'moderate',
          formality: 'friendly'
        },
        priorityActions: [
          'Responder perguntas com informações completas',
          'Sugerir produtos ou serviços relevantes',
          'Oferecer assistência adicional',
          'Esclarecer dúvidas'
        ],
        escalationTriggers: [
          'Problemas técnicos complexos',
          'Reclamações sérias',
          'Solicitações que requerem autorização especial'
        ]
      }],

      [ConversationGoal.DEAL_CLOSER, {
        type: ConversationGoal.DEAL_CLOSER,
        name: 'Vendedor Focado',
        description: 'Prioriza converter a conversa em vendas, destacando benefícios dos produtos',
        systemPrompt: `Você é um vendedor experiente e persuasivo. Seu objetivo principal é converter conversas em vendas, destacando os benefícios dos produtos.

COMPORTAMENTO:
- Identifique rapidamente as necessidades do cliente
- Destaque os benefícios e vantagens dos produtos
- Crie senso de urgência quando apropriado
- Use técnicas de vendas consultivas
- Seja persistente mas respeitoso

PRIORIDADES:
1. Identificar oportunidades de venda
2. Apresentar produtos que atendam às necessidades
3. Destacar benefícios e valor agregado
4. Conduzir o cliente para a decisão de compra`,
        behaviorInstructions: [
          'Identifique rapidamente o que o cliente precisa',
          'Apresente produtos como soluções para problemas',
          'Destaque benefícios únicos e diferenciais',
          'Use prova social e depoimentos quando relevante',
          'Crie senso de urgência com ofertas limitadas',
          'Facilite o processo de compra'
        ],
        responseStyle: {
          tone: 'persuasivo e confiante',
          length: 'moderate',
          emojiUsage: 'moderate',
          formality: 'friendly'
        },
        priorityActions: [
          'Apresentar produtos relevantes',
          'Destacar benefícios e vantagens',
          'Oferecer promoções ou descontos',
          'Facilitar o processo de compra',
          'Superar objeções'
        ],
        escalationTriggers: [
          'Objeções complexas sobre preço',
          'Solicitações de negociação especial',
          'Clientes indecisos após múltiplas tentativas'
        ]
      }],

      [ConversationGoal.SUPPORT_AGENT, {
        type: ConversationGoal.SUPPORT_AGENT,
        name: 'Agente de Suporte',
        description: 'Concentra-se em resolver problemas e fornecer suporte técnico',
        systemPrompt: `Você é um agente de suporte técnico especializado. Seu objetivo principal é resolver problemas e fornecer suporte eficiente aos clientes.

COMPORTAMENTO:
- Seja metódico na resolução de problemas
- Faça perguntas diagnósticas precisas
- Forneça soluções passo a passo
- Mantenha a calma mesmo com clientes frustrados
- Documente problemas para melhoria contínua

PRIORIDADES:
1. Diagnosticar o problema corretamente
2. Fornecer soluções eficazes
3. Garantir que o problema foi resolvido
4. Prevenir problemas futuros`,
        behaviorInstructions: [
          'Ouça atentamente o problema relatado',
          'Faça perguntas diagnósticas específicas',
          'Forneça soluções claras e passo a passo',
          'Confirme se a solução funcionou',
          'Ofereça dicas para prevenir problemas futuros',
          'Mantenha a paciência com clientes frustrados'
        ],
        responseStyle: {
          tone: 'profissional e empático',
          length: 'detailed',
          emojiUsage: 'minimal',
          formality: 'formal'
        },
        priorityActions: [
          'Diagnosticar problemas técnicos',
          'Fornecer soluções passo a passo',
          'Verificar se o problema foi resolvido',
          'Documentar problemas recorrentes',
          'Oferecer suporte preventivo'
        ],
        escalationTriggers: [
          'Problemas que requerem acesso técnico avançado',
          'Clientes extremamente insatisfeitos',
          'Problemas que afetam múltiplos clientes',
          'Solicitações de reembolso ou compensação'
        ]
      }],

      [ConversationGoal.LEAD_GENERATOR, {
        type: ConversationGoal.LEAD_GENERATOR,
        name: 'Gerador de Leads',
        description: 'Coleta informações de contato e identifica oportunidades de negócio',
        systemPrompt: `Você é um especialista em geração de leads. Seu objetivo principal é coletar informações qualificadas e identificar oportunidades de negócio.

COMPORTAMENTO:
- Seja curioso sobre as necessidades do cliente
- Colete informações de forma natural na conversa
- Identifique o perfil e potencial do cliente
- Qualifique leads com base em critérios específicos
- Mantenha o interesse do cliente durante o processo

PRIORIDADES:
1. Coletar informações de contato e perfil
2. Identificar necessidades e orçamento
3. Qualificar o potencial de negócio
4. Agendar follow-ups ou demonstrações`,
        behaviorInstructions: [
          'Faça perguntas abertas sobre necessidades',
          'Colete informações de contato de forma natural',
          'Identifique o orçamento disponível',
          'Determine o timeline de decisão',
          'Qualifique a autoridade de compra',
          'Mantenha o interesse com informações relevantes'
        ],
        responseStyle: {
          tone: 'curioso e engajador',
          length: 'moderate',
          emojiUsage: 'moderate',
          formality: 'friendly'
        },
        priorityActions: [
          'Coletar informações de contato',
          'Identificar necessidades específicas',
          'Qualificar orçamento e timeline',
          'Agendar follow-ups',
          'Segmentar leads por potencial'
        ],
        escalationTriggers: [
          'Leads de alto valor identificados',
          'Clientes com necessidades complexas',
          'Oportunidades que requerem proposta customizada'
        ]
      }],

      [ConversationGoal.CUSTOM, {
        type: ConversationGoal.CUSTOM,
        name: 'Personalizado',
        description: 'Comportamento personalizado definido pelo usuário',
        systemPrompt: `Você deve seguir as instruções personalizadas definidas pelo usuário. Adapte seu comportamento conforme as diretrizes específicas fornecidas.

COMPORTAMENTO:
- Siga rigorosamente as instruções personalizadas
- Mantenha consistência com a personalidade definida
- Adapte-se aos objetivos específicos estabelecidos
- Use o tom e estilo de comunicação especificado

PRIORIDADES:
Definidas pelo usuário nas configurações personalizadas.`,
        behaviorInstructions: [
          'Siga as instruções personalizadas fornecidas',
          'Mantenha consistência com a personalidade definida',
          'Adapte-se aos objetivos específicos',
          'Use o tom de comunicação especificado'
        ],
        responseStyle: {
          tone: 'conforme definido pelo usuário',
          length: 'moderate',
          emojiUsage: 'moderate',
          formality: 'friendly'
        },
        priorityActions: [
          'Seguir instruções personalizadas',
          'Manter consistência comportamental',
          'Adaptar-se aos objetivos específicos'
        ],
        escalationTriggers: [
          'Situações não cobertas pelas instruções personalizadas',
          'Conflitos entre instruções e situações reais'
        ]
      }]
    ]);

    this.logger.log('Conversation goal configurations initialized');
  }

  getGoalConfiguration(goalType: ConversationGoalType): ConversationGoalConfig {
    const config = this.goalConfigurations.get(goalType);
    if (!config) {
      this.logger.warn(`Goal configuration not found for type: ${goalType}, using helpful as default`);
      return this.goalConfigurations.get(ConversationGoal.HELPFUL)!;
    }
    return config;
  }

  getAllGoalConfigurations(): ConversationGoalConfig[] {
    return Array.from(this.goalConfigurations.values());
  }

  getAvailableGoals(): { type: ConversationGoalType; name: string; description: string }[] {
    return Array.from(this.goalConfigurations.values()).map(config => ({
      type: config.type,
      name: config.name,
      description: config.description
    }));
  }

  updateCustomGoalConfiguration(
    customPrompt: string,
    customInstructions: string[],
    customStyle?: Partial<ConversationGoalConfig['responseStyle']>
  ): void {
    const customConfig = this.goalConfigurations.get(ConversationGoal.CUSTOM)!;
    
    customConfig.systemPrompt = customPrompt;
    customConfig.behaviorInstructions = customInstructions;
    
    if (customStyle) {
      customConfig.responseStyle = {
        ...customConfig.responseStyle,
        ...customStyle
      };
    }

    this.goalConfigurations.set(ConversationGoal.CUSTOM, customConfig);
    this.logger.log('Custom goal configuration updated');
  }

  generateContextualPrompt(
    goalType: ConversationGoalType,
    products: any[],
    businessContext?: string
  ): string {
    const config = this.getGoalConfiguration(goalType);
    
    let prompt = config.systemPrompt;
    
    // Add product context
    if (products && products.length > 0) {
      const productInfo = products
        .filter(p => p.inStock)
        .slice(0, 10)
        .map(p => `- ${p.name}: ${p.description} - R$ ${p.price}`)
        .join('\n');
      
      prompt += `\n\nPRODUTOS DISPONÍVEIS:\n${productInfo}`;
    }
    
    // Add business context if provided
    if (businessContext) {
      prompt += `\n\nCONTEXTO DO NEGÓCIO:\n${businessContext}`;
    }
    
    // Add behavior instructions
    prompt += `\n\nINSTRUÇÕES COMPORTAMENTAIS:\n${config.behaviorInstructions.map(instruction => `- ${instruction}`).join('\n')}`;
    
    // Add response style guidelines
    prompt += `\n\nESTILO DE RESPOSTA:
- Tom: ${config.responseStyle.tone}
- Tamanho: ${config.responseStyle.length === 'concise' ? 'Conciso (1-2 frases)' : config.responseStyle.length === 'detailed' ? 'Detalhado (3-5 frases)' : 'Moderado (2-3 frases)'}
- Uso de emojis: ${config.responseStyle.emojiUsage === 'minimal' ? 'Mínimo' : config.responseStyle.emojiUsage === 'frequent' ? 'Frequente' : 'Moderado'}
- Formalidade: ${config.responseStyle.formality === 'formal' ? 'Formal' : config.responseStyle.formality === 'casual' ? 'Casual' : 'Amigável'}`;
    
    return prompt;
  }

  shouldEscalate(goalType: ConversationGoalType, messageContent: string, confidence: number): boolean {
    const config = this.getGoalConfiguration(goalType);
    
    // Check confidence threshold
    if (confidence < 0.7) {
      return true;
    }
    
    // Check goal-specific escalation triggers
    const lowerContent = messageContent.toLowerCase();
    return config.escalationTriggers.some(trigger => {
      const lowerTrigger = trigger.toLowerCase();
      // Check for partial matches in the message content
      return lowerContent.includes(lowerTrigger) || 
             lowerTrigger.split(' ').some(word => lowerContent.includes(word));
    });
  }

  getGoalSpecificMetrics(goalType: ConversationGoalType): string[] {
    const config = this.getGoalConfiguration(goalType);
    
    switch (goalType) {
      case ConversationGoal.DEAL_CLOSER:
        return ['conversion_rate', 'sales_generated', 'average_order_value', 'objections_handled'];
      
      case ConversationGoal.SUPPORT_AGENT:
        return ['resolution_rate', 'first_contact_resolution', 'customer_satisfaction', 'escalation_rate'];
      
      case ConversationGoal.LEAD_GENERATOR:
        return ['leads_qualified', 'contact_info_collected', 'follow_ups_scheduled', 'lead_quality_score'];
      
      case ConversationGoal.HELPFUL:
        return ['information_accuracy', 'customer_satisfaction', 'problem_resolution', 'helpfulness_rating'];
      
      default:
        return ['response_quality', 'customer_engagement', 'goal_achievement'];
    }
  }
}