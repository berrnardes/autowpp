import { HttpException, HttpStatus } from '@nestjs/common';

export class WhatsAppConnectionError extends HttpException {
  constructor(message: string) {
    super(`WhatsApp connection failed: ${message}`, HttpStatus.BAD_REQUEST);
  }
}

export class WhatsAppCredentialsError extends HttpException {
  constructor(message: string) {
    super(`Invalid WhatsApp credentials: ${message}`, HttpStatus.UNAUTHORIZED);
  }
}

export class WhatsAppAPIError extends HttpException {
  constructor(message: string, statusCode: number = HttpStatus.BAD_GATEWAY) {
    super(`WhatsApp API error: ${message}`, statusCode);
  }
}

export class WhatsAppValidationError extends HttpException {
  constructor(message: string) {
    super(`WhatsApp validation error: ${message}`, HttpStatus.BAD_REQUEST);
  }
}