// Dashboard types
export interface ConversationMetrics {
  totalConversations: number
  activeConversations: number
  resolvedConversations: number
  escalatedConversations: number
  averageResponseTime: number
  aiConfidenceAverage: number
  messagesProcessedToday: number
  messagesProcessedThisWeek: number
}

export interface RecentInteraction {
  id: string
  customerPhone: string
  customerName?: string
  lastMessage: string
  timestamp: Date
  status: 'active' | 'resolved' | 'escalated'
  isAI: boolean
  confidence?: number
}

export interface ConversationFilters {
  status?: 'active' | 'resolved' | 'escalated'
  dateFrom?: Date
  dateTo?: Date
  minConfidence?: number
  maxConfidence?: number
  search?: string
  customerPhone?: string
  page?: number
  limit?: number
}

// Conversation management types
export interface Conversation {
  id: string
  customerPhone: string
  customerName?: string
  status: 'active' | 'resolved' | 'escalated'
  createdAt: Date
  updatedAt: Date
  messages: Message[]
  totalMessages: number
  aiMessages: number
  humanMessages: number
  averageConfidence?: number
  lastActivity: Date
}

export interface Message {
  id: string
  conversationId: string
  content: string
  type: 'incoming' | 'outgoing'
  isAI: boolean
  confidence?: number
  timestamp: Date
  metadata?: Record<string, unknown>
  flagged?: boolean
  reviewStatus?: 'pending' | 'approved' | 'rejected'
}

export interface ConversationAnalytics {
  totalConversations: number
  activeConversations: number
  resolvedConversations: number
  escalatedConversations: number
  averageResponseTime: number
  aiAccuracy: number
  resolutionRate: number
  escalationRate: number
  customerSatisfaction?: number
  peakHours: string[]
  commonTopics: string[]
  aiPerformance: {
    accuracy: number
    responseTime: number
    escalationRate: number
  }
  responseTimeDistribution?: {
    under5s: number
    under30s: number
    under1m: number
    over1m: number
  }
  confidenceDistribution?: {
    high: number // > 0.8
    medium: number // 0.5 - 0.8
    low: number // < 0.5
  }
  dailyStats?: {
    date: string
    conversations: number
    messages: number
    averageConfidence: number
  }[]
}

export interface TakeoverRequest {
  conversationId: string
  reason: string
  priority: 'low' | 'medium' | 'high'
}

export interface ResponseOverride {
  messageId: string
  newContent: string
  reason: string
}

// WhatsApp types
export interface WhatsAppAccount {
  id: string
  phoneNumberId: string
  businessName?: string
  phoneNumber?: string
  isConnected: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WhatsAppCredentials {
  phoneNumberId: string
  accessToken: string
  webhookVerifyToken: string
  businessName?: string
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  accountInfo?: {
    businessName: string
    phoneNumber: string
    verifiedName: string
  }
}

// Product types
export interface Product {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  images: string[]
  category?: string
  inStock: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateProductDto {
  name: string
  description?: string
  price: number
  currency?: string
  category?: string
  inStock?: boolean
}

export type UpdateProductDto = Partial<CreateProductDto>

export interface ProductFilters {
  search?: string
  category?: string
  inStock?: boolean
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
}

// AI Training types
export interface ConversationExample {
  id: string
  customerMessage: string
  desiredResponse: string
  category?: string
  createdAt: Date
}

export interface AIConfiguration {
  id: string
  conversationGoal: ConversationGoal
  confidenceThreshold: number
  responseStyle?: string
  fallbackMessage?: string
  businessHours?: BusinessHours
  enableManualReview: boolean
  createdAt: Date
  updatedAt: Date
}

export type ConversationGoal = 'helpful' | 'deal_closer' | 'support_agent' | 'lead_generator' | 'custom'

export interface BusinessHours {
  timezone: string
  schedule: {
    [key: string]: { start: string; end: string; active: boolean }
  }
}

export interface SpecificBusinessHours {
  timezone: string
  schedule: {
    monday: { start: string; end: string; active: boolean }
    tuesday: { start: string; end: string; active: boolean }
    wednesday: { start: string; end: string; active: boolean }
    thursday: { start: string; end: string; active: boolean }
    friday: { start: string; end: string; active: boolean }
    saturday: { start: string; end: string; active: boolean }
    sunday: { start: string; end: string; active: boolean }
  }
}