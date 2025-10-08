'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useConversationExamples, useAIConfiguration } from '@/hooks/use-ai-training'
import { Brain, MessageSquare, Target, TrendingUp } from 'lucide-react'

export function TrainingProgress() {
  const { data: examples, isLoading: examplesLoading } = useConversationExamples()
  const { data: config, isLoading: configLoading } = useAIConfiguration()

  if (examplesLoading || configLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const exampleCount = examples?.length || 0
  const trainingQuality = getTrainingQuality(exampleCount)
  const modelStatus = getModelStatus(config, exampleCount)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Exemplos de Treino</p>
              <p className="text-2xl font-bold">{exampleCount}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-4">
            <Progress value={Math.min((exampleCount / 20) * 100, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Recomendado: 20+ exemplos
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Qualidade do Treino</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={trainingQuality.variant as "default" | "secondary" | "destructive" | "outline"}>
                  {trainingQuality.label}
                </Badge>
              </div>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-4">
            <Progress value={trainingQuality.score} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {trainingQuality.description}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Objetivo da IA</p>
              <p className="text-lg font-semibold capitalize">
                {getGoalLabel(config?.conversationGoal || 'helpful')}
              </p>
            </div>
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-4">
            <Badge variant="outline" className="text-xs">
              Limiar: {((config?.confidenceThreshold || 0.8) * 100).toFixed(0)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status do Modelo</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={modelStatus.variant as "default" | "secondary" | "destructive" | "outline"}>
                  {modelStatus.label}
                </Badge>
              </div>
            </div>
            <Brain className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">
              {modelStatus.description}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getTrainingQuality(exampleCount: number): {
  label: string
  variant: string
  score: number
  description: string
} {
  if (exampleCount >= 20) {
    return {
      label: 'Excelente',
      variant: 'default',
      score: 100,
      description: 'Quantidade ideal de exemplos'
    }
  } else if (exampleCount >= 10) {
    return {
      label: 'Bom',
      variant: 'secondary',
      score: 70,
      description: 'Adicione mais exemplos para melhorar'
    }
  } else if (exampleCount >= 5) {
    return {
      label: 'Regular',
      variant: 'outline',
      score: 40,
      description: 'Precisa de mais exemplos'
    }
  } else {
    return {
      label: 'Insuficiente',
      variant: 'destructive',
      score: 20,
      description: 'Adicione exemplos para começar'
    }
  }
}

function getModelStatus(config: unknown, exampleCount: number): {
  label: string
  variant: string
  description: string
} {
  if (!config) {
    return {
      label: 'Não Configurado',
      variant: 'destructive',
      description: 'Configure a IA para começar'
    }
  }

  if (exampleCount === 0) {
    return {
      label: 'Aguardando Treino',
      variant: 'outline',
      description: 'Adicione exemplos para treinar'
    }
  }

  if (exampleCount < 5) {
    return {
      label: 'Treino Básico',
      variant: 'secondary',
      description: 'Modelo com treino limitado'
    }
  }

  return {
    label: 'Ativo',
    variant: 'default',
    description: 'Modelo treinado e funcionando'
  }
}

function getGoalLabel(goal: string) {
  const labels: Record<string, string> = {
    helpful: 'Prestativo',
    deal_closer: 'Vendedor',
    support_agent: 'Suporte',
    lead_generator: 'Gerador de Leads',
    custom: 'Personalizado'
  }
  return labels[goal] || goal
}