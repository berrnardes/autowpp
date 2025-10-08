'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Flag, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Bot, 
  Clock,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Send
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useConversation, useUnflagMessage, useUpdateConversationStatus, useOverrideResponse } from '@/hooks/use-conversations'
import type { Message } from '@/types/api'
import { toast } from 'sonner'

interface FlaggedReviewProps {
  conversationId: string
}

export function FlaggedReview({ conversationId }: FlaggedReviewProps) {
  const [reviewNotes, setReviewNotes] = useState('')
  const [overrideContent, setOverrideContent] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

  const { data: conversation, isLoading } = useConversation(conversationId)
  const unflagMessageMutation = useUnflagMessage()
  const updateStatusMutation = useUpdateConversationStatus()
  const overrideMutation = useOverrideResponse()

  const flaggedMessages = conversation?.messages.filter(m => m.flagged) || []

  const handleApproveMessage = (message: Message) => {
    unflagMessageMutation.mutate(message.id)
    toast.success('Mensagem aprovada')
  }

  const handleRejectMessage = (_message: Message) => {
    // In a real implementation, this would mark the message as rejected
    // and potentially trigger retraining or escalation
    toast.info('Mensagem rejeitada - será usada para melhorar o treinamento')
  }

  const handleOverrideResponse = (message: Message) => {
    if (!overrideContent.trim()) {
      toast.error('Por favor, informe o novo conteúdo da resposta')
      return
    }
    
    overrideMutation.mutate({
      messageId: message.id,
      newContent: overrideContent,
      reason: `Manual override during flagged review: ${reviewNotes || 'No additional notes'}`
    })
    setOverrideContent('')
    setSelectedMessage(null)
    setReviewNotes('')
  }

  const handleEscalateConversation = () => {
    updateStatusMutation.mutate({ 
      id: conversationId, 
      status: 'escalated' 
    })
    toast.success('Conversa escalada para revisão manual')
  }

  const handleResolveConversation = () => {
    updateStatusMutation.mutate({ 
      id: conversationId, 
      status: 'resolved' 
    })
    toast.success('Conversa marcada como resolvida')
  }

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null
    
    const percentage = Math.round(confidence * 100)
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline"
    
    if (percentage >= 80) variant = "default"
    else if (percentage >= 60) variant = "secondary"
    else variant = "destructive"
    
    return <Badge variant={variant} className="text-xs">{percentage}%</Badge>
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!conversation) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p>Conversa não encontrada</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (flaggedMessages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            Nenhuma Mensagem Sinalizada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Esta conversa não possui mensagens sinalizadas</p>
            <p className="text-sm">Todas as mensagens foram aprovadas ou não há sinalizações</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Review Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Flag className="h-5 w-5 mr-2 text-yellow-500" />
            Revisão de Mensagens Sinalizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {flaggedMessages.length} mensagem(ns) sinalizada(s) para revisão
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleEscalateConversation}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Escalar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleResolveConversation}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolver
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flagged Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Mensagens Sinalizadas</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {flaggedMessages.map((message, index) => (
                <div key={message.id}>
                  <div className="border-l-4 border-yellow-500 pl-4 py-3 bg-yellow-50/50 rounded-r-lg">
                    {/* Message Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="h-6 w-6 rounded-full bg-background border flex items-center justify-center">
                          {message.type === 'incoming' ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <Bot className="h-3 w-3 text-primary" />
                          )}
                        </div>
                        <span className="text-sm font-medium">
                          {message.type === 'incoming' ? 'Cliente' : 'IA'}
                        </span>
                        {message.isAI && getConfidenceBadge(message.confidence)}
                        <Badge variant="outline" className="text-yellow-600">
                          <Flag className="h-3 w-3 mr-1" />
                          Sinalizada
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(new Date(message.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
                      </span>
                    </div>

                    {/* Message Content */}
                    <div className="mb-3">
                      <p className="text-sm whitespace-pre-wrap bg-white p-3 rounded border">
                        {message.content}
                      </p>
                    </div>

                    {/* Review Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApproveMessage(message)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectMessage(message)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          Rejeitar
                        </Button>
                        {message.isAI && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedMessage(message)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        )}
                      </div>
                      
                      {/* Review Status */}
                      <div className="text-xs text-muted-foreground">
                        Status: {message.reviewStatus || 'Pendente'}
                      </div>
                    </div>

                    {/* Override Form */}
                    {selectedMessage?.id === message.id && message.isAI && (
                      <div className="mt-4 p-4 bg-white border rounded-lg">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium">Nova resposta:</label>
                            <Textarea
                              placeholder="Digite a resposta correta..."
                              value={overrideContent}
                              onChange={(e) => setOverrideContent(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Notas de revisão (opcional):</label>
                            <Textarea
                              placeholder="Adicione notas sobre a correção..."
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleOverrideResponse(message)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Aplicar Correção
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMessage(null)
                                setOverrideContent('')
                                setReviewNotes('')
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {index < flaggedMessages.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Review Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Revisão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total de mensagens:</span>
              <span className="ml-2 font-medium">{conversation.totalMessages}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Mensagens sinalizadas:</span>
              <span className="ml-2 font-medium text-yellow-600">{flaggedMessages.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Confiança média:</span>
              <span className="ml-2 font-medium">
                {conversation.averageConfidence 
                  ? `${Math.round(conversation.averageConfidence * 100)}%`
                  : 'N/A'
                }
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Status atual:</span>
              <span className="ml-2 font-medium capitalize">{conversation.status}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}