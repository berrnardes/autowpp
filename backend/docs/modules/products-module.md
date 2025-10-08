# Products Module - Módulo de Produtos

O Products Module gerencia o catálogo completo de produtos da plataforma, incluindo CRUD, upload de imagens, busca avançada e integração com o sistema de IA para recomendações.

## 📁 Estrutura do Módulo

```
src/products/
├── controllers/
│   └── product-images.controller.ts      # Controller para imagens
├── dto/
│   ├── create-product.dto.ts             # DTO para criação
│   ├── product-query.dto.ts              # DTO para consultas
│   ├── update-product.dto.ts             # DTO para atualizações
│   └── upload-image.dto.ts               # DTO para upload de imagens
├── services/
│   ├── image-storage.service.ts          # Gerenciamento de imagens
│   └── product.service.ts                # Serviço principal
└── products.module.ts                    # Módulo NestJS
```

## 🎯 Principais Funcionalidades

### 1. Gerenciamento de Produtos
- **CRUD Completo**: Criar, ler, atualizar e deletar produtos
- **Busca Avançada**: Sistema de busca por nome, descrição e categoria
- **Filtros**: Filtros por categoria, preço, disponibilidade
- **Paginação**: Suporte a paginação para grandes catálogos

### 2. Sistema de Imagens
- **Upload Múltiplo**: Suporte a múltiplas imagens por produto
- **Processamento**: Redimensionamento e otimização automática
- **Armazenamento**: Google Cloud Storage ou local
- **Formatos**: Suporte a JPEG, PNG, WebP

### 3. Categorização
- **Categorias Dinâmicas**: Sistema flexível de categorias
- **Hierarquia**: Suporte a subcategorias
- **Auto-categorização**: Sugestão automática baseada em IA
- **Estatísticas**: Métricas por categoria

### 4. Integração com IA
- **Recomendações**: Produtos recomendados baseados em contexto
- **Busca Semântica**: Busca inteligente usando embeddings
- **Análise de Sentimento**: Análise de descrições de produtos
- **Otimização de Catálogo**: Sugestões de melhorias

## 🔧 APIs Principais

### Product Service

#### Listar Produtos
```typescript
GET /products?category=smartphones&inStock=true&limit=20&page=1

// Resposta
{
  "products": [
    {
      "id": "uuid",
      "name": "iPhone 15 Pro",
      "description": "Smartphone Apple com chip A17 Pro...",
      "price": 7999.99,
      "currency": "BRL",
      "category": "smartphones",
      "inStock": true,
      "images": [
        "https://storage.googleapis.com/bucket/iphone-15-pro-1.jpg",
        "https://storage.googleapis.com/bucket/iphone-15-pro-2.jpg"
      ],
      "specifications": {
        "brand": "Apple",
        "model": "iPhone 15 Pro",
        "storage": "256GB",
        "color": "Titânio Natural"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:45:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

#### Criar Produto
```typescript
POST /products
{
  "name": "Samsung Galaxy S24 Ultra",
  "description": "Smartphone Samsung com S Pen integrada, câmera de 200MP e tela Dynamic AMOLED 2X de 6.8 polegadas.",
  "price": 6999.99,
  "currency": "BRL",
  "category": "smartphones",
  "inStock": true,
  "specifications": {
    "brand": "Samsung",
    "model": "Galaxy S24 Ultra",
    "storage": "512GB",
    "color": "Preto Titânio",
    "ram": "12GB",
    "camera": "200MP"
  },
  "tags": ["smartphone", "samsung", "s-pen", "camera", "premium"]
}

// Resposta
{
  "id": "uuid",
  "name": "Samsung Galaxy S24 Ultra",
  "description": "Smartphone Samsung com S Pen integrada...",
  "price": 6999.99,
  "currency": "BRL",
  "category": "smartphones",
  "inStock": true,
  "images": [],
  "specifications": { ... },
  "tags": ["smartphone", "samsung", "s-pen", "camera", "premium"],
  "createdAt": "2024-01-15T12:00:00Z",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

#### Buscar Produto por ID
```typescript
GET /products/:id

// Resposta - estrutura completa do produto
```

#### Atualizar Produto
```typescript
PUT /products/:id
{
  "price": 6499.99,
  "inStock": true,
  "description": "Descrição atualizada com nova promoção..."
}

// Resposta - produto atualizado
```

#### Deletar Produto
```typescript
DELETE /products/:id

// Resposta
{
  "success": true,
  "message": "Produto deletado com sucesso"
}
```

#### Buscar por Categoria
```typescript
GET /products/category/:category

// Resposta - lista de produtos da categoria
```

#### Busca Textual
```typescript
GET /products/search?q=smartphone+samsung&limit=10

// Resposta
{
  "products": [...],
  "query": "smartphone samsung",
  "total": 25,
  "searchTime": 45, // em ms
  "suggestions": ["samsung galaxy", "smartphone android"]
}
```

#### Obter Categorias
```typescript
GET /products/categories

// Resposta
{
  "categories": [
    {
      "name": "smartphones",
      "count": 45,
      "subcategories": ["android", "ios"]
    },
    {
      "name": "notebooks",
      "count": 32,
      "subcategories": ["gaming", "ultrabook", "workstation"]
    }
  ]
}
```

#### Atualizar Estoque em Lote
```typescript
POST /products/bulk-stock-update
{
  "productIds": ["uuid1", "uuid2", "uuid3"],
  "inStock": false
}

// Resposta
{
  "updated": 3,
  "failed": 0,
  "results": [
    { "id": "uuid1", "success": true },
    { "id": "uuid2", "success": true },
    { "id": "uuid3", "success": true }
  ]
}
```

### Product Images Controller

#### Upload de Imagem
```typescript
POST /products/:id/images
Content-Type: multipart/form-data

// Form data:
// file: [arquivo de imagem]
// alt: "Imagem frontal do produto"
// isPrimary: true

// Resposta
{
  "filename": "product-uuid-1.jpg",
  "originalName": "iphone-15-pro.jpg",
  "size": 245760,
  "url": "https://storage.googleapis.com/bucket/product-uuid-1.jpg",
  "alt": "Imagem frontal do produto",
  "isPrimary": true
}
```

#### Upload Múltiplo
```typescript
POST /products/:id/images/multiple
Content-Type: multipart/form-data

// Form data:
// files: [array de arquivos]
// alts: ["Frente", "Verso", "Lateral"]

// Resposta
{
  "uploaded": [
    {
      "filename": "product-uuid-1.jpg",
      "url": "https://storage.googleapis.com/bucket/product-uuid-1.jpg",
      "alt": "Frente"
    },
    {
      "filename": "product-uuid-2.jpg",
      "url": "https://storage.googleapis.com/bucket/product-uuid-2.jpg",
      "alt": "Verso"
    }
  ],
  "failed": [],
  "totalUploaded": 2
}
```

#### Deletar Imagem
```typescript
DELETE /products/:id/images/:imageIndex

// Resposta
{
  "success": true,
  "message": "Imagem deletada com sucesso"
}
```

#### Deletar Todas as Imagens
```typescript
DELETE /products/:id/images

// Resposta
{
  "success": true,
  "deletedCount": 3,
  "message": "Todas as imagens foram deletadas"
}
```

## 📊 DTOs e Validações

### CreateProductDto
```typescript
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsNumber()
  @IsPositive()
  @Max(999999.99)
  price: number;

  @IsString()
  @IsOptional()
  @IsIn(['BRL', 'USD', 'EUR'])
  currency?: string = 'BRL';

  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;

  @IsBoolean()
  @IsOptional()
  inStock?: boolean = true;

  @IsObject()
  @IsOptional()
  specifications?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  model?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  sku?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number; // em gramas

  @IsObject()
  @IsOptional()
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}
```

### ProductQueryDto
```typescript
export class ProductQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  brand?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['name', 'price', 'createdAt', 'updatedAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;
}
```

### UploadImageDto
```typescript
export class UploadImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean = false;

  @IsOptional()
  @IsObject()
  processingOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  };
}
```

## 🖼️ Sistema de Imagens

### Image Storage Service

```typescript
export class ImageStorageService {
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  async uploadImage(
    file: Express.Multer.File,
    options: ImageProcessingOptions = {}
  ): Promise<ImageUploadResult> {
    // 1. Validar arquivo
    this.validateFile(file);

    // 2. Processar imagem
    const processedBuffer = await this.processImage(file.buffer, options);

    // 3. Gerar nome único
    const filename = `product-${uuidv4()}-${Date.now()}.${options.format || 'jpg'}`;

    // 4. Upload para storage
    const uploadResult = await this.uploadToStorage(filename, processedBuffer);

    return {
      filename,
      originalName: file.originalname,
      size: processedBuffer.length,
      url: this.getImageUrl(filename)
    };
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    options: ImageProcessingOptions = {}
  ): Promise<ImageUploadResult[]> {
    const uploadPromises = files.map(file => 
      this.uploadImage(file, options).catch(error => ({ error, file }))
    );

    const results = await Promise.all(uploadPromises);
    
    return results.filter(result => !('error' in result)) as ImageUploadResult[];
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

    return sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: format === 'jpeg' ? quality : undefined })
      .png({ quality: format === 'png' ? quality : undefined })
      .webp({ quality: format === 'webp' ? quality : undefined })
      .toBuffer();
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `Arquivo muito grande. Máximo permitido: ${this.maxFileSize / 1024 / 1024}MB`
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Tipos aceitos: ${this.allowedMimeTypes.join(', ')}`
      );
    }
  }

  async deleteImage(filename: string): Promise<void> {
    // Implementar deleção no storage
    if (this.useGoogleCloudStorage) {
      await this.bucket.file(filename).delete();
    } else {
      await fs.unlink(path.join(this.uploadDir, filename));
    }
  }

  async deleteMultipleImages(filenames: string[]): Promise<void> {
    const deletePromises = filenames.map(filename => 
      this.deleteImage(filename).catch(error => 
        console.error(`Erro ao deletar ${filename}:`, error)
      )
    );

    await Promise.all(deletePromises);
  }
}
```

## 🔍 Sistema de Busca

### Busca Textual Avançada

```typescript
export class ProductSearchService {
  async searchProducts(query: string, filters: ProductQueryDto): Promise<ProductSearchResult> {
    const searchTerms = this.extractSearchTerms(query);
    const searchVector = await this.createSearchVector(searchTerms);

    // Busca por relevância
    const relevanceQuery = this.buildRelevanceQuery(searchTerms, filters);
    const products = await this.db.execute(relevanceQuery);

    // Calcular scores de relevância
    const scoredProducts = products.map(product => ({
      ...product,
      relevanceScore: this.calculateRelevanceScore(product, searchTerms)
    }));

    // Ordenar por relevância
    scoredProducts.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      products: scoredProducts,
      total: scoredProducts.length,
      query,
      searchTime: Date.now() - startTime,
      suggestions: await this.generateSuggestions(query)
    };
  }

  private extractSearchTerms(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(term => term.length > 2);
  }

  private calculateRelevanceScore(product: any, searchTerms: string[]): number {
    let score = 0;
    const productText = `${product.name} ${product.description} ${product.category}`.toLowerCase();

    searchTerms.forEach(term => {
      // Pontuação por correspondência exata no nome
      if (product.name.toLowerCase().includes(term)) {
        score += 10;
      }

      // Pontuação por correspondência na descrição
      if (product.description.toLowerCase().includes(term)) {
        score += 5;
      }

      // Pontuação por correspondência na categoria
      if (product.category?.toLowerCase().includes(term)) {
        score += 3;
      }

      // Pontuação por correspondência em tags
      if (product.tags?.some(tag => tag.toLowerCase().includes(term))) {
        score += 2;
      }
    });

    // Bônus para produtos em estoque
    if (product.inStock) {
      score += 1;
    }

    return score;
  }

  private async generateSuggestions(query: string): Promise<string[]> {
    // Implementar sugestões baseadas em:
    // 1. Produtos similares
    // 2. Buscas populares
    // 3. Correção ortográfica
    // 4. Sinônimos

    const suggestions = [];
    
    // Buscar produtos similares
    const similarProducts = await this.findSimilarProducts(query);
    suggestions.push(...similarProducts.map(p => p.name));

    // Adicionar correções ortográficas
    const corrections = await this.getSpellCorrections(query);
    suggestions.push(...corrections);

    return [...new Set(suggestions)].slice(0, 5);
  }
}
```

## 🗄️ Estrutura do Banco de Dados

### Tabela Products

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  category VARCHAR(50),
  brand VARCHAR(100),
  model VARCHAR(100),
  sku VARCHAR(20) UNIQUE,
  in_stock BOOLEAN DEFAULT TRUE,
  weight INTEGER, -- em gramas
  dimensions JSONB, -- {length, width, height}
  specifications JSONB,
  tags TEXT[],
  images TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para performance
  INDEX idx_products_name (name),
  INDEX idx_products_category (category),
  INDEX idx_products_brand (brand),
  INDEX idx_products_price (price),
  INDEX idx_products_in_stock (in_stock),
  INDEX idx_products_created_at (created_at),
  
  -- Índice para busca textual
  INDEX idx_products_search USING gin(to_tsvector('portuguese', name || ' ' || description)),
  
  -- Índice para tags
  INDEX idx_products_tags USING gin(tags)
);
```

### Tabela Product Categories

```sql
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  parent_id UUID REFERENCES product_categories(id),
  description TEXT,
  image_url VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_categories_parent_id (parent_id),
  INDEX idx_categories_name (name),
  INDEX idx_categories_active (is_active)
);
```

### Tabela Product Images

```sql
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(200),
  is_primary BOOLEAN DEFAULT FALSE,
  size_bytes INTEGER,
  mime_type VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_product_images_product_id (product_id),
  INDEX idx_product_images_primary (product_id, is_primary)
);
```

## 📊 Métricas e Analytics

### Métricas de Produto

```typescript
interface ProductMetrics {
  totalProducts: number;
  productsInStock: number;
  productsOutOfStock: number;
  averagePrice: number;
  totalValue: number; // valor total do estoque
  categoriesCount: number;
  brandsCount: number;
  topCategories: { category: string; count: number }[];
  topBrands: { brand: string; count: number }[];
  priceDistribution: { range: string; count: number }[];
}

// Endpoint para métricas
GET /products/metrics

{
  "totalProducts": 1250,
  "productsInStock": 1180,
  "productsOutOfStock": 70,
  "averagePrice": 899.50,
  "totalValue": 1124375.00,
  "categoriesCount": 15,
  "brandsCount": 45,
  "topCategories": [
    { "category": "smartphones", "count": 320 },
    { "category": "notebooks", "count": 180 }
  ],
  "topBrands": [
    { "brand": "Samsung", "count": 150 },
    { "brand": "Apple", "count": 120 }
  ],
  "priceDistribution": [
    { "range": "0-500", "count": 450 },
    { "range": "500-1000", "count": 380 },
    { "range": "1000-2000", "count": 280 },
    { "range": "2000+", "count": 140 }
  ]
}
```

### Analytics de Busca

```typescript
// Métricas de busca
GET /products/search/analytics?period=30d

{
  "period": "30d",
  "totalSearches": 5420,
  "uniqueQueries": 2180,
  "averageResultsPerSearch": 12.5,
  "zeroResultsRate": 8.2, // percentual
  "topQueries": [
    { "query": "iphone", "count": 245, "avgResults": 15 },
    { "query": "samsung galaxy", "count": 189, "avgResults": 22 }
  ],
  "zeroResultQueries": [
    { "query": "produto inexistente", "count": 12 },
    { "query": "marca desconhecida", "count": 8 }
  ],
  "searchTrends": {
    "increasing": ["smartphone 5g", "notebook gamer"],
    "decreasing": ["tablet", "smartwatch"]
  }
}
```

## 🔍 Exemplos de Uso

### Criação Completa de Produto

```typescript
// 1. Criar produto
const productData = {
  name: "MacBook Pro 14\" M3",
  description: "Notebook Apple MacBook Pro com chip M3, tela Liquid Retina XDR de 14 polegadas, 16GB de RAM e SSD de 512GB.",
  price: 12999.99,
  currency: "BRL",
  category: "notebooks",
  brand: "Apple",
  model: "MacBook Pro 14",
  sku: "MBP14-M3-512",
  inStock: true,
  specifications: {
    processor: "Apple M3",
    ram: "16GB",
    storage: "512GB SSD",
    screen: "14\" Liquid Retina XDR",
    graphics: "GPU M3 de 10 núcleos",
    battery: "Até 18 horas",
    weight: "1.55kg",
    ports: ["3x Thunderbolt 4", "HDMI", "SDXC", "MagSafe 3"]
  },
  tags: ["notebook", "apple", "macbook", "m3", "professional", "creative"],
  dimensions: {
    length: 312.6,
    width: 221.2,
    height: 15.5
  },
  weight: 1550
};

const product = await productService.create(productData);

// 2. Upload de imagens
const imageFiles = [
  // arquivos de imagem
];

const uploadResults = await imageStorageService.uploadMultipleImages(
  imageFiles,
  {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 85,
    format: 'webp'
  }
);

// 3. Associar imagens ao produto
await productService.update(product.id, {
  images: uploadResults.map(result => result.url)
});
```

### Busca Avançada com Filtros

```typescript
// Busca complexa
const searchResults = await productService.findAll({
  search: "smartphone android",
  category: "smartphones",
  brand: "Samsung",
  minPrice: 1000,
  maxPrice: 3000,
  inStock: true,
  tags: ["5g", "camera"],
  sortBy: "price",
  sortOrder: "asc",
  limit: 20,
  page: 1
});

console.log(`Encontrados ${searchResults.total} produtos`);
searchResults.products.forEach(product => {
  console.log(`${product.name} - R$ ${product.price}`);
});
```

### Análise de Catálogo

```typescript
// Análise de performance do catálogo
const catalogAnalysis = {
  // Produtos sem imagem
  productsWithoutImages: await productService.findAll({
    // filtro customizado para produtos sem imagem
  }),

  // Produtos com preço muito baixo/alto
  suspiciousPricing: await productService.findAll({
    // produtos com preços suspeitos
  }),

  // Produtos sem categoria
  uncategorizedProducts: await productService.findAll({
    category: null
  }),

  // Produtos com descrições muito curtas
  shortDescriptions: await productService.findAll({
    // filtro customizado para descrições < 50 caracteres
  })
};

// Gerar relatório de qualidade
const qualityReport = {
  totalProducts: catalogAnalysis.productsWithoutImages.total,
  issues: {
    missingImages: catalogAnalysis.productsWithoutImages.products.length,
    suspiciousPricing: catalogAnalysis.suspiciousPricing.products.length,
    uncategorized: catalogAnalysis.uncategorizedProducts.products.length,
    shortDescriptions: catalogAnalysis.shortDescriptions.products.length
  },
  qualityScore: calculateQualityScore(catalogAnalysis)
};
```

### Integração com Sistema de IA

```typescript
// Otimização automática de catálogo
class CatalogOptimizer {
  async optimizeProductDescriptions() {
    const products = await productService.findAll({ limit: 100 });
    
    for (const product of products.products) {
      // Analisar qualidade da descrição
      const descriptionAnalysis = await aiService.analyzeProductDescription(
        product.description
      );
      
      if (descriptionAnalysis.score < 70) {
        // Gerar descrição melhorada
        const improvedDescription = await aiService.improveProductDescription(
          product.name,
          product.description,
          product.specifications
        );
        
        // Atualizar produto
        await productService.update(product.id, {
          description: improvedDescription
        });
        
        console.log(`Descrição melhorada para: ${product.name}`);
      }
    }
  }

  async suggestCategories() {
    const uncategorizedProducts = await productService.findAll({
      category: null
    });
    
    for (const product of uncategorizedProducts.products) {
      const suggestedCategory = await aiService.suggestProductCategory(
        product.name,
        product.description
      );
      
      if (suggestedCategory.confidence > 80) {
        await productService.update(product.id, {
          category: suggestedCategory.category
        });
        
        console.log(`Categoria sugerida para ${product.name}: ${suggestedCategory.category}`);
      }
    }
  }

  async generateTags() {
    const products = await productService.findAll({ limit: 100 });
    
    for (const product of products.products) {
      if (!product.tags || product.tags.length < 3) {
        const suggestedTags = await aiService.generateProductTags(
          product.name,
          product.description,
          product.category
        );
        
        await productService.update(product.id, {
          tags: [...(product.tags || []), ...suggestedTags]
        });
      }
    }
  }
}
```

## 🚀 Melhores Práticas

### 1. Performance
- **Índices Otimizados**: Mantenha índices para consultas frequentes
- **Paginação**: Sempre use paginação para listas grandes
- **Cache**: Cache produtos populares e categorias
- **Lazy Loading**: Carregue imagens sob demanda

### 2. Qualidade de Dados
- **Validação Rigorosa**: Valide todos os dados de entrada
- **Normalização**: Padronize formatos de dados
- **Deduplicação**: Evite produtos duplicados
- **Auditoria**: Mantenha logs de alterações

### 3. Imagens
- **Otimização**: Comprima e redimensione imagens
- **CDN**: Use CDN para entrega rápida
- **Formatos Modernos**: Prefira WebP quando possível
- **Alt Text**: Sempre inclua texto alternativo

### 4. Busca
- **Índices de Texto**: Use índices full-text para busca
- **Sinônimos**: Implemente dicionário de sinônimos
- **Correção Ortográfica**: Sugira correções
- **Analytics**: Monitore padrões de busca

## 🔧 Troubleshooting

### Problemas Comuns

#### Performance Lenta na Busca
```typescript
// Otimizar consultas de busca
EXPLAIN ANALYZE SELECT * FROM products 
WHERE to_tsvector('portuguese', name || ' ' || description) 
@@ plainto_tsquery('portuguese', 'smartphone samsung');

// Criar índices específicos
CREATE INDEX CONCURRENTLY idx_products_brand_category 
ON products (brand, category) WHERE in_stock = true;
```

#### Upload de Imagens Falhando
```typescript
// Verificar configuração de storage
const storageHealth = await imageStorageService.checkStorageHealth();
if (!storageHealth.healthy) {
  console.error('Problema no storage:', storageHealth.error);
  
  // Fallback para storage local
  await imageStorageService.switchToLocalStorage();
}
```

#### Produtos Duplicados
```typescript
// Detectar e consolidar duplicados
const duplicates = await db.execute(`
  SELECT name, COUNT(*) as count
  FROM products 
  GROUP BY LOWER(name) 
  HAVING COUNT(*) > 1
`);

for (const duplicate of duplicates) {
  await consolidateDuplicateProducts(duplicate.name);
}
```

O Products Module é essencial para manter um catálogo organizado e otimizado, fornecendo a base para recomendações inteligentes e uma experiência de compra superior.