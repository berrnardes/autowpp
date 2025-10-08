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