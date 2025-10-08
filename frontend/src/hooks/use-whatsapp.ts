import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { WhatsAppCredentials } from '@/types/api'
import { toast } from 'sonner'

export function useWhatsAppConnectionStatus() {
  return useQuery({
    queryKey: ['whatsapp-connection-status'],
    queryFn: () => apiClient.getWhatsAppConnectionStatus(),
    refetchInterval: 30000, // Check status every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export function useWhatsAppAccount() {
  return useQuery({
    queryKey: ['whatsapp-account'],
    queryFn: () => apiClient.getWhatsAppAccount(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useWhatsAppWebhookInfo() {
  return useQuery({
    queryKey: ['whatsapp-webhook-info'],
    queryFn: () => apiClient.getWhatsAppWebhookInfo(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useConnectWhatsApp() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (credentials: WhatsAppCredentials) => apiClient.connectWhatsApp(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connection-status'] })
      toast.success('WhatsApp conectado com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao conectar WhatsApp:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao conectar WhatsApp: ${message}`)
    },
  })
}

export function useTestWhatsAppConnection() {
  return useMutation({
    mutationFn: (credentials?: WhatsAppCredentials) => apiClient.testWhatsAppConnection(credentials),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Conexão testada com sucesso!')
      } else {
        toast.error(`Erro no teste: ${result.message}`)
      }
    },
    onError: (error: any) => {
      console.error('Erro ao testar conexão:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao testar conexão: ${message}`)
    },
  })
}

export function useSendTestMessage() {
  return useMutation({
    mutationFn: ({ phoneNumber, message }: { phoneNumber: string; message: string }) => 
      apiClient.sendTestMessage(phoneNumber, message),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Mensagem de teste enviada com sucesso!')
      } else {
        toast.error(`Erro ao enviar mensagem: ${result.message}`)
      }
    },
    onError: (error: any) => {
      console.error('Erro ao enviar mensagem de teste:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao enviar mensagem: ${message}`)
    },
  })
}

export function useDisconnectWhatsApp() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => apiClient.disconnectWhatsApp(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connection-status'] })
      toast.success('WhatsApp desconectado com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao desconectar WhatsApp:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao desconectar WhatsApp: ${message}`)
    },
  })
}

export function useUpdateWhatsAppAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (updates: Partial<WhatsAppCredentials>) => apiClient.updateWhatsAppAccount(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connection-status'] })
      toast.success('Conta WhatsApp atualizada com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar conta WhatsApp:', error)
      const message = apiClient.getErrorMessage(error)
      toast.error(`Erro ao atualizar conta WhatsApp: ${message}`)
    },
  })
}