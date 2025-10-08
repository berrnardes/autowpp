import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { ConversationFilters } from '@/types/api'

export function useConversationMetrics() {
  return useQuery({
    queryKey: ['conversation-metrics'],
    queryFn: () => apiClient.getConversationMetrics(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export function useRecentInteractions(limit: number = 10, filters?: ConversationFilters) {
  return useQuery({
    queryKey: ['recent-interactions', limit, filters],
    queryFn: () => apiClient.getRecentInteractions(limit, filters),
    refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  })
}