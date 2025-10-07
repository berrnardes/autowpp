import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpStatus,
  Logger,
  Res
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { MessageProcessorService } from '../services/message-processor.service';
import type { WhatsAppWebhook } from '../interfaces/whatsapp.interface';
import { WhatsAppValidationError } from '../exceptions/whatsapp.exceptions';

@Controller('webhook/whatsapp')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly messageProcessor: MessageProcessorService
  ) { }

  @Get()
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response
  ) {
    try {
      this.logger.log('Webhook verification request received');

      if (mode !== 'subscribe') {
        this.logger.warn('Invalid webhook mode:', mode);
        return res.status(HttpStatus.BAD_REQUEST).send('Invalid mode');
      }

      const challengeResponse = this.whatsAppService.verifyWebhook(verifyToken, challenge);

      if (challengeResponse) {
        this.logger.log('Webhook verification successful');
        return res.status(HttpStatus.OK).send(challengeResponse);
      } else {
        this.logger.warn('Webhook verification failed');
        return res.status(HttpStatus.FORBIDDEN).send('Verification failed');
      }
    } catch (error) {
      this.logger.error('Webhook verification error:', error.stack);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Verification error');
    }
  }

  @Post()
  async handleWebhook(
    @Body() payload: WhatsAppWebhook,
    @Res() res: Response
  ) {
    try {
      this.logger.log('Webhook payload received');

      // Log the raw payload for debugging (remove in production)
      this.logger.debug('Webhook payload:', JSON.stringify(payload, null, 2));

      // Validate webhook signature (in production, you should verify the signature)
      if (!this.isValidWebhookPayload(payload)) {
        throw new WhatsAppValidationError('Invalid webhook payload structure');
      }

      // Process incoming messages
      const incomingMessages = await this.whatsAppService.receiveWebhook(payload);

      if (incomingMessages.length > 0) {
        this.logger.log(`Processing ${incomingMessages.length} incoming messages`);

        // Process each incoming message
        for (const message of incomingMessages) {
          this.logger.log(`Message from ${message.from}: ${message.content}`);

          try {
            // Process and store the message
            const processedMessage = await this.messageProcessor.processIncomingMessage(message);

            this.logger.log(`Message processed - Conversation: ${processedMessage.conversationId}, Should respond: ${processedMessage.shouldRespond}`);

            // TODO: In the next tasks, we'll integrate with:
            // - AI service for generating responses
            // - Automated response sending
            if (processedMessage.shouldRespond) {
              this.logger.log(`Message requires response - will be handled by AI service`);
            }
          } catch (processingError) {
            this.logger.error(`Failed to process message ${message.messageId}:`, processingError.stack);
            // Continue processing other messages even if one fails
          }
        }
      }

      // WhatsApp expects a 200 OK response
      return res.status(HttpStatus.OK).json({ status: 'success' });

    } catch (error) {
      this.logger.error('Webhook processing error:', error.stack);

      if (error instanceof WhatsAppValidationError) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Invalid webhook payload',
          message: error.message
        });
      }

      // Still return 200 to WhatsApp to avoid retries for our internal errors
      return res.status(HttpStatus.OK).json({
        status: 'error',
        message: 'Internal processing error'
      });
    }
  }

  private isValidWebhookPayload(payload: any): payload is WhatsAppWebhook {
    try {
      // Basic validation of webhook structure
      if (!payload || typeof payload !== 'object') {
        return false;
      }

      if (payload.object !== 'whatsapp_business_account') {
        return false;
      }

      if (!Array.isArray(payload.entry)) {
        return false;
      }

      // Validate entry structure
      for (const entry of payload.entry) {
        if (!entry.id || !Array.isArray(entry.changes)) {
          return false;
        }

        for (const change of entry.changes) {
          if (!change.field || !change.value) {
            return false;
          }

          // If it's a message change, validate message structure
          if (change.field === 'messages' && change.value.messages) {
            if (!Array.isArray(change.value.messages)) {
              return false;
            }

            for (const message of change.value.messages) {
              if (!message.id || !message.from || !message.timestamp) {
                return false;
              }
            }
          }
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Webhook validation error:', error);
      return false;
    }
  }

  // Health check endpoint for webhook
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'whatsapp-webhook'
    };
  }
}