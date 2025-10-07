import { Injectable } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.ENCRYPTION_SECRET_KEY || 'default-secret-key-change-in-production';
  }

  encrypt(text: string): string {
    try {
      if (text === '') {
        // Handle empty string case - encrypt a placeholder and mark it
        const encrypted = CryptoJS.AES.encrypt('__EMPTY__', this.secretKey).toString();
        return `EMPTY:${encrypted}`;
      }
      const encrypted = CryptoJS.AES.encrypt(text, this.secretKey).toString();
      return encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decrypt(encryptedText: string): string {
    try {
      // Handle empty string case
      if (encryptedText.startsWith('EMPTY:')) {
        const actualEncrypted = encryptedText.substring(6);
        const decrypted = CryptoJS.AES.decrypt(actualEncrypted, this.secretKey);
        const originalText = decrypted.toString(CryptoJS.enc.Utf8);
        if (originalText === '__EMPTY__') {
          return '';
        }
      }
      
      const decrypted = CryptoJS.AES.decrypt(encryptedText, this.secretKey);
      const originalText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!originalText) {
        throw new Error('Failed to decrypt - invalid encrypted text or key');
      }
      
      return originalText;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  isEncrypted(text: string): boolean {
    try {
      // Try to decrypt - if it works, it was encrypted
      this.decrypt(text);
      return true;
    } catch {
      return false;
    }
  }
}