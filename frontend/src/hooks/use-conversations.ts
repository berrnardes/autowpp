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

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'resolved' | 'escalated' }) =>
      apiClient.updateConversationStatus(id, status),
    onSuccess: (updatedConversation) => {
      // Update the conversation in cache
      queryClient.setQueryData(['conversation', updatedConversation.id], updatedConversation)
      
      // Invalidate conversations list to refresh
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['flagged-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversation-analytics'] })
      
      toast.success('Status da conversa atualizado com sucesso')
    },
    onError: (error) => {
      console.error('Erro ao atualizar status da conversa:', error)
      toast.error('Erro ao atualizar status da conversa')
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