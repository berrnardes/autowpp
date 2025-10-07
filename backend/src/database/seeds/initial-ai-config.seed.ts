import { db } from '../connection';
import { aiConfiguration, conversationExamples } from '../schema';
import { ConversationGoal } from '../schema';

export async function seedInitialAIConfiguration() {
  console.log('🌱 Seeding initial AI configuration...');

  try {
    // Check if AI configuration already exists
    const existingConfig = await db.select().from(aiConfiguration).limit(1);
    
    if (existingConfig.length === 0) {
      // Insert default AI configuration
      await db.insert(aiConfiguration).values({
        conversationGoal: ConversationGoal.HELPFUL,
        confidenceThreshold: '0.80',
        responseStyle: 'friendly and professional',
        fallbackMessage: 'I apologize, but I need to connect you with a human representative who can better assist you. Please hold on while I transfer your conversation.',
        businessHours: {
          timezone: 'UTC',
          schedule: {
            monday: { start: '09:00', end: '17:00', active: true },
            tuesday: { start: '09:00', end: '17:00', active: true },
            wednesday: { start: '09:00', end: '17:00', active: true },
            thursday: { start: '09:00', end: '17:00', active: true },
            friday: { start: '09:00', end: '17:00', active: true },
            saturday: { start: '10:00', end: '14:00', active: false },
            sunday: { start: '10:00', end: '14:00', active: false }
          }
        },
        enableManualReview: true
      });
      
      console.log('✅ Default AI configuration created');
    } else {
      console.log('ℹ️  AI configuration already exists, skipping...');
    }

    // Check if conversation examples exist
    const existingExamples = await db.select().from(conversationExamples).limit(1);
    
    if (existingExamples.length === 0) {
      // Insert sample conversation examples
      const sampleExamples = [
        {
          customerMessage: 'Hello, I need help with my order',
          desiredResponse: 'Hello! I\'d be happy to help you with your order. Could you please provide me with your order number or the email address you used to place the order?',
          category: 'support'
        },
        {
          customerMessage: 'What products do you have?',
          desiredResponse: 'We have a variety of products available! Let me show you our current catalog. What type of product are you looking for specifically?',
          category: 'product_inquiry'
        },
        {
          customerMessage: 'How much does shipping cost?',
          desiredResponse: 'Our shipping costs depend on your location and the size of your order. For orders over $50, we offer free standard shipping. Would you like me to calculate the shipping cost for a specific order?',
          category: 'shipping'
        },
        {
          customerMessage: 'Can I return this item?',
          desiredResponse: 'Yes, we accept returns within 30 days of purchase for most items in their original condition. Could you tell me which item you\'d like to return so I can provide specific return instructions?',
          category: 'returns'
        },
        {
          customerMessage: 'Thank you for your help',
          desiredResponse: 'You\'re very welcome! I\'m glad I could help. If you have any other questions, feel free to ask anytime. Have a great day!',
          category: 'gratitude'
        }
      ];

      await db.insert(conversationExamples).values(sampleExamples);
      console.log('✅ Sample conversation examples created');
    } else {
      console.log('ℹ️  Conversation examples already exist, skipping...');
    }

    console.log('🎉 AI configuration seeding completed successfully');
  } catch (error) {
    console.error('❌ Error seeding AI configuration:', error);
    throw error;
  }
}

export async function seedDevelopmentData() {
  console.log('🌱 Seeding development data...');

  try {
    // Add more comprehensive conversation examples for development
    const developmentExamples = [
      {
        customerMessage: 'I want to buy something but I\'m not sure what',
        desiredResponse: 'I\'d love to help you find the perfect product! What are you looking to use it for? Are you shopping for yourself or as a gift for someone?',
        category: 'sales'
      },
      {
        customerMessage: 'Is this item in stock?',
        desiredResponse: 'Let me check the availability for you right away. Could you please tell me which specific item you\'re interested in?',
        category: 'inventory'
      },
      {
        customerMessage: 'I have a complaint about my recent purchase',
        desiredResponse: 'I\'m sorry to hear you\'re having an issue with your recent purchase. I want to make sure we resolve this for you quickly. Could you please describe what happened?',
        category: 'complaint'
      },
      {
        customerMessage: 'Do you offer bulk discounts?',
        desiredResponse: 'Yes, we do offer bulk pricing for larger orders! The discount depends on the quantity and specific products. How many items are you looking to purchase?',
        category: 'pricing'
      }
    ];

    // Only add if we're in development mode
    if (process.env.NODE_ENV === 'development') {
      await db.insert(conversationExamples).values(developmentExamples);
      console.log('✅ Development conversation examples added');
    }

    console.log('🎉 Development data seeding completed');
  } catch (error) {
    console.error('❌ Error seeding development data:', error);
    throw error;
  }
}