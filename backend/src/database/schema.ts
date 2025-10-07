import { pgTable, uuid, varchar, text, boolean, timestamp, decimal, json, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// WhatsApp Account Management (Single Account MVP)
export const whatsappAccounts = pgTable('whatsapp_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  phoneNumberId: varchar('phone_number_id', { length: 255 }).notNull(),
  accessToken: text('access_token').notNull(), // encrypted
  webhookVerifyToken: varchar('webhook_verify_token', { length: 255 }).notNull(),
  isConnected: boolean('is_connected').default(false),
  businessName: varchar('business_name', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  phoneNumberIdIdx: unique().on(table.phoneNumberId),
  phoneNumberIdx: index().on(table.phoneNumber),
  isConnectedIdx: index().on(table.isConnected)
}));

// Product Catalog
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  images: json('images').$type<string[]>().default([]),
  category: varchar('category', { length: 100 }),
  inStock: boolean('in_stock').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  nameIdx: index().on(table.name),
  categoryIdx: index().on(table.category),
  inStockIdx: index().on(table.inStock),
  priceIdx: index().on(table.price)
}));

// Conversation Management
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  customerPhoneIdx: index().on(table.customerPhone),
  statusIdx: index().on(table.status),
  createdAtIdx: index().on(table.createdAt)
}));

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'incoming' | 'outgoing'
  isAI: boolean('is_ai').default(false),
  confidence: decimal('confidence', { precision: 3, scale: 2 }),
  timestamp: timestamp('timestamp').defaultNow(),
  metadata: json('metadata')
}, (table) => ({
  conversationIdIdx: index().on(table.conversationId),
  timestampIdx: index().on(table.timestamp),
  typeIdx: index().on(table.type),
  isAIIdx: index().on(table.isAI)
}));

// AI Training and Configuration
export const conversationExamples = pgTable('conversation_examples', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerMessage: text('customer_message').notNull(),
  desiredResponse: text('desired_response').notNull(),
  category: varchar('category', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  categoryIdx: index().on(table.category),
  createdAtIdx: index().on(table.createdAt)
}));

export const aiConfiguration = pgTable('ai_configuration', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationGoal: varchar('conversation_goal', { length: 50 }).default('helpful'),
  confidenceThreshold: decimal('confidence_threshold', { precision: 3, scale: 2 }).default('0.80'),
  responseStyle: text('response_style'),
  fallbackMessage: text('fallback_message'),
  businessHours: json('business_hours'),
  enableManualReview: boolean('enable_manual_review').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Relations
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages)
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id]
  })
}));

// Type definitions for better TypeScript support
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

// Enums for better type safety
export const ConversationStatus = {
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  ESCALATED: 'escalated'
} as const;

export const MessageType = {
  INCOMING: 'incoming',
  OUTGOING: 'outgoing'
} as const;

export const ConversationGoal = {
  HELPFUL: 'helpful',
  DEAL_CLOSER: 'deal_closer',
  SUPPORT_AGENT: 'support_agent',
  LEAD_GENERATOR: 'lead_generator',
  CUSTOM: 'custom'
} as const;

export type ConversationStatusType = typeof ConversationStatus[keyof typeof ConversationStatus];
export type MessageTypeType = typeof MessageType[keyof typeof MessageType];
export type ConversationGoalType = typeof ConversationGoal[keyof typeof ConversationGoal];