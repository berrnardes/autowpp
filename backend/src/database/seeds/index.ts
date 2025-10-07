import { config } from 'dotenv';
import { seedInitialAIConfiguration, seedDevelopmentData } from './initial-ai-config.seed';
import { pool } from '../connection';

// Load environment variables
config();

async function runSeeds() {
  console.log('🚀 Starting database seeding...');
  
  try {
    // Run initial AI configuration seeding
    await seedInitialAIConfiguration();
    
    // Run development data seeding if in development mode
    if (process.env.NODE_ENV === 'development') {
      await seedDevelopmentData();
    }
    
    console.log('✅ All seeds completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run seeds if this file is executed directly
if (require.main === module) {
  runSeeds();
}

export { runSeeds, seedInitialAIConfiguration, seedDevelopmentData };