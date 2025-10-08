import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WhatsAppService } from './services/whatsapp.service';
import { EncryptionService } from './services/encryption.service';
import { MessageProcessorService } from './services/message-processor.service';
import { WebhookController } from './controllers/webhook.controller';
import { WhatsAppManagementController } from './controllers/whatsapp-management.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [WebhookController, WhatsAppManagementController],
  providers: [WhatsAppService, EncryptionService, MessageProcessorService],
  exports: [WhatsAppService, EncryptionService, MessageProcessorService],
})
export class WhatsAppModule {}