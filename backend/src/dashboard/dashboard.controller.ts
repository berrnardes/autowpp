import {
  Controller,
  Get,
  Query,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger';
import { ConversationService } from '../conversations/services/conversation.service';
import { ProductService } from '../products/services/product.service';
import { WhatsAppService } from '../whatsapp/services/whatsapp.service';
import { AIService } from '../ai/services/ai.service';

interface DashboardMetrics {
  conversations: {
    total: number;
    active: number;
    resolved: number;
    escalated: number;
    todayCount: number;
    weekCount: number;
    monthCount: number;
  };
  messages: {
    totalSent: number;
    totalReceived: number;
    todayCount: number;
    averageResponseTime: number;
  };
  ai: {
    averageConfidence: number;
    escalationRate: number;
    successfulResponses: number;
    currentGoal: string;
  };
  products: {
    total: number;
    inStock: number;
    outOfStock: number;
    categories: number;
  };
  whatsapp: {
    isConnected: boolean;
    accountInfo?: {
      phoneNumber: string;
      businessName: string;
    };
  };
}

interface RecentActivity {
  id: string;
  type: 'conversation' | 'message' | 'escalation' | 'product_update';
  title: string;
  description: string;
  timestamp: Date;
  metadata?: any;
}

interface ConversationTrend {
  date: string;
  conversations: number;
  messages: number;
  escalations: number;
}

@ApiTags('Dashboard')
@Controller('api/dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly productService: ProductService,
    private readonly whatsAppService: WhatsAppService,
    private readonly aiService: AIService
  ) {}

  @Get('metrics')
  @ApiOperation({ 
    summary: 'Get dashboard metrics',
    description: 'Returns comprehensive metrics for the dashboard overview'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard metrics returned successfully'
  })
  @ApiInternalServerErrorResponse({ description: 'Failed to fetch metrics' })
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      this.logger.log('Fetching dashboard metrics');

      // Get conversation metrics
      const conversationMetrics = await this.getConversationMetrics();
      
      // Get message metrics
      const messageMetrics = await this.getMessageMetrics();
      
      // Get AI metrics
      const aiMetrics = await this.getAIMetrics();
      
      // Get product metrics
      const productMetrics = await this.getProductMetrics();
      
      // Get WhatsApp status
      const whatsappMetrics = await this.getWhatsAppMetrics();

      return {
        conversations: conversationMetrics,
        messages: messageMetrics,
        ai: aiMetrics,
        products: productMetrics,
        whatsapp: whatsappMetrics
      };
    } catch (error) {
      this.logger.error('Error fetching dashboard metrics:', error);
      throw new InternalServerErrorException(`Failed to fetch dashboard metrics: ${error.message}`);
    }
  }

  @Get('recent-activity')
  @ApiOperation({ 
    summary: 'Get recent activity',
    description: 'Returns recent system activity for the dashboard'
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of activities to return',
    required: false,
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recent activity returned successfully'
  })
  async getRecentActivity(
    @Query('limit') limit?: number
  ): Promise<{ activities: RecentActivity[]; total: number }> {
    try {
      const activityLimit = Math.min(limit || 20, 50);
      this.logger.log(`Fetching recent activity (limit: ${activityLimit})`);

      // Get recent conversations
      const recentConversations = await this.conversationService.findConversations({
        limit: 10,
        page: 1
      });

      const activities: RecentActivity[] = [];

      // Convert conversations to activities
      for (const conversation of recentConversations.conversations) {
        activities.push({
          id: conversation.id,
          type: 'conversation',
          title: `New conversation with ${conversation.customerName || conversation.customerPhone}`,
          description: `Conversation ${conversation.status}`,
          timestamp: conversation.createdAt || new Date(),
          metadata: {
            customerPhone: conversation.customerPhone,
            status: conversation.status
          }
        });
      }

      // Sort by timestamp (most recent first)
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return {
        activities: activities.slice(0, activityLimit),
        total: activities.length
      };
    } catch (error) {
      this.logger.error('Error fetching recent activity:', error);
      throw new InternalServerErrorException(`Failed to fetch recent activity: ${error.message}`);
    }
  }

  @Get('conversation-trends')
  @ApiOperation({ 
    summary: 'Get conversation trends',
    description: 'Returns conversation trends over time for charts'
  })
  @ApiQuery({
    name: 'days',
    description: 'Number of days to include in trends',
    required: false,
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation trends returned successfully'
  })
  async getConversationTrends(
    @Query('days') days?: number
  ): Promise<{ trends: ConversationTrend[]; period: string }> {
    try {
      const trendDays = Math.min(days || 7, 30);
      this.logger.log(`Fetching conversation trends (${trendDays} days)`);

      const trends: ConversationTrend[] = [];
      const now = new Date();

      // Generate trend data for the specified number of days
      for (let i = trendDays - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // For now, we'll generate mock data since we don't have date-based queries implemented
        // In a real implementation, you would query the database for actual data
        trends.push({
          date: dateStr,
          conversations: Math.floor(Math.random() * 20) + 5,
          messages: Math.floor(Math.random() * 100) + 20,
          escalations: Math.floor(Math.random() * 5)
        });
      }

      return {
        trends,
        period: `${trendDays} days`
      };
    } catch (error) {
      this.logger.error('Error fetching conversation trends:', error);
      throw new InternalServerErrorException(`Failed to fetch conversation trends: ${error.message}`);
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Get system health status',
    description: 'Returns the health status of all system components'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System health status returned successfully'
  })
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    components: {
      database: 'healthy' | 'error';
      whatsapp: 'healthy' | 'warning' | 'error';
      ai: 'healthy' | 'warning' | 'error';
    };
    timestamp: string;
  }> {
    try {
      this.logger.log('Checking system health');

      // Check database health
      let databaseHealth: 'healthy' | 'error' = 'healthy';
      try {
        await this.conversationService.findConversations({ limit: 1, page: 1 });
      } catch (error) {
        databaseHealth = 'error';
      }

      // Check WhatsApp health
      let whatsappHealth: 'healthy' | 'warning' | 'error' = 'healthy';
      try {
        const whatsappStatus = await this.whatsAppService.getConnectionStatus();
        if (!whatsappStatus.isConnected) {
          whatsappHealth = 'warning';
        }
      } catch (error) {
        whatsappHealth = 'error';
      }

      // Check AI health
      let aiHealth: 'healthy' | 'warning' | 'error' = 'healthy';
      try {
        const currentGoal = this.aiService.getCurrentGoal();
        if (!currentGoal) {
          aiHealth = 'warning';
        }
      } catch (error) {
        aiHealth = 'error';
      }

      // Determine overall status
      let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';
      if (databaseHealth === 'error' || whatsappHealth === 'error' || aiHealth === 'error') {
        overallStatus = 'error';
      } else if (whatsappHealth === 'warning' || aiHealth === 'warning') {
        overallStatus = 'warning';
      }

      return {
        status: overallStatus,
        components: {
          database: databaseHealth,
          whatsapp: whatsappHealth,
          ai: aiHealth
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error checking system health:', error);
      return {
        status: 'error',
        components: {
          database: 'error',
          whatsapp: 'error',
          ai: 'error'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async getConversationMetrics() {
    try {
      // Get basic conversation counts
      const allConversations = await this.conversationService.findConversations({
        limit: 1000, // Get a large number to count
        page: 1
      });

      const total = allConversations.total;
      const active = allConversations.conversations.filter(c => c.status === 'active').length;
      const resolved = allConversations.conversations.filter(c => c.status === 'resolved').length;
      const escalated = allConversations.conversations.filter(c => c.status === 'escalated').length;

      // For time-based counts, we'll use mock data for now
      // In a real implementation, you would query with date filters
      const todayCount = Math.floor(total * 0.1);
      const weekCount = Math.floor(total * 0.3);
      const monthCount = Math.floor(total * 0.8);

      return {
        total,
        active,
        resolved,
        escalated,
        todayCount,
        weekCount,
        monthCount
      };
    } catch (error) {
      this.logger.error('Error getting conversation metrics:', error);
      return {
        total: 0,
        active: 0,
        resolved: 0,
        escalated: 0,
        todayCount: 0,
        weekCount: 0,
        monthCount: 0
      };
    }
  }

  private async getMessageMetrics() {
    // Mock data for now - in a real implementation, you would query message tables
    return {
      totalSent: 1250,
      totalReceived: 890,
      todayCount: 45,
      averageResponseTime: 2.3 // seconds
    };
  }

  private async getAIMetrics() {
    try {
      const currentGoal = this.aiService.getCurrentGoal();
      
      // Mock data for now - in a real implementation, you would calculate from actual data
      return {
        averageConfidence: 0.85,
        escalationRate: 0.12,
        successfulResponses: 756,
        currentGoal
      };
    } catch (error) {
      this.logger.error('Error getting AI metrics:', error);
      return {
        averageConfidence: 0,
        escalationRate: 0,
        successfulResponses: 0,
        currentGoal: 'unknown'
      };
    }
  }

  private async getProductMetrics() {
    try {
      const products = await this.productService.findAll({ limit: 1000, page: 1 });
      const categories = await this.productService.getCategories();
      
      const inStock = products.products.filter(p => p.inStock).length;
      const outOfStock = products.products.filter(p => !p.inStock).length;

      return {
        total: products.total,
        inStock,
        outOfStock,
        categories: categories.length
      };
    } catch (error) {
      this.logger.error('Error getting product metrics:', error);
      return {
        total: 0,
        inStock: 0,
        outOfStock: 0,
        categories: 0
      };
    }
  }

  private async getWhatsAppMetrics() {
    try {
      const status = await this.whatsAppService.getConnectionStatus();
      
      return {
        isConnected: status.isConnected,
        accountInfo: status.accountInfo ? {
          phoneNumber: status.accountInfo.phoneNumber || 'Not available',
          businessName: status.accountInfo.businessName || 'Not available'
        } : undefined
      };
    } catch (error) {
      this.logger.error('Error getting WhatsApp metrics:', error);
      return {
        isConnected: false
      };
    }
  }
}