'use client'


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConversationExamplesManager, AIConfigurationPanel, TrainingProgress } from './index'
import { Brain, MessageSquare, Settings, BarChart3 } from 'lucide-react'

export function AITrainingManagement() {
  return (
    <div className="space-y-6">
      {/* Training Progress Overview */}
      <TrainingProgress />
      
      {/* Main Training Interface */}
      <Tabs defaultValue="examples" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="examples" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Exemplos de Conversa
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração da IA
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análise de Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Gerenciar Exemplos de Conversa
              </CardTitle>
              <CardDescription>
                Adicione exemplos de conversas para treinar a IA com o tom e estilo desejados para seu negócio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConversationExamplesManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Configuração da IA
              </CardTitle>
              <CardDescription>
                Configure o comportamento, objetivos e parâmetros da IA para otimizar as respostas automáticas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIConfigurationPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Análise de Performance
              </CardTitle>
              <CardDescription>
                Monitore a performance da IA e identifique oportunidades de melhoria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Análise de performance em desenvolvimento</p>
                <p className="text-sm">Esta funcionalidade será implementada em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}