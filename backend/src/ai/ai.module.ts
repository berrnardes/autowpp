import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { ProductsModule } from '../products/products.module';
import { AIService } from './services/ai.service';
import { ConversationContextService } from './services/conversation-context.service';
import { ConversationGoalService } from './services/conversation-goal.service';
import { ConversationTrainingService } from './services/conversation-training.service';
import { AIProductIntegrationService } from './services/ai-product-integration.service';
import { ConversationGoalController } from './controllers/conversation-goal.controller';
import { ConversationTrainingController } from './controllers/conversation-training.controller';
import { AIProductController } from './controllers/ai-product.controller';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ProductsModule
  ],
  controllers: [
    ConversationGoalController,
    ConversationTrainingController,
    AIProductController
  ],
  providers: [
    AIService,
    ConversationContextService,
    ConversationGoalService,
    ConversationTrainingService,
    AIProductIntegrationService
  ],
  exports: [
    AIService,
    ConversationContextService,
    ConversationGoalService,
    ConversationTrainingService,
    AIProductIntegrationService
  ],
})
export class AiModule {}