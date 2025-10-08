'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { 
  ConversationFilters, 
  TakeoverRequest,
  ResponseOverride
} from '@/types/api'
import { toast } from 'sonner'

export function useConversations(filters?: ConversationFilters) {
  return useQuery({
    queryKey: ['conversations', filters],
    queryFn: () => apiClient.getConversations(filters),
    staleTime: 30000, // 30 seconds
  })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => apiClient.getConversation(id),
    enabled: !!id,
    staleTime: 10000, // 10 seconds
  })
}

export function useConversationByPhone(phoneNumber: string) {
  return useQuery({
    queryKey: ['conversation-by-phone', phoneNumber],
    queryFn: () => apiClient.getConversationByPhone(phoneNumber),
    enabled: !!phoneNumber,
    staleTime: 30000, // 30 seconds
  })
}

export function useConversationsNeedingAttention() {
  return useQuery({
    queryKey: ['conversations-needing-attention'],
    queryFn: () => apiClient.getConversationsNeedingAttention(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export function useConversationHistory(conversationId: string, limit?: number) {
  return useQuery({
    queryKey: ['conversation-history', conversationId, limit],
    queryFn: () => apiClient.getConversationHistory(conversationId, limit),
    enabled: !!conversationId,
    staleTime: 30000, // 30 seconds
  })
}

export function useFlaggedConversations() {
  return useQuery({
    queryKey: ['flagged-conversations'],
    queryFn: () => apiClient.getFlaggedConversations(),
    staleTime: 30000,
  })
}

export function useConversationAnalytics(dateFrom?: Date, dateTo?: Date) {
  return useQuery({
    queryKey: ['conversation-analytics', dateFrom, dateTo],
    queryFn: () => apiClient.getConversationAnalytics(dateFrom, dateTo),
    staleTime: 60000, // 1 minute
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (conversationData: any) => apiClient.createConversation(conversationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      toast.success('Conversa criada com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao criar conversa:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao criar conversa: ${message}`)
    },
  })
}

export function useUpdateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiClient.updateConversation(id, updates),
    onSuccess: (updatedConversation, { id }) => {
      // Update the conversation in cache
      queryClient.setQueryData(['conversation', id], updatedConversation)
      
      // Invalidate conversations list to refresh
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations-needing-attention'] })
      
      toast.success('Conversa atualizada com sucesso')
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar conversa:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao atualizar conversa: ${message}`)
    },
  })
}

export function useResolveConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.resolveConversation(id),
    onSuccess: (updatedConversation) => {
      // Update the conversation in cache
      queryClient.setQueryData(['conversation', updatedConversation.id], updatedConversation)
      
      // Invalidate conversations list to refresh
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations-needing-attention'] })
      queryClient.invalidateQueries({ queryKey: ['conversation-analytics'] })
      
      toast.success('Conversa resolvida com sucesso')
    },
    onError: (error: any) => {
      console.error('Erro ao resolver conversa:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao resolver conversa: ${message}`)
    },
  })
}

export function useEscalateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.escalateConversation(id),
    onSuccess: (updatedConversation) => {
      // Update the conversation in cache
      queryClient.setQueryData(['conversation', updatedConversation.id], updatedConversation)
      
      // Invalidate conversations list to refresh
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations-needing-attention'] })
      queryClient.invalidateQueries({ queryKey: ['flagged-conversations'] })
      
      toast.success('Conversa escalada para revisão manual')
    },
    onError: (error: any) => {
      console.error('Erro ao escalar conversa:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao escalar conversa: ${message}`)
    },
  })
}

export function useAddMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ conversationId, messageData }: { conversationId: string; messageData: any }) =>
      apiClient.addMessage(conversationId, messageData),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversation-history', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      
      toast.success('Mensagem adicionada com sucesso')
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar mensagem:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao adicionar mensagem: ${message}`)
    },
  })
}

// Legacy method for backward compatibility
export function useUpdateConversationStatus() {
  const resolveConversation = useResolveConversation()
  const escalateConversation = useEscalateConversation()
  const updateConversation = useUpdateConversation()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'resolved' | 'escalated' }) => {
      if (status === 'resolved') {
        return resolveConversation.mutateAsync(id)
      } else if (status === 'escalated') {
        return escalateConversation.mutateAsync(id)
      } else {
        return updateConversation.mutateAsync({ id, updates: { status } })
      }
    },
  })
}

export function useFlagMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ messageId, reason }: { messageId: string; reason: string }) =>
      apiClient.flagMessage(messageId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['flagged-conversations'] })
      toast.success('Mensagem sinalizada com sucesso')
    },
    onError: (error) => {
      console.error('Erro ao sinalizar mensagem:', error)
      toast.error('Erro ao sinalizar mensagem')
    },
  })
}

export function useUnflagMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: string) => apiClient.unflagMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['flagged-conversations'] })
      toast.success('Sinalização removida com sucesso')
    },
    onError: (error) => {
      console.error('Erro ao remover sinalização:', error)
      toast.error('Erro ao remover sinalização')
    },
  })
}

export function useRequestTakeover() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: TakeoverRequest) => apiClient.requestTakeover(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      toast.success('Solicitação de controle manual enviada')
    },
    onError: (error) => {
      console.error('Erro ao solicitar controle manual:', error)
      toast.error('Erro ao solicitar controle manual')
    },
  })
}

export function useOverrideResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (override: ResponseOverride) => apiClient.overrideResponse(override),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      toast.success('Resposta substituída com sucesso')
    },
    onError: (error) => {
      console.error('Erro ao substituir resposta:', error)
      toast.error('Erro ao substituir resposta')
    },
  })
}

export function useExportConversations() {
  return useMutation({
    mutationFn: ({ filters, format }: { filters?: ConversationFilters; format?: 'csv' | 'json' }) =>
      apiClient.exportConversations(filters, format),
    onSuccess: (blob, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `conversations.${variables.format || 'csv'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Conversas exportadas com sucesso')
    },
    onError: (error) => {
      console.error('Erro ao exportar conversas:', error)
      toast.error('Erro ao exportar conversas')
    },
  })
}