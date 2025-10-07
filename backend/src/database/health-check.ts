import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { 
  whatsappAccounts, 
  products, 
  conversations, 
  messages, 
  conversationExamples, 
  aiConfiguration 
} from './schema';
import { count } from 'drizzle-orm';

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
  private readonly logger = new Logger(DatabaseHealthCheck.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async checkHealth(): Promise<DatabaseHealthStatus> {
    const startTime = Date.now();
    let connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
    let performance = { queryTime: 0, connectionTime: 0 };
    let statistics = { totalConnections: 0, idleConnections: 0, waitingCount: 0 };
    let tableStats = {
      whatsappAccounts: 0,
      products: 0,
      conversations: 0,
      messages: 0,
      conversationExamples: 0,
      aiConfiguration: 0
    };

    try {
      // Check basic connection
      const isConnected = await this.databaseService.checkConnection();
      connectionStatus = isConnected ? 'connected' : 'disconnected';

      if (isConnected) {
        // Get performance metrics
        performance = await this.databaseService.testPerformance();

        // Get connection statistics
        statistics = await this.databaseService.getDatabaseStats();

        // Get table statistics
        tableStats = await this.getTableStatistics();
      }
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      connectionStatus = 'error';
    }

    const totalTime = Date.now() - startTime;
    const isHealthy = connectionStatus === 'connected' && performance.queryTime < 1000;

    return {
      isHealthy,
      connectionStatus,
      performance,
      statistics,
      tableStats,
      lastChecked: new Date()
    };
  }

  private async getTableStatistics() {
    const db = this.databaseService.getDatabase();

    try {
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
        whatsappAccounts: whatsappAccountsCount[0]?.count || 0,
        products: productsCount[0]?.count || 0,
        conversations: conversationsCount[0]?.count || 0,
        messages: messagesCount[0]?.count || 0,
        conversationExamples: conversationExamplesCount[0]?.count || 0,
        aiConfiguration: aiConfigurationCount[0]?.count || 0
      };
    } catch (error) {
      this.logger.error('Failed to get table statistics:', error);
      return {
        whatsappAccounts: 0,
        products: 0,
        conversations: 0,
        messages: 0,
        conversationExamples: 0,
        aiConfiguration: 0
      };
    }
  }

  async validateSchema(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const db = this.databaseService.getDatabase();

    try {
      // Test basic table access
      await db.select().from(whatsappAccounts).limit(1);
      await db.select().from(products).limit(1);
      await db.select().from(conversations).limit(1);
      await db.select().from(messages).limit(1);
      await db.select().from(conversationExamples).limit(1);
      await db.select().from(aiConfiguration).limit(1);

      this.logger.log('✅ Schema validation passed');
      return { isValid: true, errors: [] };
    } catch (error) {
      const errorMessage = `Schema validation failed: ${error.message}`;
      this.logger.error(errorMessage);
      errors.push(errorMessage);
      return { isValid: false, errors };
    }
  }
}