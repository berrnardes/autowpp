import { Module } from '@nestjs/common';
import { ConversationController } from './controllers/conversation.controller';
import { ConversationService } from './services/conversation.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ConversationController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationsModule {}