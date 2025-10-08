'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { useAIConfiguration, useUpdateAIConfiguration } from '@/hooks/use-ai-training'
import { ConversationGoal, SpecificBusinessHours } from '@/types/api'
import { Brain, Target, Clock, Shield } from 'lucide-react'

const conversationGoals: { value: ConversationGoal; label: string; description: string }[] = [
  {
    value: 'helpful',
    label: 'Prestativo',
    description: 'Foca em ser útil e fornecer informações completas'
  },
  {
    value: 'deal_closer',
    label: 'Vendedor',
    description: 'Prioriza converter conversas em vendas'
  },
  {
    value: 'support_agent',
    label: 'Suporte',
    description: 'Especializado em resolver problemas e dúvidas'
  },
  {
    value: 'lead_generator',
    label: 'Gerador de Leads',
    description: 'Foca em capturar informações de contato e interesse'
  },
  {
    value: 'custom',
    label: 'Personalizado',
    description: 'Comportamento definido por instruções customizadas'
  }
]

export function AIConfigurationPanel() {
  const { data: config, isLoading } = useAIConfiguration()
  const updateMutation = useUpdateAIConfiguration()
  
  const defaultBusinessHours: SpecificBusinessHours = useMemo(() => ({
    timezone: 'America/Sao_Paulo',
    schedule: {
      monday: { start: '09:00', end: '18:00', active: true },
      tuesday: { start: '09:00', end: '18:00', active: true },
      wednesday: { start: '09:00', end: '18:00', active: true },
      thursday: { start: '09:00', end: '18:00', active: true },
      friday: { start: '09:00', end: '18:00', active: true },
      saturday: { start: '09:00', end: '14:00', active: false },
      sunday: { start: '09:00', end: '14:00', active: false }
    }
  }), [])

  const [formData, setFormData] = useState({
    conversationGoal: 'helpful' as ConversationGoal,
    confidenceThreshold: 0.8,
    responseStyle: '',
    fallbackMessage: '',
    enableManualReview: false,
    businessHours: defaultBusinessHours as SpecificBusinessHours
  })

  useEffect(() => {
    if (config) {
      setFormData({
        conversationGoal: config.conversationGoal,
        confidenceThreshold: config.confidenceThreshold,
        responseStyle: config.responseStyle || '',
        fallbackMessage: config.fallbackMessage || '',
        enableManualReview: config.enableManualReview,
        businessHours: (config.businessHours as SpecificBusinessHours) || defaultBusinessHours
      })
    }
  }, [config, defaultBusinessHours])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await updateMutation.mutateAsync({
        conversationGoal: formData.conversationGoal,
        confidenceThreshold: formData.confidenceThreshold,
        responseStyle: formData.responseStyle || undefined,
        fallbackMessage: formData.fallbackMessage || undefined,
        enableManualReview: formData.enableManualReview,
        businessHours: formData.businessHours
      })
    } catch {
      // Error handling is done in the mutation hook
    }
  }

  const selectedGoal = conversationGoals.find(goal => goal.value === formData.conversationGoal)

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Conversation Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objetivo da Conversa
          </CardTitle>
          <CardDescription>
            Define como a IA deve se comportar e quais objetivos priorizar nas conversas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Comportamento</Label>
            <Select
              value={formData.conversationGoal}
              onValueChange={(value: ConversationGoal) => 
                setFormData(prev => ({ ...prev, conversationGoal: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {conversationGoals.map((goal) => (
                  <SelectItem key={goal.value} value={goal.value}>
                    <div>
                      <div className="font-medium">{goal.label}</div>
                      <div className="text-xs text-muted-foreground">{goal.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedGoal && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{selectedGoal.label}:</strong> {selectedGoal.description}
              </p>
            </div>
          )}

          {formData.conversationGoal === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="responseStyle">Instruções Personalizadas</Label>
              <Textarea
                id="responseStyle"
                placeholder="Descreva como a IA deve se comportar, que tom usar, quais informações priorizar..."
                value={formData.responseStyle}
                onChange={(e) => setFormData(prev => ({ ...prev, responseStyle: e.target.value }))}
                rows={4}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Confidence and Fallback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Configurações de Confiança
          </CardTitle>
          <CardDescription>
            Configure quando a IA deve responder automaticamente ou escalar para revisão manual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="confidenceThreshold">
              Limiar de Confiança: {(formData.confidenceThreshold * 100).toFixed(0)}%
            </Label>
            <Input
              id="confidenceThreshold"
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={formData.confidenceThreshold}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                confidenceThreshold: parseFloat(e.target.value) 
              }))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Respostas com confiança abaixo deste valor serão enviadas para revisão manual.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Revisão Manual</Label>
              <p className="text-sm text-muted-foreground">
                Ativar fila de revisão para respostas de baixa confiança
              </p>
            </div>
            <Switch
              checked={formData.enableManualReview}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, enableManualReview: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fallbackMessage">Mensagem de Fallback</Label>
            <Textarea
              id="fallbackMessage"
              placeholder="Mensagem enviada quando a IA não consegue responder com confiança..."
              value={formData.fallbackMessage}
              onChange={(e) => setFormData(prev => ({ ...prev, fallbackMessage: e.target.value }))}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para usar a mensagem padrão do sistema.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horário de Funcionamento
          </CardTitle>
          <CardDescription>
            Configure quando a IA deve responder automaticamente. Fora do horário, pode usar mensagem personalizada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {Object.entries(formData.businessHours.schedule).map(([day, schedule]) => (
              <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={schedule.active}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        businessHours: {
                          ...prev.businessHours,
                          schedule: {
                            ...prev.businessHours.schedule,
                            [day]: { ...schedule, active: checked }
                          }
                        }
                      }))
                    }
                  />
                  <span className="font-medium capitalize">
                    {getDayLabel(day)}
                  </span>
                </div>
                
                {schedule.active && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={schedule.start}
                      onChange={(e) => 
                        setFormData(prev => ({
                          ...prev,
                          businessHours: {
                            ...prev.businessHours,
                            schedule: {
                              ...prev.businessHours.schedule,
                              [day]: { ...schedule, start: e.target.value }
                            }
                          }
                        }))
                      }
                      className="w-24"
                    />
                    <span className="text-muted-foreground">às</span>
                    <Input
                      type="time"
                      value={schedule.end}
                      onChange={(e) => 
                        setFormData(prev => ({
                          ...prev,
                          businessHours: {
                            ...prev.businessHours,
                            schedule: {
                              ...prev.businessHours.schedule,
                              [day]: { ...schedule, end: e.target.value }
                            }
                          }
                        }))
                      }
                      className="w-24"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={updateMutation.isPending}
          className="flex items-center gap-2"
        >
          <Shield className="h-4 w-4" />
          {updateMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </form>
  )
}

function getDayLabel(day: string): string {
  const labels: Record<string, string> = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo'
  }
  return labels[day] || day
}