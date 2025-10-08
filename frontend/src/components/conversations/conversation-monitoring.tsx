'use client'

import { useState } from 'react'
import { ConversationList } from './conversation-list'
import { ConversationDetails } from './conversation-details'
import { ConversationFilters } from './conversation-filters'
import { ConversationAnalytics } from './conversation-analytics'
import { FlaggedReview } from './flagged-review'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download, AlertTriangle } from 'lucide-react'
import { useConversations, useFlaggedConversations, useExportConversations } from '@/hooks/use-conversations'
import type { ConversationFilters as ConversationFiltersType } from '@/types/api'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function ConversationMonitoring() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [filters, setFilters] = useState<ConversationFiltersType>({})
  const [activeTab, setActiveTab] = useState('all')
  
  const queryClient = useQueryClient()
  const exportMutation = useExportConversations()

  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    error: conversationsError
  } = useConversations(filters)

  const {
    data: flaggedConversations = [],
    isLoading: isLoadingFlagged
  } = useFlaggedConversations()

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['conversations'] })
    await queryClient.invalidateQueries({ queryKey: ['flagged-conversations'] })
    await queryClient.invalidateQueries({ queryKey: ['conversation-analytics'] })
    toast.success('Dados atualizados com sucesso')
  }

  const handleExport = (format: 'csv' | 'json' = 'csv') => {
    exportMutation.mutate({ filters, format })
  }

  const handleFilterChange = (newFilters: ConversationFiltersType) => {
    setFilters(newFilters)
    setSelectedConversationId(null) // Clear selection when filters change
  }

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId)
  }

  if (conversationsError) {
    console.error('Erro ao carregar conversas:', conversationsError)
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoramento de Conversas</h1>
          <p className="text-muted-foreground">
            Monitore, revise e gerencie todas as conversas automatizadas
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar JSON
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todas as Conversas</TabsTrigger>
          <TabsTrigger value="flagged" className="relative">
            Sinalizadas
            {flaggedConversations.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {flaggedConversations.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
          <TabsTrigger value="review">Revisão Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Filters and Conversation List */}
            <div className="lg:col-span-2 space-y-4">
              <ConversationFilters
                filters={filters}
                onFiltersChange={handleFilterChange}
              />
              <ConversationList
                conversations={conversations}
                isLoading={isLoadingConversations}
                selectedId={selectedConversationId}
                onSelect={handleConversationSelect}
              />
            </div>

            {/* Conversation Details */}
            <div>
              {selectedConversationId ? (
                <ConversationDetails conversationId={selectedConversationId} />
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center text-muted-foreground">
                      <p>Selecione uma conversa para ver os detalhes</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="flagged" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                    Conversas Sinalizadas ({flaggedConversations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ConversationList
                    conversations={flaggedConversations}
                    isLoading={isLoadingFlagged}
                    selectedId={selectedConversationId}
                    onSelect={handleConversationSelect}
                    showFlags={true}
                  />
                </CardContent>
              </Card>
            </div>
            <div>
              {selectedConversationId ? (
                <FlaggedReview conversationId={selectedConversationId} />
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center text-muted-foreground">
                      <p>Selecione uma conversa sinalizada para revisar</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <ConversationAnalytics />
        </TabsContent>

        <TabsContent value="review" className="space-y-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Revisão Manual</h3>
            <p className="text-muted-foreground mb-4">
              Interface para controle manual de conversas em tempo real
            </p>
            <p className="text-sm text-muted-foreground">
              Esta funcionalidade será implementada em uma versão futura
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}