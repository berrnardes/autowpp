'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { MetricsCards } from "./metrics-cards"
import { RecentInteractions } from "./recent-interactions"
import type { ConversationFilters } from "@/types/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Settings, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { useConversationMetrics, useRecentInteractions } from "@/hooks/use-dashboard"
import { useQueryClient } from "@tanstack/react-query"

export function Dashboard() {
  const [filters, setFilters] = useState<ConversationFilters>({})
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const queryClient = useQueryClient()

  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    error: metricsError
  } = useConversationMetrics()

  const {
    data: interactions = [],
    isLoading: isLoadingInteractions,
    error: interactionsError
  } = useRecentInteractions(20, filters)

  // Update last refresh time when data changes
  useEffect(() => {
    if (metrics || interactions.length > 0) {
      setLastRefresh(new Date())
    }
  }, [metrics, interactions])

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['conversation-metrics'] })
    await queryClient.invalidateQueries({ queryKey: ['recent-interactions'] })
    setLastRefresh(new Date())
    toast.success('Dashboard atualizado com sucesso')
  }

  const handleFilterChange = (newFilters: ConversationFilters) => {
    setFilters(newFilters)
  }

  // Handle errors
  if (metricsError && !metrics) {
    console.error('Erro ao carregar métricas:', metricsError)
  }

  if (interactionsError && interactions.length === 0) {
    console.error('Erro ao carregar interações:', interactionsError)
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das suas conversas automatizadas no WhatsApp
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Last refresh indicator */}
      <div className="text-xs text-muted-foreground">
        Última atualização: {lastRefresh.toLocaleTimeString('pt-BR')}
      </div>

      {/* Metrics Cards */}
      <MetricsCards metrics={metrics || null} isLoading={isLoadingMetrics} />

      {/* Recent Interactions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentInteractions
            interactions={interactions}
            isLoading={isLoadingInteractions}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/conversations">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ver Todas as Conversas
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configurar IA
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Treinar Modelo
              </Button>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">WhatsApp</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">Conectado</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">IA</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">Ativo</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Banco de Dados</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">Online</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}