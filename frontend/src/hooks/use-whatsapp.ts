import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { WhatsAppCredentials } from '@/types/api'
import { toast } from 'sonner'

export function useWhatsAppAccount() {
  return useQuery({
    queryKey: ['whatsapp-account'],
    queryFn: () => apiClient.getWhatsAppAccount(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useConnectWhatsApp() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (credentials: WhatsAppCredentials) => apiClient.connectWhatsApp(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account'] })
      toast.success('WhatsApp conectado com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao conectar WhatsApp:', error)
      toast.error('Erro ao conectar WhatsApp. Verifique suas credenciais.')
    },
  })
}

export function useTestWhatsAppConnection() {
  return useMutation({
    mutationFn: (credentials: WhatsAppCredentials) => apiClient.testWhatsAppConnection(credentials),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Conexão testada com sucesso!')
      } else {
        toast.error(`Erro no teste: ${result.message}`)
      }
    },
    onError: (error) => {
      console.error('Erro ao testar conexão:', error)
      toast.error('Erro ao testar conexão WhatsApp')
    },
  })
}

export function useDisconnectWhatsApp() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => apiClient.disconnectWhatsApp(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account'] })
      toast.success('WhatsApp desconectado com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao desconectar WhatsApp:', error)
      toast.error('Erro ao desconectar WhatsApp')
    },
  })
}

export function useUpdateWhatsAppAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (updates: Partial<WhatsAppCredentials>) => apiClient.updateWhatsAppAccount(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account'] })
      toast.success('Conta WhatsApp atualizada com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao atualizar conta WhatsApp:', error)
      toast.error('Erro ao atualizar conta WhatsApp')
    },
  })
}