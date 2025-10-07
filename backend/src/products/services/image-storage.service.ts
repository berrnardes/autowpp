import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Storage, Bucket } from '@google-cloud/storage';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export interface ImageUploadResult {
    filename: string;
    originalName: string;
    size: number;
    url: string;
}

export interface ImageProcessingOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
}

@Injectable()
export class ImageStorageService {
    private readonly storage: Storage;
    private readonly bucket: Bucket;
    private readonly bucketName: string;
    private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

    constructor() {
        this.bucketName = process.env.GCS_BUCKET_NAME || 'whatsapp-automation-media';
        
        // Initialize Google Cloud Storage
        this.storage = new Storage({
            projectId: process.env.GCP_PROJECT_ID,
            // Use default credentials in production (service account)
            // For local development, set GOOGLE_APPLICATION_CREDENTIALS env var
        });
        
        this.bucket = this.storage.bucket(this.bucketName);
    }

    async uploadImage(
        file: Express.Multer.File,
        options: ImageProcessingOptions = {}
    ): Promise<ImageUploadResult> {
        // Validate file
        this.validateFile(file);

        // Generate unique filename with folder structure
        const fileExtension = extname(file.originalname);
        const filename = `${uuidv4()}${fileExtension}`;
        const gcsPath = `products/${filename}`;

        try {
            // Process image
            const processedBuffer = await this.processImage(file.buffer, options);

            // Upload to Google Cloud Storage
            const gcsFile = this.bucket.file(gcsPath);
            
            await gcsFile.save(processedBuffer, {
                metadata: {
                    contentType: file.mimetype,
                    cacheControl: 'public, max-age=31536000', // 1 year cache
                    metadata: {
                        originalName: file.originalname,
                        uploadedAt: new Date().toISOString(),
                    }
                },
                public: true, // Make file publicly accessible
            });

            // Get public URL
            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${gcsPath}`;

            return {
                filename: gcsPath,
                originalName: file.originalname,
                size: processedBuffer.length,
                url: publicUrl
            };
        } catch (error) {
            throw new InternalServerErrorException(
                `Erro ao processar imagem: ${error.message}`
            );
        }
    }

    async uploadMultipleImages(
        files: Express.Multer.File[],
        options: ImageProcessingOptions = {}
    ): Promise<ImageUploadResult[]> {
        if (!files || files.length === 0) {
            return [];
        }

        if (files.length > 10) {
            throw new BadRequestException('Máximo de 10 imagens por produto');
        }

        const results: ImageUploadResult[] = [];

        for (const file of files) {
            const result = await this.uploadImage(file, options);
            results.push(result);
        }

        return results;
    }

    async deleteImage(filename: string): Promise<void> {
        if (!filename) {
            throw new BadRequestException('Nome do arquivo é obrigatório');
        }

        try {
            // Extract GCS path from filename (could be full path or just filename)
            const gcsPath = filename.startsWith('products/') ? filename : `products/${filename}`;
            const gcsFile = this.bucket.file(gcsPath);
            
            // Check if file exists before attempting deletion
            const [exists] = await gcsFile.exists();
            if (exists) {
                await gcsFile.delete();
            }
        } catch (error) {
            // File doesn't exist or can't be deleted - log but don't throw
            console.warn(`Não foi possível deletar imagem ${filename}:`, error.message);
        }
    }

    async deleteMultipleImages(filenames: string[]): Promise<void> {
        if (!filenames || filenames.length === 0) {
            return;
        }

        const deletePromises = filenames.map(filename => this.deleteImage(filename));
        await Promise.allSettled(deletePromises);
    }

    private validateFile(file: Express.Multer.File): void {
        if (!file) {
            throw new BadRequestException('Arquivo é obrigatório');
        }

        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                'Tipo de arquivo não suportado. Use JPEG, PNG ou WebP'
            );
        }

        if (file.size > this.maxFileSize) {
            throw new BadRequestException(
                `Arquivo muito grande. Tamanho máximo: ${this.maxFileSize / (1024 * 1024)}MB`
            );
        }

        if (!file.buffer || file.buffer.length === 0) {
            throw new BadRequestException('Arquivo está vazio');
        }
    }

    private async processImage(
        buffer: Buffer,
        options: ImageProcessingOptions
    ): Promise<Buffer> {
        const {
            maxWidth = 1200,
            maxHeight = 1200,
            quality = 85,
            format = 'jpeg'
        } = options;

        let processor = sharp(buffer);

        // Resize if needed
        processor = processor.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
        });

        // Set format and quality
        switch (format) {
            case 'jpeg':
                processor = processor.jpeg({ quality });
                break;
            case 'png':
                processor = processor.png({ quality });
                break;
            case 'webp':
                processor = processor.webp({ quality });
                break;
        }

        // Return processed image buffer
        return await processor.toBuffer();
    }

    getImageUrl(filename: string): string {
        if (!filename) {
            return '';
        }
        
        // If it's already a full URL, return as is
        if (filename.startsWith('http')) {
            return filename;
        }
        
        // If it's a GCS path, construct the public URL
        const gcsPath = filename.startsWith('products/') ? filename : `products/${filename}`;
        return `https://storage.googleapis.com/${this.bucketName}/${gcsPath}`;
    }

    extractFilenameFromUrl(url: string): string {
        if (!url) {
            return '';
        }

        // Handle GCS URLs
        if (url.includes('storage.googleapis.com')) {
            const parts = url.split('/');
            // Extract the path after bucket name
            const bucketIndex = parts.findIndex(part => part === this.bucketName);
            if (bucketIndex !== -1 && bucketIndex < parts.length - 1) {
                return parts.slice(bucketIndex + 1).join('/');
            }
        }

        // Fallback for other URL formats
        const parts = url.split('/');
        return parts[parts.length - 1];
    }

    /**
     * Generate a signed URL for temporary access to a private file
     */
    async generateSignedUrl(filename: string, expirationMinutes: number = 60): Promise<string> {
        if (!filename) {
            throw new BadRequestException('Nome do arquivo é obrigatório');
        }

        try {
            const gcsPath = filename.startsWith('products/') ? filename : `products/${filename}`;
            const gcsFile = this.bucket.file(gcsPath);
            
            const [signedUrl] = await gcsFile.getSignedUrl({
                action: 'read',
                expires: Date.now() + (expirationMinutes * 60 * 1000),
            });

            return signedUrl;
        } catch (error) {
            throw new InternalServerErrorException(
                `Erro ao gerar URL assinada: ${error.message}`
            );
        }
    }

    /**
     * Check if a file exists in Google Cloud Storage
     */
    async fileExists(filename: string): Promise<boolean> {
        try {
            const gcsPath = filename.startsWith('products/') ? filename : `products/${filename}`;
            const gcsFile = this.bucket.file(gcsPath);
            const [exists] = await gcsFile.exists();
            return exists;
        } catch (error) {
            return false;
        }
    }
}