import { Module } from '@nestjs/common';
import { ProductService } from './services/product.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductsModule {}