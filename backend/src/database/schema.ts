import { pgTable, uuid, varchar, text, boolean, timestamp, decimal, json } from 'drizzle-orm/pg-core';

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
});

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
});

// Conversation Management
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id),
  content: text('content').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'incoming' | 'outgoing'
  isAI: boolean('is_ai').default(false),
  confidence: decimal('confidence', { precision: 3, scale: 2 }),
  timestamp: timestamp('timestamp').defaultNow(),
  metadata: json('metadata')
});

// AI Training and Configuration
export const conversationExamples = pgTable('conversation_examples', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerMessage: text('customer_message').notNull(),
  desiredResponse: text('desired_response').notNull(),
  category: varchar('category', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow()
});

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