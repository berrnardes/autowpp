# Database Module - Módulo de Banco de Dados

O Database Module é responsável pela configuração, conexão e gerenciamento do banco de dados PostgreSQL usando Drizzle ORM, incluindo migrações, seeding e monitoramento de saúde.

## 📁 Estrutura do Módulo

```
src/database/
├── config.ts                            # Configuração do banco
├── database.module.ts                   # Módulo NestJS
├── database.service.ts                  # Serviço principal
├── health-check.ts                      # Verificação de saúde
├── schema.ts                            # Schema Drizzle
├── connection.ts                        # Configuração de conexão
├── migrations/                          # Migrações SQL
│   ├── 0000_magical_khan.sql
│   ├── 0001_mixed_argent.sql
│   └── meta/
│       ├── _journal.json
│       ├── 0000_snapshot.json
│       └── 0001_snapshot.json
└── seeds/                               # Scripts de seeding
    ├── index.ts
    └── initial-ai-config.seed.ts
```

## 🎯 Principais Funcionalidades

### 1. Gerenciamento de Conexão
- **Pool de Conexões**: Gerenciamento eficiente de conexões
- **Reconnection**: Reconexão automática em caso de falha
- **Health Monitoring**: Monitoramento contínuo da saúde
- **Connection Pooling**: Otimização de recursos

### 2. Schema Management
- **Drizzle ORM**: Schema type-safe com TypeScript
- **Relações**: Definição de relacionamentos entre tabelas
- **Validações**: Constraints e validações no nível do banco
- **Índices**: Otimização de performance com índices

### 3. Migrações
- **Versionamento**: Controle de versão do schema
- **Rollback**: Capacidade de reverter migrações
- **Automação**: Execução automática em deploy
- **Validação**: Verificação de integridade

### 4. Seeding
- **Dados Iniciais**: População de dados essenciais
- **Ambientes**: Diferentes seeds para dev/prod
- **Idempotência**: Seeds podem ser executados múltiplas vezes
- **Dependências**: Ordem correta de execução

## 🔧 Configuração Principal

### Database Config

```typescript
// src/database/config.ts
export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  ssl: boolean;
}

export function getDatabaseConfig(): DatabaseConfig {
  const config = {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/autowpp',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
    ssl: process.env.NODE_ENV === 'production'
  };

  if (!config.url) {
    throw new Error('DATABASE_URL é obrigatória');
  }

  return config;
}
```

### Database Service

```typescript
// src/database/database.service.ts
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db: NodePgDatabase<any>;
  private pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    this.initializeConnection();
  }

  async onModuleInit() {
    await this.checkConnection();
    await this.runMigrations();
    await this.seedInitialData();
    
    this.logger.log('Database module initialized successfully');
  }

  async onModuleDestroy() {
    await this.closeConnection();
    this.logger.log('Database connections closed');
  }

  private initializeConnection() {
    const config = getDatabaseConfig();
    
    this.pool = new Pool({
      connectionString: config.url,
      max: config.maxConnections,
      idleTimeoutMillis: config.idleTimeoutMs,
      connectionTimeoutMillis: config.connectionTimeoutMs,
      ssl: config.ssl ? { rejectUnauthorized: false } : false
    });

    this.db = drizzle(this.pool, { schema });
    
    // Event listeners para monitoramento
    this.pool.on('connect', () => {
      this.logger.debug('Nova conexão estabelecida');
    });

    this.pool.on('error', (err) => {
      this.logger.error('Erro na conexão do pool:', err);
    });
  }

  getDatabase(): NodePgDatabase<any> {
    return this.db;
  }

  getConnection(): Pool {
    return this.pool;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT NOW()');
      this.logger.log('Database connection verified');
      return true;
    } catch (error) {
      this.logger.error('Database connection failed:', error);
      return false;
    }
  }

  async runMigrations(): Promise<void> {
    try {
      await migrate(this.db, { migrationsFolder: './src/database/migrations' });
      this.logger.log('Database migrations completed');
    } catch (error) {
      this.logger.error('Migration failed:', error);
      throw error;
    }
  }

  async seedInitialData(): Promise<void> {
    try {
      const { runSeeds } = await import('./seeds');
      await runSeeds(this.db);
      this.logger.log('Database seeding completed');
    } catch (error) {
      this.logger.error('Seeding failed:', error);
      // Não falhar se seeding falhar (dados podem já existir)
    }
  }

  async executeTransaction<T>(
    callback: (tx: ReturnType<typeof drizzle>) => Promise<T>
  ): Promise<T> {
    return await this.db.transaction(callback);
  }

  async executeRawQuery(query: string, params?: any[]): Promise<any> {
    return await this.pool.query(query, params);
  }

  async closeConnection(): Promise<void> {
    await this.pool.end();
  }

  async getDatabaseStats(): Promise<any> {
    const stats = await this.pool.query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples
      FROM pg_stat_user_tables
      ORDER BY schemaname, tablename
    `);

    return stats.rows;
  }

  async testPerformance(): Promise<any> {
    const start = Date.now();
    
    // Teste de inserção
    const insertStart = Date.now();
    await this.pool.query('SELECT 1');
    const insertTime = Date.now() - insertStart;

    // Teste de consulta
    const selectStart = Date.now();
    await this.pool.query('SELECT COUNT(*) FROM information_schema.tables');
    const selectTime = Date.now() - selectStart;

    const totalTime = Date.now() - start;

    return {
      totalTime,
      insertTime,
      selectTime,
      connectionCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}
```

## 🗄️ Schema Definition

### Schema Principal

```typescript
// src/database/schema.ts
import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tabela de Contas WhatsApp
export const whatsappAccounts = pgTable('whatsapp_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneNumberId: varchar('phone_number_id', { length: 50 }).unique().notNull(),
  encryptedAccessToken: text('encrypted_access_token').notNull(),
  encryptedWebhookVerifyToken: text('encrypted_webhook_verify_token').notNull(),
  businessName: varchar('business_name', { length: 100 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  isActive: boolean('is_active').default(true),
  lastActivity: timestamp('last_activity'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  phoneNumberIdIdx: index('idx_whatsapp_accounts_phone_number_id').on(table.phoneNumberId),
  activeIdx: index('idx_whatsapp_accounts_active').on(table.isActive)
}));

// Tabela de Produtos
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('BRL'),
  category: varchar('category', { length: 50 }),
  brand: varchar('brand', { length: 100 }),
  model: varchar('model', { length: 100 }),
  sku: varchar('sku', { length: 20 }).unique(),
  inStock: boolean('in_stock').default(true),
  weight: integer('weight'), // em gramas
  dimensions: jsonb('dimensions'), // {length, width, height}
  specifications: jsonb('specifications'),
  tags: text('tags').array(),
  images: text('images').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  nameIdx: index('idx_products_name').on(table.name),
  categoryIdx: index('idx_products_category').on(table.category),
  brandIdx: index('idx_products_brand').on(table.brand),
  priceIdx: index('idx_products_price').on(table.price),
  inStockIdx: index('idx_products_in_stock').on(table.inStock),
  createdAtIdx: index('idx_products_created_at').on(table.createdAt)
}));

// Tabela de Conversas
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
  customerName: varchar('customer_name', { length: 100 }),
  status: varchar('status', { length: 20 }).default('active'), // active, resolved, escalated, pending
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  resolvedAt: timestamp('resolved_at'),
  escalatedAt: timestamp('escalated_at'),
  metadata: jsonb('metadata')
}, (table) => ({
  phoneIdx: index('idx_conversations_phone').on(table.customerPhone),
  statusIdx: index('idx_conversations_status').on(table.status),
  createdAtIdx: index('idx_conversations_created_at').on(table.createdAt)
}));

// Tabela de Mensagens
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // incoming, outgoing
  isAI: boolean('is_ai').default(false),
  confidence: integer('confidence'), // 0-100
  timestamp: timestamp('timestamp').defaultNow(),
  metadata: jsonb('metadata')
}, (table) => ({
  conversationIdIdx: index('idx_messages_conversation_id').on(table.conversationId),
  timestampIdx: index('idx_messages_timestamp').on(table.timestamp),
  typeIdx: index('idx_messages_type').on(table.type)
}));

// Tabela de Exemplos de Conversa (para treinamento de IA)
export const conversationExamples = pgTable('conversation_examples', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerMessage: text('customer_message').notNull(),
  desiredResponse: text('desired_response').notNull(),
  category: varchar('category', { length: 50 }),
  goalType: varchar('goal_type', { length: 50 }), // helpful, deal_closer, support_agent, lead_generator
  keywords: text('keywords').array(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  categoryIdx: index('idx_conversation_examples_category').on(table.category),
  goalTypeIdx: index('idx_conversation_examples_goal_type').on(table.goalType),
  activeIdx: index('idx_conversation_examples_active').on(table.isActive)
}));

// Tabela de Configuração de IA
export const aiConfiguration = pgTable('ai_configuration', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).unique().notNull(),
  value: jsonb('value').notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  keyIdx: index('idx_ai_configuration_key').on(table.key),
  categoryIdx: index('idx_ai_configuration_category').on(table.category),
  activeIdx: index('idx_ai_configuration_active').on(table.isActive)
}));

// Tabela de Eventos de Escalação
export const escalationEvents = pgTable('escalation_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id),
  messageId: uuid('message_id').references(() => messages.id),
  reason: text('reason').notNull(),
  priority: varchar('priority', { length: 20 }).notNull(), // low, medium, high, critical
  triggeredBy: varchar('triggered_by', { length: 20 }).notNull(), // confidence, keyword, pattern, manual, time
  confidenceScore: integer('confidence_score'),
  escalationRules: text('escalation_rules').array(),
  createdAt: timestamp('created_at').defaultNow(),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: varchar('resolved_by', { length: 100 }),
  resolution: text('resolution'),
  metadata: jsonb('metadata')
}, (table) => ({
  conversationIdIdx: index('idx_escalation_events_conversation_id').on(table.conversationId),
  priorityIdx: index('idx_escalation_events_priority').on(table.priority),
  createdAtIdx: index('idx_escalation_events_created_at').on(table.createdAt)
}));

// Definir Relações
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
  escalationEvents: many(escalationEvents)
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id]
  })
}));

export const escalationEventsRelations = relations(escalationEvents, ({ one }) => ({
  conversation: one(conversations, {
    fields: [escalationEvents.conversationId],
    references: [conversations.id]
  }),
  message: one(messages, {
    fields: [escalationEvents.messageId],
    references: [messages.id]
  })
}));

// Exportar tipos TypeScript
export type WhatsAppAccount = typeof whatsappAccounts.$inferSelect;
export type NewWhatsAppAccount = typeof whatsappAccounts.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type ConversationExample = typeof conversationExamples.$inferSelect;
export type NewConversationExample = typeof conversationExamples.$inferInsert;

export type AIConfiguration = typeof aiConfiguration.$inferSelect;
export type NewAIConfiguration = typeof aiConfiguration.$inferInsert;

export type EscalationEvent = typeof escalationEvents.$inferSelect;
export type NewEscalationEvent = typeof escalationEvents.$inferInsert;
```

## 🔍 Health Check System

### Database Health Check

```typescript
// src/database/health-check.ts
export interface DatabaseHealthStatus {
  isHealthy: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  performance: {
    queryTime: number;
    connectionTime: number;
  };
  statistics: {
    totalConnections: number;
    idleConnections: number;
    waitingCount: number;
  };
  tableStats: {
    whatsappAccounts: number;
    products: number;
    conversations: number;
    messages: number;
    conversationExamples: number;
    aiConfiguration: number;
  };
  lastChecked: Date;
}

@Injectable()
export class DatabaseHealthCheck {
  constructor(private readonly databaseService: DatabaseService) {}

  async checkHealth(): Promise<DatabaseHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Teste de conectividade
      const connectionStart = Date.now();
      const isConnected = await this.databaseService.checkConnection();
      const connectionTime = Date.now() - connectionStart;

      if (!isConnected) {
        return {
          isHealthy: false,
          connectionStatus: 'disconnected',
          performance: { queryTime: 0, connectionTime },
          statistics: { totalConnections: 0, idleConnections: 0, waitingCount: 0 },
          tableStats: {} as any,
          lastChecked: new Date()
        };
      }

      // Teste de performance
      const queryStart = Date.now();
      await this.databaseService.executeRawQuery('SELECT 1');
      const queryTime = Date.now() - queryStart;

      // Estatísticas de conexão
      const pool = this.databaseService.getConnection();
      const statistics = {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingCount: pool.waitingCount
      };

      // Estatísticas de tabelas
      const tableStats = await this.getTableStatistics();

      // Validar schema
      const schemaValid = await this.validateSchema();

      return {
        isHealthy: schemaValid && queryTime < 1000, // Considera saudável se query < 1s
        connectionStatus: 'connected',
        performance: { queryTime, connectionTime },
        statistics,
        tableStats,
        lastChecked: new Date()
      };

    } catch (error) {
      return {
        isHealthy: false,
        connectionStatus: 'error',
        performance: { queryTime: 0, connectionTime: Date.now() - startTime },
        statistics: { totalConnections: 0, idleConnections: 0, waitingCount: 0 },
        tableStats: {} as any,
        lastChecked: new Date()
      };
    }
  }

  private async getTableStatistics(): Promise<DatabaseHealthStatus['tableStats']> {
    const db = this.databaseService.getDatabase();
    
    const [
      whatsappAccountsCount,
      productsCount,
      conversationsCount,
      messagesCount,
      conversationExamplesCount,
      aiConfigurationCount
    ] = await Promise.all([
      db.select({ count: count() }).from(whatsappAccounts),
      db.select({ count: count() }).from(products),
      db.select({ count: count() }).from(conversations),
      db.select({ count: count() }).from(messages),
      db.select({ count: count() }).from(conversationExamples),
      db.select({ count: count() }).from(aiConfiguration)
    ]);

    return {
      whatsappAccounts: whatsappAccountsCount[0].count,
      products: productsCount[0].count,
      conversations: conversationsCount[0].count,
      messages: messagesCount[0].count,
      conversationExamples: conversationExamplesCount[0].count,
      aiConfiguration: aiConfigurationCount[0].count
    };
  }

  private async validateSchema(): Promise<boolean> {
    try {
      // Verificar se todas as tabelas principais existem
      const requiredTables = [
        'whatsapp_accounts',
        'products',
        'conversations',
        'messages',
        'conversation_examples',
        'ai_configuration',
        'escalation_events'
      ];

      const result = await this.databaseService.executeRawQuery(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ANY($1)
      `, [requiredTables]);

      return result.rows.length === requiredTables.length;
    } catch (error) {
      return false;
    }
  }
}
```

## 🌱 Sistema de Seeding

### Seeds Principais

```typescript
// src/database/seeds/index.ts
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { seedInitialAIConfiguration } from './initial-ai-config.seed';

export async function runSeeds(db: NodePgDatabase<any>) {
  console.log('🌱 Iniciando seeding do banco de dados...');

  try {
    // Seed de configuração inicial de IA
    await seedInitialAIConfiguration(db);
    
    // Seed de dados de desenvolvimento (apenas em dev)
    if (process.env.NODE_ENV === 'development') {
      await seedDevelopmentData(db);
    }

    console.log('✅ Seeding concluído com sucesso');
  } catch (error) {
    console.error('❌ Erro durante seeding:', error);
    throw error;
  }
}

async function seedDevelopmentData(db: NodePgDatabase<any>) {
  // Produtos de exemplo
  const sampleProducts = [
    {
      name: 'iPhone 15 Pro',
      description: 'Smartphone Apple com chip A17 Pro, câmera de 48MP e tela Super Retina XDR de 6.1 polegadas.',
      price: '7999.99',
      category: 'smartphones',
      brand: 'Apple',
      inStock: true,
      specifications: {
        processor: 'A17 Pro',
        camera: '48MP',
        screen: '6.1" Super Retina XDR',
        storage: '256GB'
      },
      tags: ['smartphone', 'apple', 'premium', 'camera']
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      description: 'Smartphone Samsung com S Pen, câmera de 200MP e tela Dynamic AMOLED 2X de 6.8 polegadas.',
      price: '6999.99',
      category: 'smartphones',
      brand: 'Samsung',
      inStock: true,
      specifications: {
        processor: 'Snapdragon 8 Gen 3',
        camera: '200MP',
        screen: '6.8" Dynamic AMOLED 2X',
        storage: '512GB'
      },
      tags: ['smartphone', 'samsung', 's-pen', 'camera']
    }
  ];

  // Inserir produtos se não existirem
  for (const product of sampleProducts) {
    const existing = await db.select()
      .from(products)
      .where(eq(products.name, product.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(products).values(product);
      console.log(`📱 Produto criado: ${product.name}`);
    }
  }

  // Exemplos de conversa para treinamento
  const conversationExamples = [
    {
      customerMessage: 'Preciso de um celular bom e barato',
      desiredResponse: 'Temos ótimas opções com excelente custo-benefício! Posso recomendar alguns smartphones que oferecem ótima qualidade por um preço acessível. Qual seria seu orçamento aproximado?',
      category: 'product_inquiry',
      goalType: 'helpful'
    },
    {
      customerMessage: 'Quanto custa o iPhone mais barato?',
      desiredResponse: 'O iPhone com melhor custo-benefício que temos é o iPhone 13 por R$ 3.999. Ele oferece excelente performance, câmera de qualidade e todas as funcionalidades essenciais da Apple. Gostaria de saber mais detalhes?',
      category: 'pricing',
      goalType: 'deal_closer'
    }
  ];

  for (const example of conversationExamples) {
    const existing = await db.select()
      .from(conversationExamples)
      .where(eq(conversationExamples.customerMessage, example.customerMessage))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(conversationExamples).values(example);
      console.log(`💬 Exemplo de conversa criado: ${example.category}`);
    }
  }
}
```

### AI Configuration Seed

```typescript
// src/database/seeds/initial-ai-config.seed.ts
export async function seedInitialAIConfiguration(db: NodePgDatabase<any>) {
  const initialConfigs = [
    {
      key: 'current_conversation_goal',
      value: { goalType: 'helpful' },
      description: 'Objetivo atual das conversas de IA',
      category: 'conversation'
    },
    {
      key: 'confidence_thresholds',
      value: {
        helpful: 70,
        deal_closer: 75,
        support_agent: 80,
        lead_generator: 65
      },
      description: 'Limites de confiança para cada tipo de objetivo',
      category: 'confidence'
    },
    {
      key: 'escalation_rules',
      value: {
        lowConfidenceThreshold: 50,
        consecutiveLowConfidence: 3,
        keywordTriggers: ['reclamação', 'problema', 'defeito', 'cancelar'],
        autoEscalate: true
      },
      description: 'Regras de escalação automática',
      category: 'escalation'
    },
    {
      key: 'business_hours',
      value: {
        timezone: 'America/Sao_Paulo',
        schedule: {
          monday: { start: '09:00', end: '18:00', active: true },
          tuesday: { start: '09:00', end: '18:00', active: true },
          wednesday: { start: '09:00', end: '18:00', active: true },
          thursday: { start: '09:00', end: '18:00', active: true },
          friday: { start: '09:00', end: '18:00', active: true },
          saturday: { start: '09:00', end: '14:00', active: true },
          sunday: { start: '00:00', end: '00:00', active: false }
        }
      },
      description: 'Horário de funcionamento do atendimento',
      category: 'business'
    },
    {
      key: 'ai_model_config',
      value: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        fallbackMessage: 'Desculpe, não consegui entender sua mensagem. Um atendente entrará em contato em breve.'
      },
      description: 'Configuração do modelo de IA',
      category: 'ai'
    }
  ];

  for (const config of initialConfigs) {
    const existing = await db.select()
      .from(aiConfiguration)
      .where(eq(aiConfiguration.key, config.key))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(aiConfiguration).values(config);
      console.log(`⚙️ Configuração criada: ${config.key}`);
    } else {
      // Atualizar configuração existente se necessário
      await db.update(aiConfiguration)
        .set({ 
          value: config.value,
          updatedAt: new Date()
        })
        .where(eq(aiConfiguration.key, config.key));
      console.log(`🔄 Configuração atualizada: ${config.key}`);
    }
  }
}
```

## 📊 Monitoramento e Métricas

### Database Metrics

```typescript
// Endpoint para métricas do banco
GET /database/metrics

{
  "health": {
    "isHealthy": true,
    "connectionStatus": "connected",
    "lastChecked": "2024-01-15T10:30:00Z"
  },
  "performance": {
    "queryTime": 45,
    "connectionTime": 12,
    "averageQueryTime": 38.5
  },
  "connections": {
    "total": 15,
    "idle": 8,
    "waiting": 0,
    "maxConnections": 20
  },
  "tables": {
    "whatsappAccounts": 2,
    "products": 1250,
    "conversations": 5420,
    "messages": 18750,
    "conversationExamples": 150,
    "aiConfiguration": 8
  },
  "storage": {
    "databaseSize": "245MB",
    "indexSize": "89MB",
    "totalSize": "334MB"
  },
  "activity": {
    "activeQueries": 3,
    "slowQueries": 0,
    "locksWaiting": 0
  }
}
```

### Performance Monitoring

```typescript
// Monitoramento de queries lentas
export class DatabaseMonitor {
  private slowQueryThreshold = 1000; // 1 segundo

  async getSlowQueries(): Promise<any[]> {
    const result = await this.databaseService.executeRawQuery(`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements 
      WHERE mean_time > $1
      ORDER BY mean_time DESC
      LIMIT 10
    `, [this.slowQueryThreshold]);

    return result.rows;
  }

  async getTableSizes(): Promise<any[]> {
    const result = await this.databaseService.executeRawQuery(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);

    return result.rows;
  }

  async getIndexUsage(): Promise<any[]> {
    const result = await this.databaseService.executeRawQuery(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        idx_scan
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
      ORDER BY schemaname, tablename
    `);

    return result.rows;
  }
}
```

## 🔧 Comandos Úteis

### Scripts de Desenvolvimento

```bash
# Gerar nova migração
npm run db:generate

# Executar migrações
npm run db:migrate

# Push schema (desenvolvimento)
npm run db:push

# Abrir Drizzle Studio
npm run db:studio

# Executar seeds
npm run db:seed

# Reset completo do banco
npm run db:reset

# Backup do banco
npm run db:backup

# Restaurar backup
npm run db:restore
```

### Configuração do package.json

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate:pg --config=drizzle.config.ts",
    "db:migrate": "tsx src/database/migrate.ts",
    "db:push": "drizzle-kit push:pg --config=drizzle.config.ts",
    "db:studio": "drizzle-kit studio --config=drizzle.config.ts",
    "db:seed": "tsx src/database/seeds/index.ts",
    "db:reset": "tsx src/database/reset.ts",
    "db:backup": "pg_dump $DATABASE_URL > backup.sql",
    "db:restore": "psql $DATABASE_URL < backup.sql"
  }
}
```

## 🚀 Melhores Práticas

### 1. Performance
- **Índices Estratégicos**: Crie índices para consultas frequentes
- **Connection Pooling**: Use pool de conexões adequado
- **Query Optimization**: Monitore e otimize queries lentas
- **Particionamento**: Considere particionamento para tabelas grandes

### 2. Segurança
- **Credenciais Seguras**: Use variáveis de ambiente para credenciais
- **SSL/TLS**: Sempre use conexões criptografadas em produção
- **Least Privilege**: Conceda apenas permissões necessárias
- **Backup Encryption**: Criptografe backups

### 3. Monitoramento
- **Health Checks**: Implemente verificações de saúde
- **Métricas**: Colete métricas de performance
- **Alertas**: Configure alertas para problemas
- **Logs**: Mantenha logs detalhados

### 4. Manutenção
- **Backups Regulares**: Automatize backups
- **Vacuum/Analyze**: Execute manutenção regular
- **Monitoring**: Monitore crescimento de dados
- **Cleanup**: Implemente limpeza de dados antigos

## 🔧 Troubleshooting

### Problemas Comuns

#### Conexões Esgotadas
```typescript
// Verificar pool de conexões
const pool = databaseService.getConnection();
console.log('Total connections:', pool.totalCount);
console.log('Idle connections:', pool.idleCount);
console.log('Waiting connections:', pool.waitingCount);

// Aumentar limite se necessário
// DB_MAX_CONNECTIONS=30
```

#### Queries Lentas
```typescript
// Identificar queries lentas
const slowQueries = await databaseMonitor.getSlowQueries();
console.log('Slow queries:', slowQueries);

// Analisar plano de execução
const plan = await db.execute(`
  EXPLAIN ANALYZE SELECT * FROM products 
  WHERE name ILIKE '%smartphone%'
`);
```

#### Problemas de Migração
```typescript
// Verificar status das migrações
const migrations = await db.execute(`
  SELECT * FROM __drizzle_migrations 
  ORDER BY created_at DESC
`);

// Rollback manual se necessário
await db.execute(`
  DELETE FROM __drizzle_migrations 
  WHERE hash = 'migration_hash'
`);
```

#### Espaço em Disco
```typescript
// Verificar tamanho do banco
const sizes = await databaseMonitor.getTableSizes();
console.log('Table sizes:', sizes);

// Executar vacuum para recuperar espaço
await db.execute('VACUUM ANALYZE');
```

O Database Module é a fundação da plataforma, fornecendo uma base sólida e confiável para todos os outros módulos operarem com eficiência e segurança.