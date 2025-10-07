export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken: string;
  businessName?: string;
  phoneNumber?: string;
}

export interface ConnectionResult {
  success: boolean;
  message: string;
  accountInfo?: {
    phoneNumberId: string;
    businessName?: string;
    phoneNumber?: string;
  };
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppWebhook {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text: {
            body: string;
          };
          type: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface IncomingMessage {
  messageId: string;
  from: string;
  content: string;
  timestamp: Date;
  customerName?: string;
}