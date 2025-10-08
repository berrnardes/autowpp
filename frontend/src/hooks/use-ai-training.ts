import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { ConversationExample, AIConfiguration } from '@/types/api'
import { toast } from 'sonner'

export function useConversationExamples() {
  return useQuery({
    queryKey: ['conversation-examples'],
    queryFn: () => apiClient.getConversationExamples(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreateConversationExample() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (example: Omit<ConversationExample, 'id' | 'createdAt'>) => 
      apiClient.createConversationExample(example),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-examples'] })
      toast.success('Exemplo de conversa adicionado com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao criar exemplo de conversa:', error)
      toast.error('Erro ao adicionar exemplo de conversa')
    },
  })
}

export function useUpdateConversationExample() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { 
      id: string; 
      updates: Partial<Omit<ConversationExample, 'id' | 'createdAt'>> 
    }) => apiClient.updateConversationExample(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-examples'] })
      toast.success('Exemplo de conversa atualizado com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao atualizar exemplo de conversa:', error)
      toast.error('Erro ao atualizar exemplo de conversa')
    },
  })
}

export function useDeleteConversationExample() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteConversationExample(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-examples'] })
      toast.success('Exemplo de conversa excluído com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao excluir exemplo de conversa:', error)
      toast.error('Erro ao excluir exemplo de conversa')
    },
  })
}

export function useAIConfiguration() {
  return useQuery({
    queryKey: ['ai-configuration'],
    queryFn: () => apiClient.getAIConfiguration(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateAIConfiguration() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (updates: Partial<Omit<AIConfiguration, 'id' | 'createdAt' | 'updatedAt'>>) => 
      apiClient.updateAIConfiguration(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configuration'] })
      toast.success('Configuração da IA atualizada com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao atualizar configuração da IA:', error)
      toast.error('Erro ao atualizar configuração da IA')
    },
  })
}