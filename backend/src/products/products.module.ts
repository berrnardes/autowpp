import { Module } from '@nestjs/common';
import { ProductService } from './services/product.service';
import { ImageStorageService } from './services/image-storage.service';
import { ProductImagesController } from './controllers/product-images.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductImagesController],
  providers: [ProductService, ImageStorageService],
  exports: [ProductService, ImageStorageService],
})
export class ProductsModule {}