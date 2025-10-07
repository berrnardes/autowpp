import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AIService } from './services/ai.service';
import { ConversationContextService } from './services/conversation-context.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule
  ],
  controllers: [],
  providers: [
    AIService,
    ConversationContextService
  ],
  exports: [
    AIService,
    ConversationContextService
  ],
})
export class AiModule {}