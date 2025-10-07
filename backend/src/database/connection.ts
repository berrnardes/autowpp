import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getDatabaseConfig } from './config';
import {
  aiConfiguration,
  conversationExamples,
  conversations,
  messages,
  products,
  whatsappAccounts,
} from './schema';

// Get database configuration
const dbConfig = getDatabaseConfig();

// Create connection pool
const pool = new Pool({
  connectionString: dbConfig.url,
  max: dbConfig.maxConnections,
  idleTimeoutMillis: dbConfig.idleTimeoutMs,
  connectionTimeoutMillis: dbConfig.connectionTimeoutMs,
  ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Create Drizzle instance
export const db = drizzle(pool, {
  schema: {
    aiConfiguration,
    conversationExamples,
    conversations,
    messages,
    products,
    whatsappAccounts,
  },
});

// Export pool for health checks
export { pool };
