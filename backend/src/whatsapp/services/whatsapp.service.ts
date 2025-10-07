import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  NewWhatsAppAccount,
  WhatsAppAccount,
  whatsappAccounts,
} from '../../database/schema';
import {
  WhatsAppAPIError,
  WhatsAppConnectionError,
  WhatsAppCredentialsError,
  WhatsAppValidationError,
} from '../exceptions/whatsapp.exceptions';
import {
  ConnectionResult,
  IncomingMessage,
  MessageResult,
  WhatsAppCredentials,
  WhatsAppWebhook,
} from '../interfaces/whatsapp.interface';
import { EncryptionService } from './encryption.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiClient: AxiosInstance;
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async connectAccount(
    credentials: WhatsAppCredentials,
  ): Promise<ConnectionResult> {
    try {
      this.logger.log('Attempting to connect WhatsApp account');

      // Validate credentials format
      this.validateCredentials(credentials);

      // Test the connection by making a test API call
      const connectionTest = await this.testConnection(credentials);

      if (!connectionTest.success) {
        throw new WhatsAppCredentialsError(connectionTest.message);
      }

      // Check if account already exists
      const existingAccount = await this.getExistingAccount(
        credentials.phoneNumberId,
      );

      if (existingAccount) {
        // Update existing account
        await this.updateAccount(existingAccount.id, credentials);
        this.logger.log('Updated existing WhatsApp account');
      } else {
        // Create new account
        await this.createAccount(credentials);
        this.logger.log('Created new WhatsApp account');
      }

      return {
        success: true,
        message: 'WhatsApp account connected successfully',
        accountInfo: {
          phoneNumberId: credentials.phoneNumberId,
          businessName: credentials.businessName,
          phoneNumber: credentials.phoneNumber,
        },
      };
    } catch (error) {
      this.logger.error('Failed to connect WhatsApp account', error.stack);

      if (
        error instanceof WhatsAppCredentialsError ||
        error instanceof WhatsAppConnectionError ||
        error instanceof WhatsAppValidationError
      ) {
        throw error;
      }

      throw new WhatsAppConnectionError(
        error.message || 'Unknown connection error',
      );
    }
  }

  async sendMessage(
    phoneNumber: string,
    message: string,
  ): Promise<MessageResult> {
    try {
      this.logger.log(`Sending message to ${phoneNumber}`);

      // Get active account
      const account = await this.getActiveAccount();
      if (!account) {
        throw new WhatsAppConnectionError('No active WhatsApp account found');
      }

      // Validate phone number format
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Validate message content
      this.validateMessage(message);

      // Decrypt access token
      const accessToken = this.encryptionService.decrypt(account.accessToken);

      // Send message via WhatsApp API
      const response = await this.apiClient.post(
        `/${account.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body: message,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      this.logger.log(`Message sent successfully to ${phoneNumber}`);

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send message to ${phoneNumber}`,
        error.stack,
      );

      if (
        error instanceof WhatsAppConnectionError ||
        error instanceof WhatsAppValidationError
      ) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const errorMessage =
          (axiosError.response?.data as any)?.error?.message || axiosError.message;
        throw new WhatsAppAPIError(errorMessage, axiosError.response?.status);
      }

      throw new WhatsAppAPIError(error.message || 'Failed to send message');
    }
  }

  async receiveWebhook(payload: WhatsAppWebhook): Promise<IncomingMessage[]> {
    try {
      this.logger.log('Processing incoming webhook');

      const messages: IncomingMessage[] = [];

      if (payload.object !== 'whatsapp_business_account') {
        throw new WhatsAppValidationError('Invalid webhook object type');
      }

      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value.messages) {
            for (const message of change.value.messages) {
              if (message.type === 'text') {
                const incomingMessage: IncomingMessage = {
                  messageId: message.id,
                  from: message.from,
                  content: message.text.body,
                  timestamp: new Date(parseInt(message.timestamp) * 1000),
                  customerName: change.value.contacts?.[0]?.profile?.name,
                };

                messages.push(incomingMessage);
              }
            }
          }
        }
      }

      this.logger.log(`Processed ${messages.length} incoming messages`);
      return messages;
    } catch (error) {
      this.logger.error('Failed to process webhook', error.stack);
      throw new WhatsAppValidationError(
        error.message || 'Failed to process webhook',
      );
    }
  }

  verifyWebhook(token: string, challenge: string): string | null {
    try {
      this.logger.log('Verifying webhook token');

      // In a real implementation, you would get the verify token from the database
      // For now, we'll use environment variable as fallback
      const expectedToken =
        process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'default-verify-token';

      if (token === expectedToken) {
        this.logger.log('Webhook verification successful');
        return challenge;
      }

      this.logger.warn('Webhook verification failed - invalid token');
      return null;
    } catch (error) {
      this.logger.error('Webhook verification error', error.stack);
      return null;
    }
  }

  async disconnectAccount(): Promise<void> {
    try {
      const db = this.databaseService.getDatabase();
      this.logger.log('Disconnecting WhatsApp account');

      const account = await this.getActiveAccount();
      if (!account) {
        throw new WhatsAppConnectionError('No active account to disconnect');
      }

      await db
        .update(whatsappAccounts)
        .set({
          isConnected: false,
          accessToken: '',
          updatedAt: new Date(),
        })
        .where(eq(whatsappAccounts.id, account.id));

      this.logger.log('WhatsApp account disconnected successfully');
    } catch (error) {
      this.logger.error('Failed to disconnect WhatsApp account', error.stack);
      throw new WhatsAppConnectionError(
        error.message || 'Failed to disconnect account',
      );
    }
  }

  async getConnectionStatus(): Promise<{
    isConnected: boolean;
    accountInfo?: any;
  }> {
    try {
      const account = await this.getActiveAccount();

      if (!account) {
        return { isConnected: false };
      }

      return {
        isConnected: account.isConnected!,
        accountInfo: {
          phoneNumberId: account.phoneNumberId,
          businessName: account.businessName,
          phoneNumber: account.phoneNumber,
          connectedAt: account.createdAt,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get connection status', error.stack);
      return { isConnected: false };
    }
  }

  private validateCredentials(credentials: WhatsAppCredentials): void {
    if (!credentials.phoneNumberId || credentials.phoneNumberId.trim() === '') {
      throw new WhatsAppValidationError('Phone Number ID is required');
    }

    if (!credentials.accessToken || credentials.accessToken.trim() === '') {
      throw new WhatsAppValidationError('Access Token is required');
    }

    if (
      !credentials.webhookVerifyToken ||
      credentials.webhookVerifyToken.trim() === ''
    ) {
      throw new WhatsAppValidationError('Webhook Verify Token is required');
    }

    // Validate phone number ID format (should be numeric)
    if (!/^\d+$/.test(credentials.phoneNumberId)) {
      throw new WhatsAppValidationError('Phone Number ID must be numeric');
    }
  }

  private async testConnection(
    credentials: WhatsAppCredentials,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Test the connection by getting phone number info
      const response = await this.apiClient.get(
        `/${credentials.phoneNumberId}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
          },
        },
      );

      if (response.status === 200) {
        return { success: true, message: 'Connection test successful' };
      }

      return { success: false, message: 'Connection test failed' };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const errorMessage =
          (axiosError.response?.data as any)?.error?.message || 'Invalid credentials';
        return { success: false, message: errorMessage };
      }

      return {
        success: false,
        message: error.message || 'Connection test failed',
      };
    }
  }

  private async getExistingAccount(
    phoneNumberId: string,
  ): Promise<WhatsAppAccount | null> {
    const db = this.databaseService.getDatabase();
    const accounts = await db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.phoneNumberId, phoneNumberId))
      .limit(1);

    return accounts[0] || null;
  }

  private async createAccount(credentials: WhatsAppCredentials): Promise<void> {
    const db = this.databaseService.getDatabase();
    const encryptedToken = this.encryptionService.encrypt(
      credentials.accessToken,
    );

    const newAccount: NewWhatsAppAccount = {
      phoneNumberId: credentials.phoneNumberId,
      accessToken: encryptedToken,
      webhookVerifyToken: credentials.webhookVerifyToken,
      isConnected: true,
      businessName: credentials.businessName,
      phoneNumber: credentials.phoneNumber,
    };

    await db.insert(whatsappAccounts).values(newAccount);
  }

  private async updateAccount(
    accountId: string,
    credentials: WhatsAppCredentials,
  ): Promise<void> {
    const db = this.databaseService.getDatabase();

    const encryptedToken = this.encryptionService.encrypt(
      credentials.accessToken,
    );

    await db
      .update(whatsappAccounts)
      .set({
        accessToken: encryptedToken,
        webhookVerifyToken: credentials.webhookVerifyToken,
        isConnected: true,
        businessName: credentials.businessName,
        phoneNumber: credentials.phoneNumber,
        updatedAt: new Date(),
      })
      .where(eq(whatsappAccounts.id, accountId));
  }

  private async getActiveAccount(): Promise<WhatsAppAccount | null> {
    const db = this.databaseService.getDatabase();
    const accounts = await db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.isConnected, true))
      .limit(1);

    return accounts[0] || null;
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    let formatted = phoneNumber.replace(/\D/g, '');

    // Add country code if not present (assuming US +1 for demo)
    if (!formatted.startsWith('1') && formatted.length === 10) {
      formatted = '1' + formatted;
    }

    return formatted;
  }

  private validateMessage(message: string): void {
    if (!message || message.trim() === '') {
      throw new WhatsAppValidationError('Message content cannot be empty');
    }

    if (message.length > 4096) {
      throw new WhatsAppValidationError(
        'Message content exceeds maximum length of 4096 characters',
      );
    }
  }
}
