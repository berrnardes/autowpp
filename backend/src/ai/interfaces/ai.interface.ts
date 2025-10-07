import { ConversationGoalType } from '../../database/schema';

export interface IncomingMessage {
  content: string;
  customerPhone: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  confidence: number;
  shouldEscalate: boolean;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  customerPhone: string;
  conversationHistory: MessageHistory[];
  products: ProductInfo[];
  conversationGoal: ConversationGoalType;
  businessHours?: BusinessHours;
  customerName?: string;
}

export interface MessageHistory {
  content: string;
  type: 'incoming' | 'outgoing';
  isAI: boolean;
  timestamp: Date;
  confidence?: number;
}

export interface ProductInfo {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category?: string;
  inStock: boolean;
}

export interface BusinessHours {
  timezone: string;
  schedule: {
    [key: string]: { start: string; end: string; active: boolean };
  };
}

export interface TrainingResult {
  success: boolean;
  message: string;
  examplesProcessed: number;
}

export interface ConversationExample {
  customerMessage: string;
  desiredResponse: string;
  category?: string;
}

export interface AIServiceConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  confidenceThreshold: number;
  fallbackMessage: string;
}