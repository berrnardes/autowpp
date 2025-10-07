import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class WhatsAppCredentialsDto {
  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  webhookVerifyToken: string;

  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}

export class ConnectionResultDto {
  success: boolean;
  message: string;
  accountInfo?: {
    phoneNumberId: string;
    businessName?: string;
    phoneNumber?: string;
  };
}