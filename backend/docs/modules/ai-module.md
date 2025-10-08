# AI Module - Módulo de Inteligência Artificial

O AI Module é o coração da plataforma, responsável por processar mensagens dos clientes e gerar respostas inteligentes usando LangChain e OpenAI.

## 📁 Estrutura do Módulo

```
src/ai/
├── controllers/
│   ├── ai-product.controller.ts          # Integração IA com produtos
│   ├── conversation-goal.controller.ts   # Gerenciamento de objetivos
│   ├── conversation-training.controller.ts # Treinamento da IA
│   └── escalation.controller.ts          # Sistema de escalação
├── dto/
│   ├── conversation-example.dto.ts       # DTOs para exemplos de treinamento
│   ├── conversation-goal.dto.ts          # DTOs para objetivos
│   └── process-message.dto.ts            # DTOs para processamento
├── interfaces/
│   └── ai.interface.ts                   # Interfaces TypeScript
├── services/
│   ├── ai.service.ts                     # Serviço principal de IA
│   ├── ai-product-integration.service.ts # Integração com produtos
│   ├── confidence-scoring.service.ts     # Sistema de pontuação de confiança
│   ├── conversation-context.service.ts   # Contexto de conversas
│   ├── conversation-goal.service.ts      # Gerenciamento de objetivos
│   ├── conversation-training.service.ts  # Sistema de treinamento
│   └── escalation.service.ts             # Sistema de escalação
└── ai.module.ts                          # Módulo NestJS
```

## 🎯 Principais Funcionalidades

### 1. Processamento de Mensagens
- Análise de mensagens recebidas via WhatsApp
- Geração de respostas contextuais
- Integração com histórico de conversas
- Suporte a diferentes objetivos de conversa

### 2. Sistema de Objetivos (Goals)
Quatro tipos de objetivos configuráveis:

#### 🤝 Helpful (Prestativo)
- **Objetivo**: Fornecer ajuda e informações úteis
- **Comportamento**: Responde perguntas, oferece suporte
- **Tom**: Amigável e informativo

#### 💰 Deal Closer (Fechador de Vendas)
- **Objetivo**: Converter leads em vendas
- **Comportamento**: Foca em benefícios, cria urgência
- **Tom**: Persuasivo e orientado a resultados

#### 🛠️ Support Agent (Agente de Suporte)
- **Objetivo**: Resolver problemas e dúvidas
- **Comportamento**: Diagnóstica problemas, oferece soluções
- **Tom**: Técnico e solucionador

#### 🎯 Lead Generator (Gerador de Leads)
- **Objetivo**: Capturar informações de contato
- **Comportamento**: Qualifica prospects, coleta dados
- **Tom**: Investigativo e engajador

### 3. Sistema de Confiança e Escalação
- **Pontuação de Confiança**: Avalia qualidade das respostas (0-100)
- **Escalação Automática**: Transfere para humanos quando necessário
- **Regras Personalizáveis**: Define quando escalar conversas
- **Fila de Revisão Manual**: Gerencia conversas escaladas

### 4. Integração com Produtos
- **Recomendações Inteligentes**: Sugere produtos baseado no contexto
- **Busca Semântica**: Encontra produtos relevantes
- **Análise de Menções**: Identifica produtos mencionados
- **Formatação Contextual**: Apresenta produtos de acordo com o objetivo

### 5. Sistema de Treinamento
- **Exemplos de Conversa**: Treina IA com exemplos reais
- **Categorização**: Organiza exemplos por categoria
- **Validação**: Verifica qualidade dos dados de treinamento
- **Few-Shot Learning**: Usa exemplos para melhorar respostas

## 🔧 APIs Principais

### AI Product Controller

```typescript
// Buscar produtos por categoria
GET /ai/products/category/:category

// Recomendações de produtos
POST /ai/products/recommendations
{
  "customerMessage": "Preciso de um smartphone",
  "conversationGoal": "deal_closer",
  "maxRecommendations": 3
}

// Buscar produtos por faixa de preço
POST /ai/products/price-range
{
  "minPrice": 100,
  "maxPrice": 500
}
```

### Conversation Goal Controller

```typescript
// Definir objetivo da conversa
POST /ai/goals/set
{
  "goalType": "deal_closer"
}

// Obter configuração do objetivo
GET /ai/goals/:goalType/configuration

// Testar comportamento do objetivo
POST /ai/goals/:goalType/test
{
  "message": "Olá, preciso de ajuda",
  "products": [...]
}
```

### Conversation Training Controller

```typescript
// Criar exemplo de treinamento
POST /ai/training/examples
{
  "customerMessage": "Quanto custa este produto?",
  "desiredResponse": "Este produto custa R$ 299,90...",
  "category": "pricing"
}

// Listar exemplos
GET /ai/training/examples?category=pricing&limit=10

// Treinar modelo
POST /ai/training/train
{
  "examples": [...],
  "goalType": "deal_closer"
}
```

### Escalation Controller

```typescript
// Obter fila de revisão manual
GET /ai/escalation/manual-review?status=pending&priority=high

// Escalar conversa
POST /ai/escalation/conversations/:id/escalate
{
  "reason": "Low confidence response",
  "priority": "medium"
}

// Resolver escalação
POST /ai/escalation/events/:eventId/resolve
{
  "resolution": "Issue resolved",
  "resolvedBy": "agent@company.com"
}
```

## ⚙️ Configuração

### Variáveis de Ambiente

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=1000

# AI Configuration
AI_CONFIDENCE_THRESHOLD=70
AI_FALLBACK_MESSAGE="Desculpe, não consegui entender. Um atendente entrará em contato."

# Escalation Configuration
ESCALATION_LOW_CONFIDENCE_THRESHOLD=50
ESCALATION_CONSECUTIVE_LOW_CONFIDENCE=3
```

### Configuração de Objetivos

```typescript
// Exemplo de configuração personalizada
const customGoalConfig = {
  type: 'custom',
  name: 'Consultor Especializado',
  systemPrompt: 'Você é um consultor especializado em...',
  behaviorInstructions: [
    'Sempre pergunte sobre necessidades específicas',
    'Ofereça soluções personalizadas',
    'Mantenha tom profissional'
  ],
  responseStyle: {
    tone: 'professional',
    length: 'detailed',
    emojiUsage: 'minimal',
    formality: 'formal'
  }
};
```

## 🧠 Algoritmos de IA

### 1. Pontuação de Confiança

```typescript
interface ConfidenceFactors {
  responseLength: number;           // Penaliza respostas muito curtas/longas
  genericPhrasesPenalty: number;    // Penaliza frases genéricas
  goalSpecificBonus: number;        // Bônus por seguir objetivo
  productMentionBonus: number;      // Bônus por mencionar produtos relevantes
  questionHandlingBonus: number;    // Bônus por responder perguntas
  contextRelevanceBonus: number;    // Bônus por relevância contextual
  languageQualityBonus: number;     // Bônus por qualidade da linguagem
}
```

### 2. Recomendação de Produtos

```typescript
// Algoritmo de relevância
function calculateProductRelevanceScore(
  product: ProductInfo,
  customerMessage: string,
  conversationGoal: ConversationGoalType
): number {
  let score = 0;
  
  // Análise de palavras-chave
  const keywords = extractProductKeywords(product);
  const messageWords = customerMessage.toLowerCase().split(' ');
  
  keywords.forEach(keyword => {
    if (messageWords.includes(keyword.toLowerCase())) {
      score += 10;
    }
  });
  
  // Bônus baseado no objetivo
  switch (conversationGoal) {
    case 'deal_closer':
      score += product.inStock ? 15 : -10;
      break;
    case 'helpful':
      score += 5;
      break;
  }
  
  return Math.min(score, 100);
}
```

### 3. Sistema de Escalação

```typescript
interface EscalationRule {
  id: string;
  name: string;
  condition: {
    confidenceThreshold?: number;
    keywords?: string[];
    consecutiveLowConfidence?: number;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  autoEscalate: boolean;
}

// Regras padrão
const defaultRules: EscalationRule[] = [
  {
    id: 'low-confidence',
    name: 'Baixa Confiança',
    condition: { confidenceThreshold: 50 },
    priority: 'medium',
    autoEscalate: true
  },
  {
    id: 'complaint-keywords',
    name: 'Palavras de Reclamação',
    condition: { keywords: ['reclamação', 'problema', 'defeito'] },
    priority: 'high',
    autoEscalate: true
  }
];
```

## 📊 Métricas e Monitoramento

### Métricas de Performance
- **Taxa de Confiança Média**: Média das pontuações de confiança
- **Taxa de Escalação**: Percentual de conversas escaladas
- **Tempo de Resposta**: Tempo médio para processar mensagens
- **Acurácia de Recomendações**: Taxa de produtos recomendados corretamente

### Métricas por Objetivo
- **Deal Closer**: Taxa de conversão, valor médio de vendas
- **Support Agent**: Taxa de resolução, tempo médio de resolução
- **Lead Generator**: Taxa de captura de leads, qualidade dos leads
- **Helpful**: Satisfação do cliente, taxa de reengajamento

## 🔍 Exemplos de Uso

### Processamento de Mensagem Completo

```typescript
// Contexto da conversa
const context: ConversationContext = {
  customerPhone: '+5511999999999',
  conversationHistory: [
    {
      content: 'Olá, preciso de um smartphone',
      type: 'incoming',
      isAI: false,
      timestamp: new Date()
    }
  ],
  products: await productService.findAll(),
  conversationGoal: 'deal_closer'
};

// Mensagem recebida
const message: IncomingMessage = {
  content: 'Qual o melhor smartphone até R$ 1000?',
  customerPhone: '+5511999999999',
  timestamp: new Date()
};

// Processar mensagem
const response = await aiService.processMessage(message, context);

console.log(response);
// {
//   content: "Baseado no seu orçamento de R$ 1000, recomendo o Samsung Galaxy A54...",
//   confidence: 85,
//   shouldEscalate: false,
//   metadata: {
//     recommendedProducts: [...],
//     processingTime: 1200
//   }
// }
```

### Treinamento Personalizado

```typescript
// Exemplos de treinamento para e-commerce de eletrônicos
const trainingExamples = [
  {
    customerMessage: "Preciso de um celular bom e barato",
    desiredResponse: "Temos ótimas opções com excelente custo-benefício! O Xiaomi Redmi Note 12 por R$ 899 oferece câmera de 50MP, bateria de 5000mAh e processador Snapdragon. Gostaria de saber mais detalhes?",
    category: "product_recommendation"
  },
  {
    customerMessage: "Este produto tem garantia?",
    desiredResponse: "Sim! Todos os nossos produtos têm garantia do fabricante de 12 meses, além da nossa garantia adicional de 3 meses. Você fica totalmente protegido na sua compra!",
    category: "warranty_info"
  }
];

// Treinar modelo
await trainingService.trainModel({
  examples: trainingExamples,
  goalType: 'deal_closer'
});
```

## 🚀 Melhores Práticas

### 1. Configuração de Objetivos
- **Seja Específico**: Defina objetivos claros e mensuráveis
- **Teste Regularmente**: Valide comportamentos com mensagens reais
- **Ajuste Gradualmente**: Faça mudanças incrementais

### 2. Sistema de Confiança
- **Monitore Métricas**: Acompanhe pontuações de confiança
- **Ajuste Thresholds**: Calibre limites baseado na performance
- **Analise Escalações**: Entenda padrões de escalação

### 3. Treinamento
- **Qualidade > Quantidade**: Prefira exemplos de alta qualidade
- **Diversidade**: Inclua variações de linguagem e contexto
- **Validação Contínua**: Teste exemplos regularmente

### 4. Performance
- **Cache Inteligente**: Cache respostas para consultas similares
- **Processamento Assíncrono**: Use filas para operações pesadas
- **Monitoramento**: Implemente alertas para problemas

## 🔧 Troubleshooting

### Problemas Comuns

#### Baixa Confiança nas Respostas
```typescript
// Verificar configuração
const config = await aiService.getConfig();
console.log('Threshold atual:', config.confidenceThreshold);

// Analisar fatores de confiança
const analysis = await confidenceScoringService.calculateConfidence(
  message, response, goal, context
);
console.log('Fatores:', analysis.factors);
```

#### Escalações Excessivas
```typescript
// Verificar regras de escalação
const rules = await escalationService.getEscalationRules();
console.log('Regras ativas:', rules.filter(r => r.autoEscalate));

// Ajustar thresholds
await escalationService.updateConfidenceThreshold('deal_closer', 60);
```

#### Performance Lenta
```typescript
// Monitorar tempo de processamento
const startTime = Date.now();
const response = await aiService.processMessage(message, context);
const processingTime = Date.now() - startTime;

if (processingTime > 3000) {
  console.warn('Processamento lento:', processingTime + 'ms');
}
```

O AI Module é fundamental para o sucesso da plataforma, fornecendo inteligência contextual e adaptável para automação de conversas no WhatsApp.