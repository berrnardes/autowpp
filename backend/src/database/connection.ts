import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  aiConfiguration,
  conversationExamples,
  conversations,
  messages,
  products,
  whatsappAccounts,
} from './schema';

config();

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: false, // Disable SSL for local development
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
