import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService]
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const originalText = 'test-access-token-12345';
      
      const encrypted = service.encrypt(originalText);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalText);
      
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(originalText);
    });

    it('should produce different encrypted values for same input', () => {
      const text = 'same-input-text';
      
      const encrypted1 = service.encrypt(text);
      const encrypted2 = service.encrypt(text);
      
      // Due to AES encryption with random IV, encrypted values should be different
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same original text
      expect(service.decrypt(encrypted1)).toBe(text);
      expect(service.decrypt(encrypted2)).toBe(text);
    });

    it('should handle empty strings', () => {
      const encrypted = service.encrypt('');
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe('');
    });

    it('should handle special characters and unicode', () => {
      const specialText = 'Special chars: !@#$%^&*()_+ 🚀 émojis';
      
      const encrypted = service.encrypt(specialText);
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe(specialText);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid encrypted text', () => {
      expect(() => {
        service.decrypt('invalid-encrypted-text');
      }).toThrow('Decryption failed');
    });

    it('should throw error for empty encrypted text', () => {
      expect(() => {
        service.decrypt('');
      }).toThrow('Decryption failed');
    });
  });

  describe('isEncrypted', () => {
    it('should correctly identify encrypted text', () => {
      const originalText = 'test-token';
      const encrypted = service.encrypt(originalText);
      
      expect(service.isEncrypted(encrypted)).toBe(true);
      expect(service.isEncrypted(originalText)).toBe(false);
    });

    it('should return false for random strings', () => {
      expect(service.isEncrypted('random-string')).toBe(false);
      expect(service.isEncrypted('123456')).toBe(false);
      expect(service.isEncrypted('')).toBe(false);
    });
  });
});