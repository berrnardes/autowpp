import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config();

export default defineConfig({
  schema: './src/database/schemas/*',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
