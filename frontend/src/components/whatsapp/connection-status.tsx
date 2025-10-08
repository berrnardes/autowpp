'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { WhatsAppAccount } from "@/types/api"
import { useDisconnectWhatsApp } from "@/hooks/use-whatsapp"
import { 
  Phone, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Loader2,
  AlertTriangle,
  Settings
} from "lucide-react"

interface ConnectionStatusProps {
  account: WhatsAppAccount
  onEdit?: () => void
}

export function ConnectionStatus({ account, onEdit }: ConnectionStatusProps) {
  const disconnectMutation = useDisconnectWhatsApp()

  const handleDisconnect = async () => {
    if (window.confirm('Tem certeza que deseja desconectar o WhatsApp? Isso interromperá todas as automações.')) {
      try {
        await disconnectMutation.mutateAsync()
      } catch {
        // Error is handled by the mutation hook
      }
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Status da Conexão WhatsApp
          </div>
          <Badge 
            variant={account.isConnected ? "default" : "destructive"}
            className={account.isConnected ? "bg-green-100 text-green-800" : ""}
          >
            {account.isConnected ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Conectado
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Desconectado
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome do Negócio</label>
              <p className="text-sm font-mono">
                {account.businessName || 'Não informado'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Número de Telefone</label>
              <p className="text-sm font-mono">
                {account.phoneNumber || 'Não disponível'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">ID do Número</label>
              <p className="text-sm font-mono break-all">
                {account.phoneNumberId}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Conectado em</label>
              <p className="text-sm">
                <Calendar className="h-3 w-3 inline mr-1" />
                {formatDate(account.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Connection Health */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Status da Conexão</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">API</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-green-600">Online</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">Webhook</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-green-600">Ativo</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">Mensagens</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-green-600">Funcionando</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t pt-4 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onEdit}
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-2" />
            Editar Configurações
          </Button>
          
          <Button
            variant="destructive"
            onClick={handleDisconnect}
            disabled={disconnectMutation.isPending}
            className="flex-1"
          >
            {disconnectMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Desconectar
          </Button>
        </div>

        {/* Warning for disconnected state */}
        {!account.isConnected && (
          <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-800">
                Conexão Inativa
              </p>
              <p className="text-sm text-orange-700">
                O WhatsApp está desconectado. As automações não funcionarão até que a conexão seja reestabelecida.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}