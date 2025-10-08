'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// import type { WhatsAppCredentials } from "@/types/api"
import { useConnectWhatsApp, useTestWhatsAppConnection } from "@/hooks/use-whatsapp"
import { Eye, EyeOff, TestTube, Loader2, Phone } from "lucide-react"

const connectionSchema = z.object({
  phoneNumberId: z.string().min(1, "ID do número de telefone é obrigatório"),
  accessToken: z.string().min(1, "Token de acesso é obrigatório"),
  webhookVerifyToken: z.string().min(1, "Token de verificação do webhook é obrigatório"),
  businessName: z.string().optional(),
})

type ConnectionFormData = z.infer<typeof connectionSchema>

interface ConnectionFormProps {
  onSuccess?: () => void
}

export function ConnectionForm({ onSuccess }: ConnectionFormProps) {
  const [showAccessToken, setShowAccessToken] = useState(false)
  const [showWebhookToken, setShowWebhookToken] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const connectMutation = useConnectWhatsApp()
  const testMutation = useTestWhatsAppConnection()

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    reset,
  } = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionSchema),
  })

  const onSubmit = async (data: ConnectionFormData) => {
    try {
      await connectMutation.mutateAsync(data)
      reset()
      onSuccess?.()
    } catch {
      // Error is handled by the mutation hook
    }
  }

  const handleTestConnection = async () => {
    const formData = getValues()
    
    // Validate required fields
    if (!formData.phoneNumberId || !formData.accessToken || !formData.webhookVerifyToken) {
      setTestResult({
        success: false,
        message: "Preencha todos os campos obrigatórios antes de testar"
      })
      return
    }

    try {
      const result = await testMutation.mutateAsync(formData)
      setTestResult(result)
    } catch {
      setTestResult({
        success: false,
        message: "Erro ao testar conexão"
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Conectar WhatsApp Business
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Nome do Negócio (Opcional)</Label>
            <Input
              id="businessName"
              placeholder="Ex: Minha Empresa Ltda"
              {...register("businessName")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumberId">ID do Número de Telefone *</Label>
            <Input
              id="phoneNumberId"
              placeholder="Ex: 123456789012345"
              {...register("phoneNumberId")}
            />
            {errors.phoneNumberId && (
              <p className="text-sm text-red-600">{errors.phoneNumberId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">Token de Acesso *</Label>
            <div className="relative">
              <Input
                id="accessToken"
                type={showAccessToken ? "text" : "password"}
                placeholder="Token de acesso do WhatsApp Business API"
                {...register("accessToken")}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowAccessToken(!showAccessToken)}
              >
                {showAccessToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.accessToken && (
              <p className="text-sm text-red-600">{errors.accessToken.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookVerifyToken">Token de Verificação do Webhook *</Label>
            <div className="relative">
              <Input
                id="webhookVerifyToken"
                type={showWebhookToken ? "text" : "password"}
                placeholder="Token para verificação do webhook"
                {...register("webhookVerifyToken")}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowWebhookToken(!showWebhookToken)}
              >
                {showWebhookToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.webhookVerifyToken && (
              <p className="text-sm text-red-600">{errors.webhookVerifyToken.message}</p>
            )}
          </div>

          {testResult && (
            <div className={`p-3 rounded-md text-sm ${
              testResult.success 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {testResult.message}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>
            
            <Button
              type="submit"
              disabled={connectMutation.isPending}
              className="flex-1"
            >
              {connectMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Phone className="h-4 w-4 mr-2" />
              )}
              Conectar WhatsApp
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Como obter as credenciais:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Acesse o Meta for Developers</li>
            <li>• Crie um app WhatsApp Business</li>
            <li>• Configure o webhook com a URL fornecida</li>
            <li>• Copie o Phone Number ID e Access Token</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}