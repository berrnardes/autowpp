import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ImageStorageService } from './image-storage.service';

// Mock Google Cloud Storage
const mockFile = {
  save: jest.fn(),
  exists: jest.fn(),
  delete: jest.fn(),
  getSignedUrl: jest.fn(),
};

const mockBucket = {
  file: jest.fn().mockReturnValue(mockFile),
};

const mockStorage = {
  bucket: jest.fn().mockReturnValue(mockBucket),
};

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => mockStorage),
}));

// Mock sharp
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image-data')),
  }));
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('ImageStorageService', () => {
  let service: ImageStorageService;

  beforeEach(async () => {
    // Set required environment variables
    process.env.GCP_PROJECT_ID = 'test-project';
    process.env.GCS_BUCKET_NAME = 'test-bucket';

    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageStorageService],
    }).compile();

    service = module.get<ImageStorageService>(ImageStorageService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.GCP_PROJECT_ID;
    delete process.env.GCS_BUCKET_NAME;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadImage', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'image',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('fake-image-data'),
      destination: '',
      filename: '',
      path: '',
      stream: {} as any,
    };

    it('should upload image successfully', async () => {
      const mockGcsFile = {
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockBucket.file.mockReturnValue(mockGcsFile);

      const result = await service.uploadImage(mockFile);

      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('originalName', 'test-image.jpg');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('url');
      expect(result.url).toContain('storage.googleapis.com');
      expect(mockBucket.file).toHaveBeenCalled();
      expect(mockGcsFile.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = { ...mockFile, mimetype: 'text/plain' };

      await expect(service.uploadImage(invalidFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for file too large', async () => {
      const largeFile = { ...mockFile, size: 10 * 1024 * 1024 }; // 10MB

      await expect(service.uploadImage(largeFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty file', async () => {
      const emptyFile = { ...mockFile, buffer: Buffer.alloc(0) };

      await expect(service.uploadImage(emptyFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException on upload failure', async () => {
      const mockGcsFile = {
        save: jest.fn().mockRejectedValue(new Error('Upload failed')),
      };
      mockBucket.file.mockReturnValue(mockGcsFile);

      await expect(service.uploadImage(mockFile)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('uploadMultipleImages', () => {
    const mockFiles: Express.Multer.File[] = [
      {
        fieldname: 'images',
        originalname: 'test1.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('fake-image-1'),
        destination: '',
        filename: '',
        path: '',
        stream: {} as any,
      },
      {
        fieldname: 'images',
        originalname: 'test2.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('fake-image-2'),
        destination: '',
        filename: '',
        path: '',
        stream: {} as any,
      },
    ];

    it('should upload multiple images successfully', async () => {
      const mockGcsFile = {
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockBucket.file.mockReturnValue(mockGcsFile);

      const results = await service.uploadMultipleImages(mockFiles);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('originalName', 'test1.jpg');
      expect(results[1]).toHaveProperty('originalName', 'test2.jpg');
    });

    it('should return empty array for no files', async () => {
      const results = await service.uploadMultipleImages([]);
      expect(results).toEqual([]);
    });

    it('should throw BadRequestException for too many files', async () => {
      const tooManyFiles = Array(11).fill(mockFiles[0]);

      await expect(service.uploadMultipleImages(tooManyFiles)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const mockGcsFile = {
        exists: jest.fn().mockResolvedValue([true]),
        delete: jest.fn().mockResolvedValue(undefined),
      };
      mockBucket.file.mockReturnValue(mockGcsFile);

      await expect(service.deleteImage('test-filename.jpg')).resolves.not.toThrow();
      expect(mockBucket.file).toHaveBeenCalledWith('products/test-filename.jpg');
      expect(mockGcsFile.delete).toHaveBeenCalled();
    });

    it('should handle non-existent file gracefully', async () => {
      const mockGcsFile = {
        exists: jest.fn().mockResolvedValue([false]),
      };
      mockBucket.file.mockReturnValue(mockGcsFile);

      await expect(service.deleteImage('non-existent.jpg')).resolves.not.toThrow();
    });

    it('should throw BadRequestException for empty filename', async () => {
      await expect(service.deleteImage('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate signed URL successfully', async () => {
      const mockSignedUrl = 'https://storage.googleapis.com/signed-url';
      const mockGcsFile = {
        getSignedUrl: jest.fn().mockResolvedValue([mockSignedUrl]),
      };
      mockBucket.file.mockReturnValue(mockGcsFile);

      const result = await service.generateSignedUrl('test-file.jpg');

      expect(result).toBe(mockSignedUrl);
      expect(mockGcsFile.getSignedUrl).toHaveBeenCalledWith({
        action: 'read',
        expires: expect.any(Number),
      });
    });

    it('should throw BadRequestException for empty filename', async () => {
      await expect(service.generateSignedUrl('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const mockGcsFile = {
        exists: jest.fn().mockResolvedValue([true]),
      };
      mockBucket.file.mockReturnValue(mockGcsFile);

      const result = await service.fileExists('existing-file.jpg');

      expect(result).toBe(true);
      expect(mockBucket.file).toHaveBeenCalledWith('products/existing-file.jpg');
    });

    it('should return false for non-existing file', async () => {
      const mockGcsFile = {
        exists: jest.fn().mockResolvedValue([false]),
      };
      mockBucket.file.mockReturnValue(mockGcsFile);

      const result = await service.fileExists('non-existing-file.jpg');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const mockGcsFile = {
        exists: jest.fn().mockRejectedValue(new Error('Access denied')),
      };
      mockBucket.file.mockReturnValue(mockGcsFile);

      const result = await service.fileExists('error-file.jpg');

      expect(result).toBe(false);
    });
  });

  describe('getImageUrl', () => {
    it('should return public GCS URL for filename', () => {
      const result = service.getImageUrl('test-file.jpg');
      expect(result).toBe('https://storage.googleapis.com/test-bucket/products/test-file.jpg');
    });

    it('should return existing URL if already a full URL', () => {
      const existingUrl = 'https://example.com/image.jpg';
      const result = service.getImageUrl(existingUrl);
      expect(result).toBe(existingUrl);
    });

    it('should return empty string for empty filename', () => {
      const result = service.getImageUrl('');
      expect(result).toBe('');
    });
  });

  describe('extractFilenameFromUrl', () => {
    it('should extract filename from GCS URL', () => {
      const url = 'https://storage.googleapis.com/test-bucket/products/test-file.jpg';
      const result = service.extractFilenameFromUrl(url);
      expect(result).toBe('products/test-file.jpg');
    });

    it('should extract filename from regular URL', () => {
      const url = 'https://example.com/uploads/test-file.jpg';
      const result = service.extractFilenameFromUrl(url);
      expect(result).toBe('test-file.jpg');
    });

    it('should return empty string for empty URL', () => {
      const result = service.extractFilenameFromUrl('');
      expect(result).toBe('');
    });
  });
});