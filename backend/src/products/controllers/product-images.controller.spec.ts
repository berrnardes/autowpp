import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProductImagesController } from './product-images.controller';
import { ProductService } from '../services/product.service';
import { ImageStorageService } from '../services/image-storage.service';

describe('ProductImagesController', () => {
  let controller: ProductImagesController;
  let productService: jest.Mocked<ProductService>;
  let imageStorageService: jest.Mocked<ImageStorageService>;

  const mockProduct = {
    id: 'test-product-id',
    name: 'Test Product',
    description: 'Test Description',
    price: '99.99',
    currency: 'BRL',
    images: ['/uploads/products/existing.jpg'],
    category: 'Test Category',
    inStock: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'image',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('fake-image-data'),
    destination: '',
    filename: '',
    path: '',
    stream: null,
  };

  const mockImageResult = {
    filename: 'test-uuid.jpg',
    originalName: 'test.jpg',
    size: 1024,
    url: '/uploads/products/test-uuid.jpg',
  };

  beforeEach(async () => {
    const mockProductService = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const mockImageStorageService = {
      uploadImage: jest.fn(),
      uploadMultipleImages: jest.fn(),
      deleteImage: jest.fn().mockResolvedValue(undefined),
      deleteMultipleImages: jest.fn().mockResolvedValue(undefined),
      extractFilenameFromUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductImagesController],
      providers: [
        { provide: ProductService, useValue: mockProductService },
        { provide: ImageStorageService, useValue: mockImageStorageService },
      ],
    }).compile();

    controller = module.get<ProductImagesController>(ProductImagesController);
    productService = module.get(ProductService);
    imageStorageService = module.get(ImageStorageService);
  });

  describe('uploadProductImage', () => {
    it('should upload single image successfully', async () => {
      productService.findById.mockResolvedValue(mockProduct);
      imageStorageService.uploadImage.mockResolvedValue(mockImageResult);
      productService.update.mockResolvedValue({
        ...mockProduct,
        images: [...mockProduct.images, mockImageResult.url],
      });

      const result = await controller.uploadProductImage(
        'test-product-id',
        mockFile,
        {},
      );

      expect(result.image).toEqual(mockImageResult);
      expect(result.product.images).toContain(mockImageResult.url);
      expect(productService.findById).toHaveBeenCalledWith('test-product-id');
      expect(imageStorageService.uploadImage).toHaveBeenCalledWith(mockFile, {});
    });

    it('should throw error when no file provided', async () => {
      await expect(
        controller.uploadProductImage('test-product-id', null, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadMultipleProductImages', () => {
    it('should upload multiple images successfully', async () => {
      const files = [mockFile, { ...mockFile, originalname: 'test2.jpg' }];
      const imageResults = [
        mockImageResult,
        { ...mockImageResult, originalName: 'test2.jpg', url: '/uploads/products/test-uuid2.jpg' },
      ];

      productService.findById.mockResolvedValue(mockProduct);
      imageStorageService.uploadMultipleImages.mockResolvedValue(imageResults);
      productService.update.mockResolvedValue({
        ...mockProduct,
        images: [...mockProduct.images, ...imageResults.map(r => r.url)],
      });

      const result = await controller.uploadMultipleProductImages(
        'test-product-id',
        files,
        {},
      );

      expect(result.images).toEqual(imageResults);
      expect(result.product.images).toHaveLength(3); // 1 existing + 2 new
    });

    it('should throw error when no files provided', async () => {
      await expect(
        controller.uploadMultipleProductImages('test-product-id', [], {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when exceeding image limit', async () => {
      const productWithManyImages = {
        ...mockProduct,
        images: Array(8).fill('/uploads/products/image.jpg'), // 8 existing images
      };
      const files = Array(5).fill(mockFile); // Trying to add 5 more (would exceed 10)

      productService.findById.mockResolvedValue(productWithManyImages);

      await expect(
        controller.uploadMultipleProductImages('test-product-id', files, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteProductImage', () => {
    it('should delete image by index successfully', async () => {
      productService.findById.mockResolvedValue(mockProduct);
      imageStorageService.extractFilenameFromUrl.mockReturnValue('existing.jpg');
      productService.update.mockResolvedValue({
        ...mockProduct,
        images: [], // Image removed
      });

      const result = await controller.deleteProductImage('test-product-id', '0');

      expect(result.product.images).toHaveLength(0);
      expect(imageStorageService.extractFilenameFromUrl).toHaveBeenCalledWith(
        '/uploads/products/existing.jpg',
      );
    });

    it('should throw error for invalid index', async () => {
      await expect(
        controller.deleteProductImage('test-product-id', 'invalid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for index out of bounds', async () => {
      productService.findById.mockResolvedValue(mockProduct);

      await expect(
        controller.deleteProductImage('test-product-id', '5'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteAllProductImages', () => {
    it('should delete all images successfully', async () => {
      const productWithImages = {
        ...mockProduct,
        images: ['/uploads/products/img1.jpg', '/uploads/products/img2.jpg'],
      };

      productService.findById.mockResolvedValue(productWithImages);
      imageStorageService.extractFilenameFromUrl
        .mockReturnValueOnce('img1.jpg')
        .mockReturnValueOnce('img2.jpg');
      productService.update.mockResolvedValue({
        ...productWithImages,
        images: [],
      });

      const result = await controller.deleteAllProductImages('test-product-id');

      expect(result.product.images).toHaveLength(0);
      expect(imageStorageService.deleteMultipleImages).toHaveBeenCalledWith([
        'img1.jpg',
        'img2.jpg'
      ]);
    });
  });
});