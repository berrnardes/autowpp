'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDeleteProduct } from '@/hooks/use-products'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import type { Product } from '@/types/api'

interface ProductDetailsProps {
  open: boolean
  onClose: () => void
  product: Product
  onEdit: () => void
}

export function ProductDetails({ open, onClose, product, onEdit }: ProductDetailsProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const deleteProduct = useDeleteProduct()

  const handleDelete = async () => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
      try {
        await deleteProduct.mutateAsync(product.id)
        onClose()
      } catch (error) {
        console.error('Erro ao excluir produto:', error)
      }
    }
  }

  const formatPrice = (price: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === product.images.length - 1 ? 0 : prev + 1
    )
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? product.images.length - 1 : prev - 1
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Produto</span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDelete}
                disabled={deleteProduct.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Images Section */}
          <div className="space-y-4">
            {product.images.length > 0 ? (
              <>
                {/* Main Image */}
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  <Image
                    src={product.images[currentImageIndex]}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                  
                  {/* Navigation Arrows */}
                  {product.images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-75 hover:opacity-100"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-75 hover:opacity-100"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {/* Image Counter */}
                  {product.images.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      {currentImageIndex + 1} / {product.images.length}
                    </div>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {product.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                          index === currentImageIndex 
                            ? 'border-primary' 
                            : 'border-transparent hover:border-muted-foreground'
                        }`}
                      >
                        <Image
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">Sem imagem</span>
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{product.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={product.inStock ? 'default' : 'secondary'}>
                    {product.inStock ? 'Em estoque' : 'Fora de estoque'}
                  </Badge>
                  {product.category && (
                    <Badge variant="outline">{product.category}</Badge>
                  )}
                </div>
              </div>

              <div className="text-3xl font-bold text-primary">
                {formatPrice(product.price, product.currency)}
              </div>

              {product.description && (
                <div>
                  <h3 className="font-semibold mb-2">Descrição</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Informações do Produto</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ID do Produto:</span>
                  <p className="font-mono text-xs break-all">{product.id}</p>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Moeda:</span>
                  <p>{product.currency}</p>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Categoria:</span>
                  <p>{product.category || 'Sem categoria'}</p>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>{product.inStock ? 'Disponível' : 'Indisponível'}</p>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Criado em:</span>
                  <p>{formatDate(product.createdAt)}</p>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Atualizado em:</span>
                  <p>{formatDate(product.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Image Information */}
            {product.images.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <h3 className="font-semibold">Imagens</h3>
                <p className="text-sm text-muted-foreground">
                  {product.images.length} imagem{product.images.length !== 1 ? 's' : ''} disponível{product.images.length !== 1 ? 'is' : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}