import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  HttpStatus,
  HttpCode,
  BadRequestException,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger';
import { WhatsAppService } from '../services/whatsapp.service';
import { WhatsAppCredentialsDto } from '../dto/whatsapp-credentials.dto';
import type { WhatsAppAccount } from '../../database/schema';

interface ConnectionStatus {
  isConnected: boolean;
  account?: {
    id: string;
    phoneNumber: string;
    businessName: string;
    phoneNumberId: string;
    connectedAt: Date;
  };
  lastChecked: Date;
  error?: string;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    phoneNumberId: string;
    businessName?: string;
    phoneNumber?: string;
  };
  error?: string;
}

interface SendTestMessageDto {
  phoneNumber: string;
  message: string;
}

@ApiTags('WhatsApp Management')
@Controller('api/whatsapp')
export class WhatsAppManagementController {
  private readonly logger = new Logger(WhatsAppManagementController.name);

  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Get('status')
  @ApiOperation({ 
    summary: 'Get WhatsApp connection status',
    description: 'Returns the current WhatsApp Business API connection status'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connection status returned successfully'
  })
  async getConnectionStatus(): Promise<ConnectionStatus> {
    try {
      const status = await this.whatsAppService.getConnectionStatus();
      
      if (!status.isConnected) {
        return {
          isConnected: false,
          lastChecked: new Date()
        };
      }

      return {
        isConnected: status.isConnected,
        account: status.accountInfo ? {
          id: status.accountInfo.phoneNumberId, // Using phoneNumberId as ID since that's what's available
          phoneNumber: status.accountInfo.phoneNumber || 'Not available',
          businessName: status.accountInfo.businessName || 'Not available',
          phoneNumberId: status.accountInfo.phoneNumberId,
          connectedAt: status.accountInfo.connectedAt || new Date()
        } : undefined,
        lastChecked: new Date()
      };
    } catch (error) {
      this.logger.error('Error getting connection status:', error);
      return {
        isConnected: false,
        lastChecked: new Date(),
        error: error.message
      };
    }
  }

  @Post('connect')
  @ApiOperation({ 
    summary: 'Connect WhatsApp Business account',
    description: 'Establishes connection with WhatsApp Business API using provided credentials'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'WhatsApp account connected successfully'
  })
  @ApiBadRequestResponse({ description: 'Invalid credentials provided' })
  @ApiInternalServerErrorResponse({ description: 'Connection failed' })
  @HttpCode(HttpStatus.CREATED)
  async connectAccount(
    @Body() credentialsDto: WhatsAppCredentialsDto
  ): Promise<{
    success: boolean;
    message: string;
    account?: WhatsAppAccount;
  }> {
    try {
      this.logger.log('Attempting to connect WhatsApp account');

      // Validate credentials format
      if (!credentialsDto.phoneNumberId?.trim()) {
        throw new BadRequestException('Phone Number ID is required');
      }

      if (!credentialsDto.accessToken?.trim()) {
        throw new BadRequestException('Access Token is required');
      }

      if (!credentialsDto.webhookVerifyToken?.trim()) {
        throw new BadRequestException('Webhook Verify Token is required');
      }

      // Attempt to connect
      const result = await this.whatsAppService.connectAccount({
        phoneNumberId: credentialsDto.phoneNumberId,
        accessToken: credentialsDto.accessToken,
        webhookVerifyToken: credentialsDto.webhookVerifyToken,
        businessName: credentialsDto.businessName,
        phoneNumber: credentialsDto.phoneNumber
      });

      if (result.success) {
        this.logger.log('WhatsApp account connected successfully');
        return {
          success: true,
          message: result.message,
          account: undefined // The service doesn't return account in the interface
        };
      } else {
        throw new BadRequestException(result.message || 'Failed to connect WhatsApp account');
      }
    } catch (error) {
      this.logger.error('Error connecting WhatsApp account:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Connection failed: ${error.message}`);
    }
  }

  @Put('update')
  @ApiOperation({ 
    summary: 'Update WhatsApp account credentials',
    description: 'Updates the credentials for the connected WhatsApp Business account'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'WhatsApp account updated successfully'
  })
  @ApiBadRequestResponse({ description: 'Invalid credentials provided' })
  @ApiInternalServerErrorResponse({ description: 'Update failed' })
  async updateAccount(
    @Body() credentialsDto: Partial<WhatsAppCredentialsDto>
  ): Promise<{
    success: boolean;
    message: string;
    account?: WhatsAppAccount;
  }> {
    try {
      this.logger.log('Attempting to update WhatsApp account');

      // For now, we'll implement a simple update by reconnecting with new credentials
      // This is a simplified approach since the service doesn't have a direct update method
      if (credentialsDto.phoneNumberId && credentialsDto.accessToken && credentialsDto.webhookVerifyToken) {
        const result = await this.whatsAppService.connectAccount({
          phoneNumberId: credentialsDto.phoneNumberId,
          accessToken: credentialsDto.accessToken,
          webhookVerifyToken: credentialsDto.webhookVerifyToken,
          businessName: credentialsDto.businessName,
          phoneNumber: credentialsDto.phoneNumber
        });

        if (result.success) {
          this.logger.log('WhatsApp account updated successfully');
          return {
            success: true,
            message: 'WhatsApp account updated successfully',
            account: undefined
          };
        } else {
          throw new BadRequestException(result.message || 'Failed to update WhatsApp account');
        }
      } else {
        throw new BadRequestException('Phone Number ID, Access Token, and Webhook Verify Token are required for update');
      }
    } catch (error) {
      this.logger.error('Error updating WhatsApp account:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Update failed: ${error.message}`);
    }
  }

  @Delete('disconnect')
  @ApiOperation({ 
    summary: 'Disconnect WhatsApp account',
    description: 'Disconnects the current WhatsApp Business account and removes credentials'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'WhatsApp account disconnected successfully'
  })
  @ApiInternalServerErrorResponse({ description: 'Disconnection failed' })
  async disconnectAccount(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.logger.log('Attempting to disconnect WhatsApp account');

      await this.whatsAppService.disconnectAccount();

      this.logger.log('WhatsApp account disconnected successfully');
      return {
        success: true,
        message: 'WhatsApp account disconnected successfully'
      };
    } catch (error) {
      this.logger.error('Error disconnecting WhatsApp account:', error);
      throw new InternalServerErrorException(`Disconnection failed: ${error.message}`);
    }
  }

  @Post('test-connection')
  @ApiOperation({ 
    summary: 'Test WhatsApp connection',
    description: 'Tests the current WhatsApp Business API connection'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connection test completed'
  })
  @HttpCode(HttpStatus.OK)
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      this.logger.log('Testing WhatsApp connection');

      const status = await this.whatsAppService.getConnectionStatus();
      
      if (!status.isConnected) {
        return {
          success: false,
          message: 'No WhatsApp account is connected',
          error: 'No account found'
        };
      }

      return {
        success: true,
        message: 'WhatsApp connection is working properly',
        details: status.accountInfo ? {
          phoneNumberId: status.accountInfo.phoneNumberId,
          businessName: status.accountInfo.businessName || undefined,
          phoneNumber: status.accountInfo.phoneNumber || undefined
        } : undefined
      };
    } catch (error) {
      this.logger.error('Error testing WhatsApp connection:', error);
      return {
        success: false,
        message: 'Connection test failed',
        error: error.message
      };
    }
  }

  @Post('send-test-message')
  @ApiOperation({ 
    summary: 'Send test message',
    description: 'Sends a test message through WhatsApp to verify the connection'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test message sent successfully'
  })
  @ApiBadRequestResponse({ description: 'Invalid message data' })
  @ApiInternalServerErrorResponse({ description: 'Failed to send message' })
  @HttpCode(HttpStatus.OK)
  async sendTestMessage(
    @Body() sendTestDto: SendTestMessageDto
  ): Promise<{
    success: boolean;
    message: string;
    messageId?: string;
    error?: string;
  }> {
    try {
      this.logger.log(`Sending test message to ${sendTestDto.phoneNumber}`);

      if (!sendTestDto.phoneNumber?.trim()) {
        throw new BadRequestException('Phone number is required');
      }

      if (!sendTestDto.message?.trim()) {
        throw new BadRequestException('Message content is required');
      }

      // Validate phone number format (basic validation)
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(sendTestDto.phoneNumber)) {
        throw new BadRequestException('Invalid phone number format. Use international format (e.g., +5511999999999)');
      }

      const result = await this.whatsAppService.sendMessage(
        sendTestDto.phoneNumber,
        sendTestDto.message
      );

      if (result.success) {
        this.logger.log(`Test message sent successfully. Message ID: ${result.messageId}`);
        return {
          success: true,
          message: 'Test message sent successfully',
          messageId: result.messageId
        };
      } else {
        throw new InternalServerErrorException(result.error || 'Failed to send test message');
      }
    } catch (error) {
      this.logger.error('Error sending test message:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      return {
        success: false,
        message: 'Failed to send test message',
        error: error.message
      };
    }
  }

  @Get('webhook-info')
  @ApiOperation({ 
    summary: 'Get webhook information',
    description: 'Returns webhook configuration information for WhatsApp setup'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook information returned successfully'
  })
  async getWebhookInfo(): Promise<{
    webhookUrl: string;
    verifyToken: string;
    isConfigured: boolean;
    instructions: string[];
  }> {
    try {
      const status = await this.whatsAppService.getConnectionStatus();
      const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      
      return {
        webhookUrl: `${baseUrl}/webhook/whatsapp`,
        verifyToken: status.isConnected ? 'Configured' : 'Not configured',
        isConfigured: status.isConnected,
        instructions: [
          '1. Copy the webhook URL above',
          '2. Go to your WhatsApp Business API configuration',
          '3. Set the webhook URL in your WhatsApp app settings',
          '4. Use the verify token from your account settings',
          '5. Subscribe to "messages" webhook events',
          '6. Test the webhook connection'
        ]
      };
    } catch (error) {
      this.logger.error('Error getting webhook info:', error);
      throw new InternalServerErrorException(`Failed to get webhook info: ${error.message}`);
    }
  }
}