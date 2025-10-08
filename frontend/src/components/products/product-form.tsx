'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
import { X, Upload } from 'lucide-react'
import { useCreateProduct, useUpdateProduct, useUploadProductImage } from '@/hooks/use-products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import type { Product } from '@/types/api'

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  description: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser maior que zero'),
  currency: z.string().default('BRL'),
  category: z.string().optional(),
  inStock: z.boolean().default(true),
})

type ProductFormData = z.infer<typeof productSchema>

interface ProductFormProps {
  open: boolean
  onClose: () => void
  product?: Product
}

export function ProductForm({ open, onClose, product }: ProductFormProps) {
  const [images, setImages] = useState<string[]>(product?.images || [])
  const [uploadingImages, setUploadingImages] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const uploadImage = useUploadProductImage()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price || 0,
      currency: product?.currency || 'BRL',
      category: product?.category || '',
      inStock: product?.inStock ?? true,
    },
  })

  const watchedInStock = watch('inStock')

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description || '',
        price: product.price,
        currency: product.currency,
        category: product.category || '',
        inStock: product.inStock,
      })
      setImages(product.images)
    } else {
      reset({
        name: '',
        description: '',
        price: 0,
        currency: 'BRL',
        category: '',
        inStock: true,
      })
      setImages([])
    }
  }, [product, reset])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/')
      const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB
      return isValidType && isValidSize
    })

    if (validFiles.length !== files.length) {
      alert('Alguns arquivos foram ignorados. Apenas imagens até 5MB são aceitas.')
    }

    setUploadingImages(prev => [...prev, ...validFiles])
  }

  const removeUploadingImage = (index: number) => {
    setUploadingImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: ProductFormData) => {
    try {
      let productId = product?.id

      // Create or update product
      if (product) {
        await updateProduct.mutateAsync({
          id: product.id,
          updates: data,
        })
      } else {
        const newProduct = await createProduct.mutateAsync(data)
        productId = newProduct.id
      }

      // Upload new images if any
      if (uploadingImages.length > 0 && productId) {
        setIsUploading(true)
        try {
          for (const file of uploadingImages) {
            await uploadImage.mutateAsync({ productId, file })
          }
        } finally {
          setIsUploading(false)
        }
      }

      onClose()
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
    }
  }

  const currencies = [
    { value: 'BRL', label: 'Real (R$)' },
    { value: 'USD', label: 'Dólar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
  ]

  const commonCategories = [
    'Eletrônicos',
    'Roupas',
    'Casa e Jardim',
    'Esportes',
    'Livros',
    'Beleza',
    'Alimentação',
    'Automóveis',
    'Outros',
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Digite o nome do produto"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Descreva o produto (opcional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Preço *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('price', { valueAsNumber: true })}
                  placeholder="0.00"
                  className={errors.price ? 'border-destructive' : ''}
                />
                {errors.price && (
                  <p className="text-sm text-destructive mt-1">{errors.price.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="currency">Moeda</Label>
                <Select
                  value={watch('currency')}
                  onValueChange={(value) => setValue('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a moeda" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={watch('category') || ''}
                onValueChange={(value) => setValue('category', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem categoria</SelectItem>
                  {commonCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="inStock"
                checked={watchedInStock}
                onCheckedChange={(checked) => setValue('inStock', checked)}
              />
              <Label htmlFor="inStock">Produto em estoque</Label>
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-4">
            <Label>Imagens do Produto</Label>
            
            {/* Existing Images */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="relative w-full aspect-square rounded-lg border overflow-hidden">
                      <Image
                        src={image}
                        alt={`Produto ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeExistingImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Uploading Images Preview */}
            {uploadingImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {uploadingImages.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="relative w-full aspect-square rounded-lg border border-dashed overflow-hidden">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={`Upload ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeUploadingImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs">Novo</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <Label htmlFor="image-upload" className="cursor-pointer">
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Clique para adicionar imagens</p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG até 5MB cada
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting || isUploading ? 'Salvando...' : (product ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}