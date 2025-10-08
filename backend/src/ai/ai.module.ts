import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { ProductsModule } from '../products/products.module';
import { AIService } from './services/ai.service';
import { ConversationContextService } from './services/conversation-context.service';
import { ConversationGoalService } from './services/conversation-goal.service';
import { ConversationTrainingService } from './services/conversation-training.service';
import { AIProductIntegrationService } from './services/ai-product-integration.service';
import { ConfidenceScoringService } from './services/confidence-scoring.service';
import { EscalationService } from './services/escalation.service';
import { ConversationGoalController } from './controllers/conversation-goal.controller';
import { ConversationTrainingController } from './controllers/conversation-training.controller';
import { AIProductController } from './controllers/ai-product.controller';
import { EscalationController } from './controllers/escalation.controller';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ProductsModule
  ],
  controllers: [
    ConversationGoalController,
    ConversationTrainingController,
    AIProductController,
    EscalationController
  ],
  providers: [
    AIService,
    ConversationContextService,
    ConversationGoalService,
    ConversationTrainingService,
    AIProductIntegrationService,
    ConfidenceScoringService,
    EscalationService
  ],
  exports: [
    AIService,
    ConversationContextService,
    ConversationGoalService,
    ConversationTrainingService,
    AIProductIntegrationService,
    ConfidenceScoringService,
    EscalationService
  ],
})
export class AiModule {}