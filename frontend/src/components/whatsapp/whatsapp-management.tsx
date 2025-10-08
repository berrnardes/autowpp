'use client'

import { useState } from "react"
import { ConnectionForm } from "./connection-form"
import { ConnectionStatus } from "./connection-status"
import { useWhatsAppAccount } from "@/hooks/use-whatsapp"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Plus, Settings, AlertCircle } from "lucide-react"

export function WhatsAppManagement() {
  const [showConnectionForm, setShowConnectionForm] = useState(false)
  const { data: account, isLoading, error } = useWhatsAppAccount()

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
            <p className="text-muted-foreground">
              Gerencie sua conexão com o WhatsApp Business
            </p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
            <p className="text-muted-foreground">
              Gerencie sua conexão com o WhatsApp Business
            </p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>Erro ao carregar informações do WhatsApp</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasAccount = account !== null

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie sua conexão com o WhatsApp Business
          </p>
        </div>
        
        {!hasAccount && (
          <Button onClick={() => setShowConnectionForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Conectar WhatsApp
          </Button>
        )}
      </div>

      {/* Content */}
      {hasAccount ? (
        <div className="space-y-6">
          <ConnectionStatus 
            account={account!} 
            onEdit={() => setShowConnectionForm(true)}
          />
          
          {showConnectionForm && (
            <ConnectionForm 
              onSuccess={() => setShowConnectionForm(false)}
            />
          )}
          
          {/* Webhook Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração do Webhook
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">URL do Webhook</label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <code className="text-sm">
                    {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/whatsapp/webhook
                  </code>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Eventos Subscritos</label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">message_deliveries</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">message_reads</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Instruções de Configuração:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Acesse o Meta for Developers</li>
                  <li>Vá para seu app WhatsApp Business</li>
                  <li>Configure o webhook com a URL acima</li>
                  <li>Inscreva-se nos eventos: messages, message_deliveries, message_reads</li>
                  <li>Use o token de verificação configurado na conexão</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* No Connection State */}
          {!showConnectionForm ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Phone className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  Nenhuma conta WhatsApp conectada
                </h3>
                <p className="text-muted-foreground mb-6">
                  Conecte sua conta do WhatsApp Business para começar a automatizar suas conversas
                </p>
                <Button onClick={() => setShowConnectionForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Conectar WhatsApp
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ConnectionForm 
              onSuccess={() => setShowConnectionForm(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}