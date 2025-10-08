import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { ConversationExample, AIConfiguration } from '@/types/api'
import { toast } from 'sonner'

// Conversation Examples
export function useConversationExamples(query?: any) {
  return useQuery({
    queryKey: ['conversation-examples', query],
    queryFn: () => apiClient.getConversationExamples(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useConversationExample(id: string) {
  return useQuery({
    queryKey: ['conversation-example', id],
    queryFn: () => apiClient.getConversationExample(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useConversationCategories() {
  return useQuery({
    queryKey: ['conversation-categories'],
    queryFn: () => apiClient.getConversationCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useTrainingStats() {
  return useQuery({
    queryKey: ['training-stats'],
    queryFn: () => apiClient.getTrainingStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useCreateConversationExample() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (example: Omit<ConversationExample, 'id' | 'createdAt'>) => 
      apiClient.createConversationExample(example),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-examples'] })
      queryClient.invalidateQueries({ queryKey: ['conversation-categories'] })
      queryClient.invalidateQueries({ queryKey: ['training-stats'] })
      toast.success('Exemplo de conversa adicionado com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao criar exemplo de conversa:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao adicionar exemplo: ${message}`)
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
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-examples'] })
      queryClient.invalidateQueries({ queryKey: ['conversation-example', id] })
      queryClient.invalidateQueries({ queryKey: ['training-stats'] })
      toast.success('Exemplo de conversa atualizado com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar exemplo de conversa:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao atualizar exemplo: ${message}`)
    },
  })
}

export function useDeleteConversationExample() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteConversationExample(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-examples'] })
      queryClient.invalidateQueries({ queryKey: ['training-stats'] })
      toast.success('Exemplo de conversa excluído com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao excluir exemplo de conversa:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao excluir exemplo: ${message}`)
    },
  })
}

export function useBulkCreateConversationExamples() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (bulkData: any) => apiClient.bulkCreateConversationExamples(bulkData),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-examples'] })
      queryClient.invalidateQueries({ queryKey: ['training-stats'] })
      toast.success(`${result.created} exemplos criados com sucesso!`)
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} exemplos tiveram erros`)
      }
    },
    onError: (error: any) => {
      console.error('Erro na criação em lote:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro na criação em lote: ${message}`)
    },
  })
}

export function useTrainAIModel() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (trainingData: any) => apiClient.trainAIModel(trainingData),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['training-stats'] })
      if (result.success) {
        toast.success(`Modelo treinado com sucesso! ${result.examplesProcessed} exemplos processados.`)
      } else {
        toast.error(`Erro no treinamento: ${result.message}`)
      }
    },
    onError: (error: any) => {
      console.error('Erro ao treinar modelo:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao treinar modelo: ${message}`)
    },
  })
}

export function useValidateTrainingData() {
  return useMutation({
    mutationFn: () => apiClient.validateTrainingData(),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Dados de treinamento validados! ${result.examplesProcessed} exemplos válidos.`)
      } else {
        toast.error(`Problemas encontrados: ${result.message}`)
      }
    },
    onError: (error: any) => {
      console.error('Erro ao validar dados:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro na validação: ${message}`)
    },
  })
}

// AI Configuration
export function useAIStatus() {
  return useQuery({
    queryKey: ['ai-status'],
    queryFn: () => apiClient.getAIStatus(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export function useAIConfiguration() {
  return useQuery({
    queryKey: ['ai-configuration'],
    queryFn: () => apiClient.getAIConfiguration(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useBusinessHours() {
  return useQuery({
    queryKey: ['business-hours'],
    queryFn: () => apiClient.getBusinessHours(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateAIConfiguration() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (updates: any) => apiClient.updateAIConfiguration(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configuration'] })
      queryClient.invalidateQueries({ queryKey: ['ai-status'] })
      toast.success('Configuração da IA atualizada com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar configuração da IA:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao atualizar configuração: ${message}`)
    },
  })
}

export function useUpdateBusinessHours() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (businessHours: any) => apiClient.updateBusinessHours(businessHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours'] })
      queryClient.invalidateQueries({ queryKey: ['ai-configuration'] })
      toast.success('Horário de funcionamento atualizado!')
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar horário:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao atualizar horário: ${message}`)
    },
  })
}

export function useTestAIResponse() {
  return useMutation({
    mutationFn: (testData: any) => apiClient.testAIResponse(testData),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Resposta da IA gerada com sucesso!')
      } else {
        toast.error(`Erro no teste: ${result.message}`)
      }
    },
    onError: (error: any) => {
      console.error('Erro ao testar resposta da IA:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro no teste: ${message}`)
    },
  })
}

export function useResetAIConfiguration() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => apiClient.resetAIConfiguration(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configuration'] })
      queryClient.invalidateQueries({ queryKey: ['ai-status'] })
      queryClient.invalidateQueries({ queryKey: ['business-hours'] })
      toast.success('Configuração da IA resetada para os padrões!')
    },
    onError: (error: any) => {
      console.error('Erro ao resetar configuração:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao resetar configuração: ${message}`)
    },
  })
}

// AI Goals
export function useAvailableGoals() {
  return useQuery({
    queryKey: ['available-goals'],
    queryFn: () => apiClient.getAvailableGoals(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useCurrentGoal() {
  return useQuery({
    queryKey: ['current-goal'],
    queryFn: () => apiClient.getCurrentGoal(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export function useSetConversationGoal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (goalType: string) => apiClient.setConversationGoal(goalType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-goal'] })
      queryClient.invalidateQueries({ queryKey: ['ai-status'] })
      toast.success('Objetivo de conversa atualizado!')
    },
    onError: (error: any) => {
      console.error('Erro ao definir objetivo:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao definir objetivo: ${message}`)
    },
  })
}

export function useUpdateCustomGoal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (customGoalData: any) => apiClient.updateCustomGoal(customGoalData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-goal'] })
      queryClient.invalidateQueries({ queryKey: ['available-goals'] })
      toast.success('Objetivo personalizado atualizado!')
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar objetivo personalizado:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao atualizar objetivo: ${message}`)
    },
  })
}

export function useTestGoalBehavior() {
  return useMutation({
    mutationFn: ({ goalType, testData }: { goalType: string; testData: any }) => 
      apiClient.testGoalBehavior(goalType, testData),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Teste de comportamento executado com sucesso!')
      } else {
        toast.error(`Erro no teste: ${result.message}`)
      }
    },
    onError: (error: any) => {
      console.error('Erro ao testar comportamento:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro no teste: ${message}`)
    },
  })
}