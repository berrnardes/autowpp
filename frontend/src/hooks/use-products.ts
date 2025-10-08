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
      toast.success('Produto criado com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao criar produto:', error)
      toast.error('Erro ao criar produto')
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
      toast.success('Produto atualizado com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao atualizar produto:', error)
      toast.error('Erro ao atualizar produto')
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
    onError: (error) => {
      console.error('Erro ao excluir produto:', error)
      toast.error('Erro ao excluir produto')
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
    onError: (error) => {
      console.error('Erro ao enviar imagem:', error)
      toast.error('Erro ao enviar imagem')
    },
  })
}