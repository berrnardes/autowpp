import axios, { AxiosInstance, AxiosResponse } from 'axios'
import type {
  ConversationMetrics,
  RecentInteraction,
  ConversationFilters,
  WhatsAppAccount,
  WhatsAppCredentials,
  ConnectionTestResult,
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductFilters,
  ConversationExample,
  AIConfiguration,
  Conversation,
  ConversationAnalytics,
  TakeoverRequest,
  ResponseOverride
} from '@/types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

class ApiClient {
  private client: AxiosInstance
  private retryCount = 3
  private retryDelay = 1000

  constructor(baseUrl: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // Increased timeout for better reliability
    })

    // Request interceptor for adding retry logic
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp to prevent caching issues
        if (config.method === 'get') {
          config.params = { ...config.params, _t: Date.now() }
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling and retry logic
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const config = error.config
        
        // Don't retry if we've already retried too many times
        if (!config || config.__retryCount >= this.retryCount) {
          console.error('API Error (final):', error.response?.data || error.message)
          return Promise.reject(this.formatError(error))
        }

        // Initialize retry count
        config.__retryCount = config.__retryCount || 0
        config.__retryCount += 1

        // Only retry on network errors or 5xx server errors
        const shouldRetry = !error.response || (error.response.status >= 500 && error.response.status < 600)
        
        if (shouldRetry) {
          console.warn(`API request failed, retrying (${config.__retryCount}/${this.retryCount}):`, error.message)
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * config.__retryCount))
          
          return this.client(config)
        }

        console.error('API Error:', error.response?.data || error.message)
        return Promise.reject(this.formatError(error))
      }
    )
  }

  private formatError(error: any) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.response?.data?.error || error.message
      const status = error.response?.status
      
      return {
        message,
        status,
        data: error.response?.data,
        isNetworkError: !error.response
      }
    }
    
    return {
      message: error.message || 'Unknown error occurred',
      status: 0,
      data: null,
      isNetworkError: true
    }
  }

  // Helper method for handling loading states
  async withLoadingState<T>(
    operation: () => Promise<T>,
    onLoadingChange?: (loading: boolean) => void
  ): Promise<T> {
    try {
      onLoadingChange?.(true)
      const result = await operation()
      return result
    } finally {
      onLoadingChange?.(false)
    }
  }

  // Dashboard API methods
  async getDashboardMetrics(): Promise<any> {
    const response = await this.client.get('/api/dashboard/metrics')
    return response.data
  }

  async getRecentActivity(limit: number = 10): Promise<any> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    
    const response = await this.client.get(`/api/dashboard/recent-activity?${params}`)
    return response.data
  }

  async getConversationTrends(days: number = 7): Promise<any> {
    const params = new URLSearchParams()
    params.append('days', days.toString())
    
    const response = await this.client.get(`/api/dashboard/conversation-trends?${params}`)
    return response.data
  }

  async getSystemHealth(): Promise<any> {
    const response = await this.client.get('/api/dashboard/health')
    return response.data
  }

  // Legacy method for backward compatibility
  async getConversationMetrics(): Promise<ConversationMetrics> {
    const dashboardMetrics = await this.getDashboardMetrics()
    return {
      totalConversations: dashboardMetrics.conversations.total,
      activeConversations: dashboardMetrics.conversations.active,
      resolvedConversations: dashboardMetrics.conversations.resolved,
      escalatedConversations: dashboardMetrics.conversations.escalated,
      averageResponseTime: dashboardMetrics.messages.averageResponseTime,
      aiConfidenceAverage: dashboardMetrics.ai.averageConfidence,
      messagesProcessedToday: dashboardMetrics.conversations.todayCount,
      messagesProcessedThisWeek: dashboardMetrics.conversations.weekCount
    }
  }

  async getRecentInteractions(
    limit: number = 10,
    filters?: ConversationFilters
  ): Promise<RecentInteraction[]> {
    const activity = await this.getRecentActivity(limit)
    
    // Convert activity to RecentInteraction format for backward compatibility
    return activity.activities.map((item: any) => ({
      id: item.id,
      customerPhone: item.metadata?.customerPhone || 'Unknown',
      customerName: item.title.includes('with ') ? item.title.split('with ')[1] : 'Unknown',
      lastMessage: item.description,
      timestamp: new Date(item.timestamp),
      status: item.metadata?.status || 'active',
      aiConfidence: 0.8, // Default value
      isEscalated: item.type === 'escalation'
    }))
  }

  // WhatsApp API methods
  async getWhatsAppConnectionStatus(): Promise<any> {
    const response = await this.client.get('/api/whatsapp/status')
    return response.data
  }

  async getWhatsAppAccount(): Promise<WhatsAppAccount | null> {
    try {
      const status = await this.getWhatsAppConnectionStatus()
      if (!status.isConnected || !status.account) {
        return null
      }
      
      return {
        id: status.account.id,
        phoneNumberId: status.account.phoneNumberId,
        phoneNumber: status.account.phoneNumber,
        businessName: status.account.businessName,
        isConnected: status.isConnected,
        createdAt: new Date(status.account.connectedAt),
        updatedAt: new Date(status.account.connectedAt)
      }
    } catch (error) {
      // Return null if no account is configured (404 error)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null
      }
      throw error
    }
  }

  async connectWhatsApp(credentials: WhatsAppCredentials): Promise<WhatsAppAccount> {
    const response = await this.client.post('/api/whatsapp/connect', credentials)
    
    if (response.data.success) {
      // Get the updated status to return account info
      const status = await this.getWhatsAppConnectionStatus()
      return {
        id: status.account?.id || credentials.phoneNumberId,
        phoneNumberId: credentials.phoneNumberId,
        phoneNumber: credentials.businessName || 'Not available', // Use businessName as phoneNumber for now
        businessName: credentials.businessName || 'Not available',
        isConnected: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } else {
      throw new Error(response.data.message || 'Failed to connect WhatsApp account')
    }
  }

  async testWhatsAppConnection(credentials?: WhatsAppCredentials): Promise<ConnectionTestResult> {
    if (credentials) {
      // Test with new credentials (not implemented in backend yet)
      // For now, we'll just test the current connection
    }
    
    const response = await this.client.post('/api/whatsapp/test-connection')
    return {
      success: response.data.success,
      message: response.data.message,
      accountInfo: response.data.details
    }
  }

  async disconnectWhatsApp(): Promise<void> {
    await this.client.delete('/api/whatsapp/disconnect')
  }

  async updateWhatsAppAccount(updates: Partial<WhatsAppCredentials>): Promise<WhatsAppAccount> {
    const response = await this.client.put('/api/whatsapp/update', updates)
    
    if (response.data.success) {
      // Get the updated status to return account info
      const status = await this.getWhatsAppConnectionStatus()
      return {
        id: status.account?.id || updates.phoneNumberId || 'unknown',
        phoneNumberId: updates.phoneNumberId || status.account?.phoneNumberId || 'unknown',
        phoneNumber: status.account?.phoneNumber || 'Not available',
        businessName: updates.businessName || status.account?.businessName || 'Not available',
        isConnected: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } else {
      throw new Error(response.data.message || 'Failed to update WhatsApp account')
    }
  }

  async getWhatsAppWebhookInfo(): Promise<any> {
    const response = await this.client.get('/api/whatsapp/webhook-info')
    return response.data
  }

  async sendTestMessage(phoneNumber: string, message: string): Promise<any> {
    const response = await this.client.post('/api/whatsapp/send-test-message', {
      phoneNumber,
      message
    })
    return response.data
  }

  // Product API methods
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    const params = new URLSearchParams()
    
    if (filters) {
      if (filters.search) params.append('search', filters.search)
      if (filters.category) params.append('category', filters.category)
      if (filters.inStock !== undefined) params.append('inStock', filters.inStock.toString())
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString())
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString())
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
    }

    const response = await this.client.get(`/api/products?${params}`)
    return response.data.products || response.data
  }

  async searchProducts(query: string, category?: string, minPrice?: number, maxPrice?: number): Promise<Product[]> {
    const params = new URLSearchParams()
    params.append('q', query)
    if (category) params.append('category', category)
    if (minPrice) params.append('minPrice', minPrice.toString())
    if (maxPrice) params.append('maxPrice', maxPrice.toString())

    const response = await this.client.get(`/api/products/search?${params}`)
    return response.data.products
  }

  async getProductCategories(): Promise<string[]> {
    const response = await this.client.get('/api/products/categories')
    return response.data.categories
  }

  async getProduct(id: string): Promise<Product> {
    const response = await this.client.get<Product>(`/api/products/${id}`)
    return response.data
  }

  async createProduct(product: CreateProductDto): Promise<Product> {
    const response = await this.client.post<Product>('/api/products', product)
    return response.data
  }

  async updateProduct(id: string, updates: UpdateProductDto): Promise<Product> {
    const response = await this.client.put<Product>(`/api/products/${id}`, updates)
    return response.data
  }

  async deleteProduct(id: string): Promise<void> {
    const response = await this.client.delete(`/api/products/${id}`)
    return response.data
  }

  async toggleProductStock(id: string): Promise<Product> {
    const response = await this.client.put(`/api/products/${id}/toggle-stock`)
    return response.data.product
  }

  async bulkUpdateProducts(productIds: string[], updates: Partial<UpdateProductDto>): Promise<any> {
    const response = await this.client.post('/api/products/bulk-update', {
      productIds,
      updates
    })
    return response.data
  }

  async uploadProductImage(productId: string, file: File): Promise<string> {
    const formData = new FormData()
    formData.append('image', file)
    
    const response = await this.client.post(
      `/api/products/${productId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data.image?.url || response.data.imageUrl
  }

  async uploadMultipleProductImages(productId: string, files: File[]): Promise<string[]> {
    const formData = new FormData()
    files.forEach(file => formData.append('images', file))
    
    const response = await this.client.post(
      `/api/products/${productId}/images/multiple`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data.images?.map((img: any) => img.url) || []
  }

  async deleteProductImage(productId: string, imageIndex: number): Promise<void> {
    await this.client.delete(`/api/products/${productId}/images/${imageIndex}`)
  }

  async deleteAllProductImages(productId: string): Promise<void> {
    await this.client.delete(`/api/products/${productId}/images`)
  }

  // AI Training API methods
  async getConversationExamples(query?: any): Promise<any> {
    const params = new URLSearchParams()
    if (query) {
      if (query.category) params.append('category', query.category)
      if (query.limit) params.append('limit', query.limit.toString())
      if (query.offset) params.append('offset', query.offset.toString())
    }
    
    const response = await this.client.get(`/ai/training/examples?${params}`)
    return response.data
  }

  async getConversationExample(id: string): Promise<ConversationExample> {
    const response = await this.client.get(`/ai/training/examples/${id}`)
    return response.data
  }

  async createConversationExample(example: Omit<ConversationExample, 'id' | 'createdAt'>): Promise<ConversationExample> {
    const response = await this.client.post('/ai/training/examples', example)
    return response.data
  }

  async updateConversationExample(id: string, updates: Partial<Omit<ConversationExample, 'id' | 'createdAt'>>): Promise<ConversationExample> {
    const response = await this.client.put(`/ai/training/examples/${id}`, updates)
    return response.data
  }

  async deleteConversationExample(id: string): Promise<void> {
    await this.client.delete(`/ai/training/examples/${id}`)
  }

  async getConversationCategories(): Promise<string[]> {
    const response = await this.client.get('/ai/training/categories')
    return response.data
  }

  async trainAIModel(trainingData: any): Promise<any> {
    const response = await this.client.post('/ai/training/train', trainingData)
    return response.data
  }

  async validateTrainingData(): Promise<any> {
    const response = await this.client.post('/ai/training/validate')
    return response.data
  }

  async getTrainingStats(): Promise<any> {
    const response = await this.client.get('/ai/training/stats')
    return response.data
  }

  async bulkCreateConversationExamples(bulkData: any): Promise<any> {
    const response = await this.client.post('/ai/training/examples/bulk', bulkData)
    return response.data
  }

  // AI Configuration API methods
  async getAIStatus(): Promise<any> {
    const response = await this.client.get('/api/ai/configuration/status')
    return response.data
  }

  async getAIConfiguration(): Promise<AIConfiguration> {
    const response = await this.client.get('/api/ai/configuration/configuration')
    return response.data
  }

  async updateAIConfiguration(updates: any): Promise<any> {
    const response = await this.client.put('/api/ai/configuration/configuration', updates)
    return response.data
  }

  async getBusinessHours(): Promise<any> {
    const response = await this.client.get('/api/ai/configuration/business-hours')
    return response.data
  }

  async updateBusinessHours(businessHours: any): Promise<any> {
    const response = await this.client.put('/api/ai/configuration/business-hours', businessHours)
    return response.data
  }

  async testAIResponse(testData: any): Promise<any> {
    const response = await this.client.post('/api/ai/configuration/test-response', testData)
    return response.data
  }

  async resetAIConfiguration(): Promise<any> {
    const response = await this.client.post('/api/ai/configuration/reset-configuration')
    return response.data
  }

  // AI Goals API methods
  async getAvailableGoals(): Promise<any> {
    const response = await this.client.get('/ai/conversation-goals')
    return response.data
  }

  async getCurrentGoal(): Promise<any> {
    const response = await this.client.get('/ai/conversation-goals/current')
    return response.data
  }

  async setConversationGoal(goalType: string): Promise<any> {
    const response = await this.client.post('/ai/conversation-goals/set', { goalType })
    return response.data
  }

  async updateCustomGoal(customGoalData: any): Promise<any> {
    const response = await this.client.put('/ai/conversation-goals/custom', customGoalData)
    return response.data
  }

  async testGoalBehavior(goalType: string, testData: any): Promise<any> {
    const response = await this.client.post(`/ai/conversation-goals/test/${goalType}`, testData)
    return response.data
  }

  // AI Products API methods
  async getProductRecommendations(requestData: any): Promise<any> {
    const response = await this.client.post('/ai/products/recommendations', requestData)
    return response.data
  }

  async searchAIProducts(query: string): Promise<any> {
    const params = new URLSearchParams()
    params.append('query', query)
    
    const response = await this.client.get(`/ai/products/search?${params}`)
    return response.data
  }

  async updateProductKnowledge(): Promise<any> {
    const response = await this.client.post('/ai/products/knowledge/update')
    return response.data
  }

  // Conversation Management API methods
  async getConversations(filters?: ConversationFilters): Promise<any> {
    const params = new URLSearchParams()
    
    if (filters) {
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)
      if (filters.customerPhone) params.append('customerPhone', filters.customerPhone)
      if (filters.dateFrom) params.append('startDate', filters.dateFrom.toISOString())
      if (filters.dateTo) params.append('endDate', filters.dateTo.toISOString())
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
    }

    const response = await this.client.get(`/conversations?${params}`)
    return response.data
  }

  async getConversation(id: string): Promise<Conversation> {
    const response = await this.client.get<Conversation>(`/conversations/${id}`)
    return response.data
  }

  async getConversationByPhone(phoneNumber: string): Promise<any> {
    const response = await this.client.get(`/conversations/phone/${phoneNumber}`)
    return response.data
  }

  async getConversationsNeedingAttention(): Promise<any> {
    const response = await this.client.get('/conversations/attention')
    return response.data
  }

  async updateConversation(id: string, updates: any): Promise<Conversation> {
    const response = await this.client.put<Conversation>(`/conversations/${id}`, updates)
    return response.data
  }

  async resolveConversation(id: string): Promise<Conversation> {
    const response = await this.client.put<Conversation>(`/conversations/${id}/resolve`)
    return response.data
  }

  async escalateConversation(id: string): Promise<Conversation> {
    const response = await this.client.put<Conversation>(`/conversations/${id}/escalate`)
    return response.data
  }

  async addMessage(conversationId: string, messageData: any): Promise<any> {
    const response = await this.client.post(`/conversations/${conversationId}/messages`, messageData)
    return response.data
  }

  async getConversationHistory(conversationId: string, limit?: number): Promise<any> {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    
    const response = await this.client.get(`/conversations/${conversationId}/history?${params}`)
    return response.data
  }

  async createConversation(conversationData: any): Promise<any> {
    const response = await this.client.post('/conversations', conversationData)
    return response.data
  }

  // Legacy methods for backward compatibility
  async updateConversationStatus(id: string, status: 'active' | 'resolved' | 'escalated'): Promise<Conversation> {
    if (status === 'resolved') {
      return await this.resolveConversation(id)
    } else if (status === 'escalated') {
      return await this.escalateConversation(id)
    } else {
      return await this.updateConversation(id, { status })
    }
  }

  async getFlaggedConversations(): Promise<Conversation[]> {
    const attention = await this.getConversationsNeedingAttention()
    return attention.filter((conv: any) => conv.status === 'escalated')
  }

  async flagMessage(messageId: string, reason: string): Promise<void> {
    // This would need to be implemented in the backend
    console.warn('flagMessage not implemented in new API')
  }

  async unflagMessage(messageId: string): Promise<void> {
    // This would need to be implemented in the backend
    console.warn('unflagMessage not implemented in new API')
  }

  async requestTakeover(request: TakeoverRequest): Promise<void> {
    // This would need to be implemented in the backend
    console.warn('requestTakeover not implemented in new API')
  }

  async overrideResponse(override: ResponseOverride): Promise<void> {
    // This would need to be implemented in the backend
    console.warn('overrideResponse not implemented in new API')
  }

  async getConversationAnalytics(dateFrom?: Date, dateTo?: Date): Promise<ConversationAnalytics> {
    // Use dashboard metrics for now
    const metrics = await this.getDashboardMetrics()
    return {
      totalConversations: metrics.conversations.total,
      activeConversations: metrics.conversations.active,
      resolvedConversations: metrics.conversations.resolved,
      escalatedConversations: metrics.conversations.escalated,
      averageResponseTime: metrics.messages.averageResponseTime,
      aiAccuracy: metrics.ai.averageConfidence,
      resolutionRate: metrics.conversations.resolved / metrics.conversations.total,
      escalationRate: metrics.ai.escalationRate,
      customerSatisfaction: 0.85, // Mock data
      peakHours: ['10:00', '14:00', '16:00'], // Mock data
      commonTopics: ['Product Info', 'Support', 'Pricing'], // Mock data
      aiPerformance: {
        accuracy: metrics.ai.averageConfidence,
        responseTime: metrics.messages.averageResponseTime,
        escalationRate: metrics.ai.escalationRate
      }
    }
  }

  async exportConversations(filters?: ConversationFilters, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    // This would need to be implemented in the backend
    console.warn('exportConversations not implemented in new API')
    return new Blob([''], { type: 'text/plain' })
  }

  // Escalation API methods
  async getEscalationRules(): Promise<any> {
    const response = await this.client.get('/ai/escalation/rules')
    return response.data
  }

  async createEscalationRule(ruleData: any): Promise<any> {
    const response = await this.client.post('/ai/escalation/rules', ruleData)
    return response.data
  }

  async getManualReviewQueue(filters?: any): Promise<any> {
    const params = new URLSearchParams()
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          params.append(key, filters[key].toString())
        }
      })
    }
    
    const response = await this.client.get(`/ai/escalation/manual-review?${params}`)
    return response.data
  }

  async updateManualReviewItem(itemId: string, updates: any): Promise<any> {
    const response = await this.client.put(`/ai/escalation/manual-review/${itemId}`, updates)
    return response.data
  }

  async getEscalationMetrics(startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    
    const response = await this.client.get(`/ai/escalation/metrics?${params}`)
    return response.data
  }

  async getConfidenceThresholds(): Promise<any> {
    const response = await this.client.get('/ai/escalation/confidence/thresholds')
    return response.data
  }

  async updateConfidenceThreshold(goalType: string, threshold: number): Promise<any> {
    const response = await this.client.put('/ai/escalation/confidence/thresholds', {
      goal: goalType,
      threshold
    })
    return response.data
  }

  // Utility methods for better UX
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.client.get('/api/dashboard/health')
      return response.data
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString()
      }
    }
  }

  // Method to check if backend is available
  async isBackendAvailable(): Promise<boolean> {
    try {
      await this.healthCheck()
      return true
    } catch (error) {
      return false
    }
  }

  // Method to get user-friendly error messages
  getErrorMessage(error: any): string {
    if (typeof error === 'string') return error
    
    if (error?.isNetworkError) {
      return 'Unable to connect to the server. Please check your internet connection and try again.'
    }
    
    if (error?.status === 401) {
      return 'Authentication required. Please log in and try again.'
    }
    
    if (error?.status === 403) {
      return 'You do not have permission to perform this action.'
    }
    
    if (error?.status === 404) {
      return 'The requested resource was not found.'
    }
    
    if (error?.status >= 500) {
      return 'Server error occurred. Please try again later.'
    }
    
    return error?.message || 'An unexpected error occurred. Please try again.'
  }
}

export const apiClient = new ApiClient()