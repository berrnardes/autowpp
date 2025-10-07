import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Body,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ProductService } from '../services/product.service';
import { ImageStorageService, ImageUploadResult } from '../services/image-storage.service';
import { UploadImageDto } from '../dto/upload-image.dto';

@Controller('products')
export class ProductImagesController {
  constructor(
    private readonly productService: ProductService,
    private readonly imageStorageService: ImageStorageService,
  ) {}

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('image'))
  async uploadProductImage(
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadImageDto,
  ): Promise<{ image: ImageUploadResult; product: any }> {
    if (!file) {
      throw new BadRequestException('Imagem é obrigatória');
    }

    // Verify product exists
    const product = await this.productService.findById(productId);

    // Upload and process image
    const imageResult = await this.imageStorageService.uploadImage(file, uploadDto);

    // Update product with new image
    const currentImages = product.images || [];
    const updatedImages = [...currentImages, imageResult.url];

    const updatedProduct = await this.productService.update(productId, {
      images: updatedImages,
    });

    return {
      image: imageResult,
      product: updatedProduct,
    };
  }

  @Post(':id/images/multiple')
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadMultipleProductImages(
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadDto: UploadImageDto,
  ): Promise<{ images: ImageUploadResult[]; product: any }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Pelo menos uma imagem é obrigatória');
    }

    // Verify product exists
    const product = await this.productService.findById(productId);

    // Check total image limit
    const currentImages = product.images || [];
    if (currentImages.length + files.length > 10) {
      throw new BadRequestException(
        `Máximo de 10 imagens por produto. Produto atual tem ${currentImages.length} imagens`,
      );
    }

    // Upload and process images
    const imageResults = await this.imageStorageService.uploadMultipleImages(
      files,
      uploadDto,
    );

    // Update product with new images
    const newImageUrls = imageResults.map(result => result.url);
    const updatedImages = [...currentImages, ...newImageUrls];

    const updatedProduct = await this.productService.update(productId, {
      images: updatedImages,
    });

    return {
      images: imageResults,
      product: updatedProduct,
    };
  }

  @Delete(':id/images/:imageIndex')
  async deleteProductImage(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('imageIndex') imageIndex: string,
  ): Promise<{ product: any }> {
    const index = parseInt(imageIndex, 10);
    if (isNaN(index) || index < 0) {
      throw new BadRequestException('Índice da imagem inválido');
    }

    // Verify product exists
    const product = await this.productService.findById(productId);
    const currentImages = product.images || [];

    if (index >= currentImages.length) {
      throw new BadRequestException('Índice da imagem não encontrado');
    }

    // Get image URL to delete
    const imageUrl = currentImages[index];
    const filename = this.imageStorageService.extractFilenameFromUrl(imageUrl);

    // Remove image from array
    const updatedImages = currentImages.filter((_, i) => i !== index);

    // Update product
    const updatedProduct = await this.productService.update(productId, {
      images: updatedImages,
    });

    // Delete physical file (async, don't wait)
    this.imageStorageService.deleteImage(filename).catch(error => {
      console.error(`Erro ao deletar arquivo de imagem ${filename}:`, error);
    });

    return {
      product: updatedProduct,
    };
  }

  @Delete(':id/images')
  async deleteAllProductImages(
    @Param('id', ParseUUIDPipe) productId: string,
  ): Promise<{ product: any }> {
    // Verify product exists
    const product = await this.productService.findById(productId);
    const currentImages = product.images || [];

    if (currentImages.length === 0) {
      return { product };
    }

    // Extract filenames for deletion
    const filenames = currentImages.map(url =>
      this.imageStorageService.extractFilenameFromUrl(url),
    );

    // Update product (remove all images)
    const updatedProduct = await this.productService.update(productId, {
      images: [],
    });

    // Delete physical files (async, don't wait)
    this.imageStorageService.deleteMultipleImages(filenames).catch(error => {
      console.error('Erro ao deletar arquivos de imagem:', error);
    });

    return {
      product: updatedProduct,
    };
  }
}