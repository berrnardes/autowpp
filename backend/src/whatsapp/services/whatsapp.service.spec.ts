import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from './whatsapp.service';
import { EncryptionService } from './encryption.service';
import { DatabaseService } from '../../database/database.service';
import { WhatsAppCredentials } from '../interfaces/whatsapp.interface';
import {
  WhatsAppConnectionError,
  WhatsAppCredentialsError,
  WhatsAppValidationError
} from '../exceptions/whatsapp.exceptions';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn()
  })),
  isAxiosError: jest.fn()
}));

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let encryptionService: EncryptionService;
  let mockDb: any;
  let mockAxiosInstance: any;

  const mockCredentials: WhatsAppCredentials = {
    phoneNumberId: '123456789',
    accessToken: 'test-access-token',
    webhookVerifyToken: 'test-verify-token',
    businessName: 'Test Business',
    phoneNumber: '+1234567890'
  };

  beforeEach(async () => {
    // Mock database
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };

    // Mock DatabaseService
    const mockDatabaseService = {
      getDatabase: jest.fn().mockReturnValue(mockDb)
    };

    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn()
    };

    const axios = require('axios');
    axios.create.mockReturnValue(mockAxiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        EncryptionService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService
        }
      ]
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connectAccount', () => {
    it('should successfully connect a new WhatsApp account', async () => {
      // Mock successful API test
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      // Mock no existing account
      mockDb.limit.mockResolvedValue([]);

      const result = await service.connectAccount(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.message).toBe('WhatsApp account connected successfully');
      expect(result.accountInfo?.phoneNumberId).toBe(mockCredentials.phoneNumberId);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should update existing WhatsApp account', async () => {
      // Mock successful API test
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      // Mock existing account
      const existingAccount = { id: 'existing-id', phoneNumberId: mockCredentials.phoneNumberId };
      mockDb.limit.mockResolvedValue([existingAccount]);

      const result = await service.connectAccount(mockCredentials);

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw WhatsAppValidationError for invalid credentials', async () => {
      const invalidCredentials = { ...mockCredentials, phoneNumberId: '' };

      await expect(service.connectAccount(invalidCredentials))
        .rejects.toThrow(WhatsAppValidationError);
    });

    it('should throw WhatsAppCredentialsError for failed connection test', async () => {
      // Mock failed API test
      mockAxiosInstance.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(service.connectAccount(mockCredentials))
        .rejects.toThrow(WhatsAppCredentialsError);
    });

    it('should validate phone number ID format', async () => {
      const invalidCredentials = { ...mockCredentials, phoneNumberId: 'invalid-id' };

      await expect(service.connectAccount(invalidCredentials))
        .rejects.toThrow(WhatsAppValidationError);
    });
  });

  describe('sendMessage', () => {
    const mockAccount = {
      id: 'account-id',
      phoneNumberId: '123456789',
      accessToken: 'encrypted-token',
      isConnected: true
    };

    beforeEach(() => {
      // Mock encryption/decryption
      jest.spyOn(encryptionService, 'decrypt').mockReturnValue('decrypted-token');
    });

    it('should successfully send a message', async () => {
      // Mock active account
      mockDb.limit.mockResolvedValue([mockAccount]);

      // Mock successful API call
      mockAxiosInstance.post.mockResolvedValue({
        data: { messages: [{ id: 'message-id' }] }
      });

      const result = await service.sendMessage('+1234567890', 'Hello World');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('message-id');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/123456789/messages',
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '1234567890',
          type: 'text',
          text: { body: 'Hello World' }
        }),
        expect.objectContaining({
          headers: { Authorization: 'Bearer decrypted-token' }
        })
      );
    });

    it('should throw WhatsAppConnectionError when no active account', async () => {
      // Mock no active account
      mockDb.limit.mockResolvedValue([]);

      await expect(service.sendMessage('+1234567890', 'Hello'))
        .rejects.toThrow(WhatsAppConnectionError);
    });

    it('should validate message content', async () => {
      // Mock active account
      mockDb.limit.mockResolvedValue([mockAccount]);

      await expect(service.sendMessage('+1234567890', ''))
        .rejects.toThrow(WhatsAppValidationError);
    });

    it('should format phone numbers correctly', async () => {
      // Mock active account
      mockDb.limit.mockResolvedValue([mockAccount]);

      // Mock successful API call
      mockAxiosInstance.post.mockResolvedValue({
        data: { messages: [{ id: 'message-id' }] }
      });

      await service.sendMessage('(123) 456-7890', 'Hello');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          to: '1234567890'
        }),
        expect.any(Object)
      );
    });
  });

  describe('receiveWebhook', () => {
    const mockWebhook = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'entry-id',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '1234567890',
              phone_number_id: '123456789'
            },
            contacts: [{
              profile: { name: 'John Doe' },
              wa_id: '1234567890'
            }],
            messages: [{
              from: '1234567890',
              id: 'message-id',
              timestamp: '1640995200',
              text: { body: 'Hello' },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };

    it('should successfully process incoming webhook', async () => {
      const messages = await service.receiveWebhook(mockWebhook);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        messageId: 'message-id',
        from: '1234567890',
        content: 'Hello',
        timestamp: new Date(1640995200 * 1000),
        customerName: 'John Doe'
      });
    });

    it('should throw WhatsAppValidationError for invalid webhook object', async () => {
      const invalidWebhook = { ...mockWebhook, object: 'invalid' };

      await expect(service.receiveWebhook(invalidWebhook))
        .rejects.toThrow(WhatsAppValidationError);
    });

    it('should handle webhook with no messages', async () => {
      const emptyWebhook = {
        ...mockWebhook,
        entry: [{
          ...mockWebhook.entry[0],
          changes: [{
            ...mockWebhook.entry[0].changes[0],
            value: {
              ...mockWebhook.entry[0].changes[0].value,
              messages: undefined
            }
          }]
        }]
      };

      const messages = await service.receiveWebhook(emptyWebhook);
      expect(messages).toHaveLength(0);
    });
  });

  describe('verifyWebhook', () => {
    it('should return challenge for valid token', () => {
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'valid-token';

      const result = service.verifyWebhook('valid-token', 'challenge-string');

      expect(result).toBe('challenge-string');
    });

    it('should return null for invalid token', () => {
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'valid-token';

      const result = service.verifyWebhook('invalid-token', 'challenge-string');

      expect(result).toBeNull();
    });
  });

  describe('disconnectAccount', () => {
    it('should successfully disconnect active account', async () => {
      const mockAccount = { id: 'account-id', isConnected: true };
      mockDb.limit.mockResolvedValue([mockAccount]);

      await service.disconnectAccount();

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          isConnected: false,
          accessToken: ''
        })
      );
    });

    it('should throw WhatsAppConnectionError when no active account', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(service.disconnectAccount())
        .rejects.toThrow(WhatsAppConnectionError);
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status for active account', async () => {
      const mockAccount = {
        id: 'account-id',
        phoneNumberId: '123456789',
        businessName: 'Test Business',
        phoneNumber: '+1234567890',
        isConnected: true,
        createdAt: new Date()
      };
      mockDb.limit.mockResolvedValue([mockAccount]);

      const status = await service.getConnectionStatus();

      expect(status.isConnected).toBe(true);
      expect(status.accountInfo?.phoneNumberId).toBe('123456789');
    });

    it('should return disconnected status when no account', async () => {
      mockDb.limit.mockResolvedValue([]);

      const status = await service.getConnectionStatus();

      expect(status.isConnected).toBe(false);
      expect(status.accountInfo).toBeUndefined();
    });
  });
});