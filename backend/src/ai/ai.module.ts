import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AIService } from './services/ai.service';
import { ConversationContextService } from './services/conversation-context.service';
import { ConversationGoalService } from './services/conversation-goal.service';
import { ConversationTrainingService } from './services/conversation-training.service';
import { ConversationGoalController } from './controllers/conversation-goal.controller';
import { ConversationTrainingController } from './controllers/conversation-training.controller';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule
  ],
  controllers: [
    ConversationGoalController,
    ConversationTrainingController
  ],
  providers: [
    AIService,
    ConversationContextService,
    ConversationGoalService,
    ConversationTrainingService
  ],
  exports: [
    AIService,
    ConversationContextService,
    ConversationGoalService,
    ConversationTrainingService
  ],
})
export class AiModule {}