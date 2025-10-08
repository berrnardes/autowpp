import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { db, pool } from './connection';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { seedInitialAIConfiguration } from './seeds/initial-ai-config.seed';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private database: ReturnType<typeof drizzle>;

  constructor() {
    this.database = db;
  }

  async onModuleInit() {
    await this.checkConnection();
    await this.runMigrations();
    await this.seedInitialData();
  }

  async onModuleDestroy() {
    await this.closeConnection();
  }

  getDatabase() {
    return this.database;
  }

  getConnection(): Pool {
    return pool;
  }

  /**
   * Check database connection health
   */
  async checkConnection(): Promise<boolean> {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.logger.log('✅ Database connection verified');
      return true;
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<void> {
    try {
      this.logger.log('🔄 Running database migrations...');
      await migrate(this.database, {
        migrationsFolder: './src/database/migrations'
      });
      this.logger.log('✅ Database migrations completed');
    } catch (error) {
      this.logger.error('❌ Migration failed:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Seed initial data if needed
   */
  async seedInitialData(): Promise<void> {
    try {
      this.logger.log('🌱 Checking for initial data seeding...');
      await seedInitialAIConfiguration();
      this.logger.log('✅ Initial data seeding completed');
    } catch (error) {
      this.logger.error('❌ Initial data seeding failed:', error);
      // Don't throw here as seeding failure shouldn't prevent app startup
    }
  }

  /**
   * Execute a transaction
   */
  async executeTransaction<T>(
    callback: (tx: PgTransaction<NodePgQueryResultHKT, Record<string, unknown>>) => Promise<T>
  ): Promise<T> {
    return await this.database.transaction(callback);
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    totalConnections: number;
    idleConnections: number;
    waitingCount: number;
  }> {
    return {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }

  /**
   * Test database performance
   */
  async testPerformance(): Promise<{ queryTime: number; connectionTime: number }> {
    const connectionStart = Date.now();
    const client = await pool.connect();
    const connectionTime = Date.now() - connectionStart;

    const queryStart = Date.now();
    await client.query('SELECT 1');
    const queryTime = Date.now() - queryStart;

    client.release();

    return { queryTime, connectionTime };
  }

  /**
   * Close database connection
   */
  async closeConnection(): Promise<void> {
    try {
      await pool.end();
      this.logger.log('🔌 Database connection closed');
    } catch (error) {
      this.logger.error('❌ Error closing database connection:', error);
    }
  }

  /**
   * Execute raw SQL query (use with caution)
   */
  async executeRawQuery(query: string, params?: any[]): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
}