'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye, CheckSquare, Square, Settings } from 'lucide-react'
import { useProducts, useDeleteProduct } from '@/hooks/use-products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import type { ProductFilters, Product } from '@/types/api'
import { ProductForm } from '@/components/products/product-form'
import { ProductDetails } from '@/components/products/product-details'
import { BulkOperations } from '@/components/products/bulk-operations'

interface ProductListProps {
  onEditProduct?: (product: Product) => void
  onCreateProduct?: () => void
}

export function ProductList({ onEditProduct, onCreateProduct }: ProductListProps) {
  const [filters, setFilters] = useState<ProductFilters>({})
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [selectionMode, setSelectionMode] = useState(false)

  const { data: products = [], isLoading, error } = useProducts(filters)
  const deleteProduct = useDeleteProduct()

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setFilters(prev => ({ ...prev, search: value || undefined }))
  }

  const handleCategoryFilter = (category: string) => {
    setFilters(prev => ({ 
      ...prev, 
      category: category === 'all' ? undefined : category 
    }))
  }

  const handleStockFilter = (inStock: string) => {
    setFilters(prev => ({ 
      ...prev, 
      inStock: inStock === 'all' ? undefined : inStock === 'true' 
    }))
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowEditForm(true)
    onEditProduct?.(product)
  }

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowDetails(true)
  }

  const handleDeleteProduct = async (product: Product) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
      try {
        await deleteProduct.mutateAsync(product.id)
      } catch (error) {
        console.error('Erro ao excluir produto:', error)
      }
    }
  }

  const handleCreateProduct = () => {
    setShowCreateForm(true)
    onCreateProduct?.()
  }

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    setSelectedProducts([])
  }

  const toggleProductSelection = (product: Product) => {
    setSelectedProducts(prev => {
      const isSelected = prev.some(p => p.id === product.id)
      if (isSelected) {
        return prev.filter(p => p.id !== product.id)
      } else {
        return [...prev, product]
      }
    })
  }

  const selectAllProducts = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products)
    }
  }

  const formatPrice = (price: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  // Get unique categories for filter
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Erro ao carregar produtos. Tente novamente.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Catálogo de Produtos</h2>
          <p className="text-muted-foreground">
            Gerencie seus produtos e mantenha o catálogo atualizado
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={toggleSelectionMode}
            className="flex-1 sm:flex-none"
          >
            <Settings className="h-4 w-4 mr-2" />
            {selectionMode ? 'Cancelar Seleção' : 'Seleção em Lote'}
          </Button>
          <Button onClick={handleCreateProduct} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Selection Controls */}
            {selectionMode && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllProducts}
                  className="whitespace-nowrap"
                >
                  {selectedProducts.length === products.length && products.length > 0 ? (
                    <CheckSquare className="h-4 w-4 mr-2" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  {selectedProducts.length === products.length && products.length > 0 
                    ? 'Desmarcar Todos' 
                    : 'Selecionar Todos'}
                </Button>
                {selectedProducts.length > 0 && (
                  <Badge variant="secondary">
                    {selectedProducts.length} selecionado{selectedProducts.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            )}

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select onValueChange={handleCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category!}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stock Filter */}
            <Select onValueChange={handleStockFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Estoque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Em estoque</SelectItem>
                <SelectItem value="false">Fora de estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="aspect-square bg-muted rounded-lg mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.category || filters.inStock !== undefined
                ? 'Nenhum produto corresponde aos filtros aplicados.'
                : 'Comece adicionando seu primeiro produto ao catálogo.'}
            </p>
            <Button onClick={handleCreateProduct}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const isSelected = selectedProducts.some(p => p.id === product.id)
            return (
              <Card 
                key={product.id} 
                className={`group hover:shadow-md transition-all cursor-pointer ${
                  selectionMode ? 'hover:border-primary' : ''
                } ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => selectionMode ? toggleProductSelection(product) : handleViewProduct(product)}
              >
                <CardContent className="p-4">
                  {/* Selection Checkbox */}
                  {selectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'bg-primary border-primary' : 'bg-background border-muted-foreground'
                      }`}>
                        {isSelected && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </div>
                  )}

                  {/* Product Image */}
                  <div className="aspect-square bg-muted rounded-lg mb-4 overflow-hidden relative">
                    {product.images.length > 0 ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">Sem imagem</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold line-clamp-2 flex-1">{product.name}</h3>
                      {!selectionMode && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon-sm" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewProduct(product)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteProduct(product)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg">
                        {formatPrice(product.price, product.currency)}
                      </span>
                      <Badge variant={product.inStock ? 'default' : 'secondary'}>
                        {product.inStock ? 'Em estoque' : 'Fora de estoque'}
                      </Badge>
                    </div>

                    {product.category && (
                      <Badge variant="outline" className="text-xs">
                        {product.category}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showCreateForm && (
        <ProductForm
          open={showCreateForm}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {showEditForm && selectedProduct && (
        <ProductForm
          open={showEditForm}
          onClose={() => {
            setShowEditForm(false)
            setSelectedProduct(null)
          }}
          product={selectedProduct}
        />
      )}

      {showDetails && selectedProduct && !selectionMode && (
        <ProductDetails
          open={showDetails}
          onClose={() => {
            setShowDetails(false)
            setSelectedProduct(null)
          }}
          product={selectedProduct}
          onEdit={() => {
            setShowDetails(false)
            setShowEditForm(true)
          }}
        />
      )}

      {/* Bulk Operations */}
      {selectionMode && (
        <BulkOperations
          selectedProducts={selectedProducts}
          onSelectionChange={setSelectedProducts}
          onClose={() => {
            setSelectionMode(false)
            setSelectedProducts([])
          }}
        />
      )}
    </div>
  )
}