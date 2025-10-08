import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { ConversationFilters } from '@/types/api'

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => apiClient.getDashboardMetrics(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export function useConversationMetrics() {
  return useQuery({
    queryKey: ['conversation-metrics'],
    queryFn: () => apiClient.getConversationMetrics(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export function useRecentActivity(limit: number = 10) {
  return useQuery({
    queryKey: ['recent-activity', limit],
    queryFn: () => apiClient.getRecentActivity(limit),
    refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
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

export function useConversationTrends(days: number = 7) {
  return useQuery({
    queryKey: ['conversation-trends', days],
    queryFn: () => apiClient.getConversationTrends(days),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  })
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: () => apiClient.getSystemHealth(),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  })
}