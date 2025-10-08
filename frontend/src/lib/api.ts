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
  AIConfiguration
} from '@/types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

class ApiClient {
  private client: AxiosInstance

  constructor(baseUrl: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message)
        return Promise.reject(error)
      }
    )
  }

  // Dashboard API methods
  async getConversationMetrics(): Promise<ConversationMetrics> {
    const response = await this.client.get<ConversationMetrics>('/conversations/metrics')
    return response.data
  }

  async getRecentInteractions(
    limit: number = 10,
    filters?: ConversationFilters
  ): Promise<RecentInteraction[]> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    
    if (filters) {
      if (filters.status) params.append('status', filters.status)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString())
      if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString())
      if (filters.minConfidence) params.append('minConfidence', filters.minConfidence.toString())
      if (filters.maxConfidence) params.append('maxConfidence', filters.maxConfidence.toString())
    }

    const response = await this.client.get<RecentInteraction[]>(`/conversations/recent?${params}`)
    return response.data
  }

  // WhatsApp API methods
  async getWhatsAppAccount(): Promise<WhatsAppAccount | null> {
    try {
      const response = await this.client.get<WhatsAppAccount>('/whatsapp/account')
      return response.data
    } catch (error) {
      // Return null if no account is configured (404 error)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null
      }
      throw error
    }
  }

  async connectWhatsApp(credentials: WhatsAppCredentials): Promise<WhatsAppAccount> {
    const response = await this.client.post<WhatsAppAccount>('/whatsapp/connect', credentials)
    return response.data
  }

  async testWhatsAppConnection(credentials: WhatsAppCredentials): Promise<ConnectionTestResult> {
    const response = await this.client.post<ConnectionTestResult>('/whatsapp/test-connection', credentials)
    return response.data
  }

  async disconnectWhatsApp(): Promise<void> {
    await this.client.delete('/whatsapp/disconnect')
  }

  async updateWhatsAppAccount(updates: Partial<WhatsAppCredentials>): Promise<WhatsAppAccount> {
    const response = await this.client.put<WhatsAppAccount>('/whatsapp/account', updates)
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
    }

    const response = await this.client.get<Product[]>(`/products?${params}`)
    return response.data
  }

  async getProduct(id: string): Promise<Product> {
    const response = await this.client.get<Product>(`/products/${id}`)
    return response.data
  }

  async createProduct(product: CreateProductDto): Promise<Product> {
    const response = await this.client.post<Product>('/products', product)
    return response.data
  }

  async updateProduct(id: string, updates: UpdateProductDto): Promise<Product> {
    const response = await this.client.put<Product>(`/products/${id}`, updates)
    return response.data
  }

  async deleteProduct(id: string): Promise<void> {
    await this.client.delete(`/products/${id}`)
  }

  async uploadProductImage(productId: string, file: File): Promise<string> {
    const formData = new FormData()
    formData.append('image', file)
    
    const response = await this.client.post<{ imageUrl: string }>(
      `/products/${productId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data.imageUrl
  }

  // AI Training API methods
  async getConversationExamples(): Promise<ConversationExample[]> {
    const response = await this.client.get<ConversationExample[]>('/ai/conversation-examples')
    return response.data
  }

  async createConversationExample(example: Omit<ConversationExample, 'id' | 'createdAt'>): Promise<ConversationExample> {
    const response = await this.client.post<ConversationExample>('/ai/conversation-examples', example)
    return response.data
  }

  async updateConversationExample(id: string, updates: Partial<Omit<ConversationExample, 'id' | 'createdAt'>>): Promise<ConversationExample> {
    const response = await this.client.put<ConversationExample>(`/ai/conversation-examples/${id}`, updates)
    return response.data
  }

  async deleteConversationExample(id: string): Promise<void> {
    await this.client.delete(`/ai/conversation-examples/${id}`)
  }

  async getAIConfiguration(): Promise<AIConfiguration> {
    const response = await this.client.get<AIConfiguration>('/ai/configuration')
    return response.data
  }

  async updateAIConfiguration(updates: Partial<Omit<AIConfiguration, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AIConfiguration> {
    const response = await this.client.put<AIConfiguration>('/ai/configuration', updates)
    return response.data
  }
}

export const apiClient = new ApiClient()