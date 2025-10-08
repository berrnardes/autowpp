import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { ConversationsModule } from '../conversations/conversations.module';
import { ProductsModule } from '../products/products.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    ConversationsModule,
    ProductsModule,
    WhatsAppModule,
    AiModule
  ],
  controllers: [DashboardController],
  providers: [],
  exports: [],
})
export class DashboardModule {}