import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { CreateProductDto, UpdateProductDto, ProductFilters } from '@/types/api'
import { toast } from 'sonner'

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => apiClient.getProducts(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useSearchProducts(query: string, category?: string, minPrice?: number, maxPrice?: number) {
  return useQuery({
    queryKey: ['search-products', query, category, minPrice, maxPrice],
    queryFn: () => apiClient.searchProducts(query, category, minPrice, maxPrice),
    enabled: !!query.trim(),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: () => apiClient.getProductCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => apiClient.getProduct(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (product: CreateProductDto) => apiClient.createProduct(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
      toast.success('Produto criado com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao criar produto:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao criar produto: ${message}`)
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateProductDto }) => 
      apiClient.updateProduct(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
      toast.success('Produto atualizado com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar produto:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao atualizar produto: ${message}`)
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produto excluído com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao excluir produto:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao excluir produto: ${message}`)
    },
  })
}

export function useToggleProductStock() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => apiClient.toggleProductStock(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      toast.success('Status do estoque atualizado!')
    },
    onError: (error: any) => {
      console.error('Erro ao alterar status do estoque:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao alterar estoque: ${message}`)
    },
  })
}

export function useBulkUpdateProducts() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ productIds, updates }: { productIds: string[]; updates: Partial<UpdateProductDto> }) => 
      apiClient.bulkUpdateProducts(productIds, updates),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(`${result.updated} produtos atualizados com sucesso!`)
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} produtos tiveram erros na atualização`)
      }
    },
    onError: (error: any) => {
      console.error('Erro na atualização em lote:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro na atualização em lote: ${message}`)
    },
  })
}

export function useUploadProductImage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) => 
      apiClient.uploadProductImage(productId, file),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      toast.success('Imagem enviada com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao enviar imagem:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao enviar imagem: ${message}`)
    },
  })
}

export function useUploadMultipleProductImages() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ productId, files }: { productId: string; files: File[] }) => 
      apiClient.uploadMultipleProductImages(productId, files),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      toast.success('Imagens enviadas com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao enviar imagens:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao enviar imagens: ${message}`)
    },
  })
}

export function useDeleteProductImage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ productId, imageIndex }: { productId: string; imageIndex: number }) => 
      apiClient.deleteProductImage(productId, imageIndex),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      toast.success('Imagem removida com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao remover imagem:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao remover imagem: ${message}`)
    },
  })
}