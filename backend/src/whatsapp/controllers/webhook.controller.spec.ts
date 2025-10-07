import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { WhatsAppService } from '../services/whatsapp.service';
import { MessageProcessorService } from '../services/message-processor.service';
import { Response, Request } from 'express';
import { WhatsAppWebhook, IncomingMessage } from '../interfaces/whatsapp.interface';

describe('WebhookController', () => {
  let controller: WebhookController;
  let whatsAppService: WhatsAppService;
  let messageProcessorService: MessageProcessorService;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;

  const mockIncomingMessage: IncomingMessage = {
    messageId: 'msg_123',
    from: '1234567890',
    content: 'Hello World',
    timestamp: new Date(),
    customerName: 'John Doe'
  };

  const mockWebhookPayload: WhatsAppWebhook = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'entry_123',
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
            id: 'msg_123',
            timestamp: '1640995200',
            text: { body: 'Hello World' },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };

  beforeEach(async () => {
    const mockWhatsAppService = {
      verifyWebhook: jest.fn(),
      receiveWebhook: jest.fn()
    };

    const mockMessageProcessorService = {
      processIncomingMessage: jest.fn()
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockRequest = {
      body: {},
      headers: {}
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: WhatsAppService,
          useValue: mockWhatsAppService
        },
        {
          provide: MessageProcessorService,
          useValue: mockMessageProcessorService
        }
      ]
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    whatsAppService = module.get<WhatsAppService>(WhatsAppService);
    messageProcessorService = module.get<MessageProcessorService>(MessageProcessorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyWebhook', () => {
    it('should verify webhook with valid token and return challenge', async () => {
      const challenge = 'test_challenge_123';
      jest.spyOn(whatsAppService, 'verifyWebhook').mockReturnValue(challenge);

      await controller.verifyWebhook(
        'subscribe',
        'valid_token',
        challenge,
        mockResponse as Response
      );

      expect(whatsAppService.verifyWebhook).toHaveBeenCalledWith('valid_token', challenge);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(challenge);
    });

    it('should reject webhook with invalid mode', async () => {
      await controller.verifyWebhook(
        'invalid_mode',
        'valid_token',
        'challenge',
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith('Invalid mode');
    });

    it('should reject webhook with invalid token', async () => {
      jest.spyOn(whatsAppService, 'verifyWebhook').mockReturnValue(null);

      await controller.verifyWebhook(
        'subscribe',
        'invalid_token',
        'challenge',
        mockResponse as Response
      );

      expect(whatsAppService.verifyWebhook).toHaveBeenCalledWith('invalid_token', 'challenge');
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.send).toHaveBeenCalledWith('Verification failed');
    });

    it('should handle verification errors gracefully', async () => {
      jest.spyOn(whatsAppService, 'verifyWebhook').mockImplementation(() => {
        throw new Error('Verification error');
      });

      await controller.verifyWebhook(
        'subscribe',
        'token',
        'challenge',
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith('Verification error');
    });
  });

  describe('handleWebhook', () => {
    it('should process valid webhook payload successfully', async () => {
      jest.spyOn(whatsAppService, 'receiveWebhook').mockResolvedValue([mockIncomingMessage]);
      jest.spyOn(messageProcessorService, 'processIncomingMessage').mockResolvedValue({
        conversationId: 'conv_123',
        messageId: 'msg_456',
        shouldRespond: true,
        context: {}
      });

      await controller.handleWebhook(
        mockWebhookPayload,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(whatsAppService.receiveWebhook).toHaveBeenCalledWith(mockWebhookPayload);
      expect(messageProcessorService.processIncomingMessage).toHaveBeenCalledWith(mockIncomingMessage);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ status: 'success' });
    });

    it('should handle webhook with no messages', async () => {
      jest.spyOn(whatsAppService, 'receiveWebhook').mockResolvedValue([]);

      await controller.handleWebhook(
        mockWebhookPayload,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(whatsAppService.receiveWebhook).toHaveBeenCalledWith(mockWebhookPayload);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ status: 'success' });
    });

    it('should reject invalid webhook payload structure', async () => {
      const invalidPayload = {
        object: 'invalid_object',
        entry: []
      };

      await controller.handleWebhook(
        invalidPayload as any,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid webhook payload',
        message: expect.stringContaining('Invalid webhook payload structure')
      });
    });

    it('should handle processing errors gracefully', async () => {
      jest.spyOn(whatsAppService, 'receiveWebhook').mockResolvedValue([mockIncomingMessage]);
      jest.spyOn(messageProcessorService, 'processIncomingMessage').mockRejectedValue(
        new Error('Processing error')
      );

      await controller.handleWebhook(
        mockWebhookPayload,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ status: 'success' });
    });

    it('should validate webhook payload structure correctly', async () => {
      const validPayload = mockWebhookPayload;
      jest.spyOn(whatsAppService, 'receiveWebhook').mockResolvedValue([]);

      await controller.handleWebhook(
        validPayload,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should reject payload with missing required fields', async () => {
      const invalidPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'entry_123',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              messages: [{
                // Missing required fields like 'id', 'from', 'timestamp'
                text: { body: 'Hello' },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      await controller.handleWebhook(
        invalidPayload as any,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', () => {
      const result = controller.healthCheck();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        service: 'whatsapp-webhook'
      });
    });
  });

  describe('isValidWebhookPayload', () => {
    it('should validate correct webhook structure', () => {
      // Access private method for testing
      const isValid = (controller as any).isValidWebhookPayload(mockWebhookPayload);
      expect(isValid).toBe(true);
    });

    it('should reject null or undefined payload', () => {
      const isValidNull = (controller as any).isValidWebhookPayload(null);
      const isValidUndefined = (controller as any).isValidWebhookPayload(undefined);
      
      expect(isValidNull).toBe(false);
      expect(isValidUndefined).toBe(false);
    });

    it('should reject payload with wrong object type', () => {
      const invalidPayload = {
        ...mockWebhookPayload,
        object: 'wrong_object'
      };

      const isValid = (controller as any).isValidWebhookPayload(invalidPayload);
      expect(isValid).toBe(false);
    });

    it('should reject payload with invalid entry structure', () => {
      const invalidPayload = {
        ...mockWebhookPayload,
        entry: 'not_an_array'
      };

      const isValid = (controller as any).isValidWebhookPayload(invalidPayload);
      expect(isValid).toBe(false);
    });
  });
});