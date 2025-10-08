'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  User, 
  Bot, 
  Clock, 
  Flag, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  MessageSquare,
  Edit,
  Send,
  Phone
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useConversation, useUpdateConversationStatus, useFlagMessage, useUnflagMessage, useRequestTakeover, useOverrideResponse } from '@/hooks/use-conversations'
import type { Message } from '@/types/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ConversationDetailsProps {
  conversationId: string
}

export function ConversationDetails({ conversationId }: ConversationDetailsProps) {
  const [_selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [takeoverReason, setTakeoverReason] = useState('')
  const [overrideContent, setOverrideContent] = useState('')
  const [flagReason, setFlagReason] = useState('')

  const { data: conversation, isLoading, error } = useConversation(conversationId)
  const updateStatusMutation = useUpdateConversationStatus()
  const flagMessageMutation = useFlagMessage()
  const unflagMessageMutation = useUnflagMessage()
  const takeoverMutation = useRequestTakeover()
  const overrideMutation = useOverrideResponse()

  const handleStatusChange = (status: 'active' | 'resolved' | 'escalated') => {
    updateStatusMutation.mutate({ id: conversationId, status })
  }

  const handleFlagMessage = (message: Message) => {
    if (!flagReason.trim()) {
      toast.error('Por favor, informe o motivo da sinalização')
      return
    }
    flagMessageMutation.mutate({ messageId: message.id, reason: flagReason })
    setFlagReason('')
    setSelectedMessage(null)
  }

  const handleUnflagMessage = (message: Message) => {
    unflagMessageMutation.mutate(message.id)
  }

  const handleTakeover = () => {
    if (!takeoverReason.trim()) {
      toast.error('Por favor, informe o motivo da solicitação')
      return
    }
    takeoverMutation.mutate({
      conversationId,
      reason: takeoverReason,
      priority: 'medium'
    })
    setTakeoverReason('')
  }

  const handleOverrideResponse = (message: Message) => {
    if (!overrideContent.trim()) {
      toast.error('Por favor, informe o novo conteúdo da resposta')
      return
    }
    overrideMutation.mutate({
      messageId: message.id,
      newContent: overrideContent,
      reason: 'Manual override from conversation review'
    })
    setOverrideContent('')
    setSelectedMessage(null)
  }

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null
    
    const percentage = Math.round(confidence * 100)
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline"
    let color = "text-gray-600"
    
    if (percentage >= 80) {
      variant = "default"
      color = "text-green-600"
    } else if (percentage >= 60) {
      variant = "secondary"
      color = "text-yellow-600"
    } else {
      variant = "destructive"
      color = "text-red-600"
    }
    
    return (
      <Badge variant={variant} className={cn("text-xs", color)}>
        {percentage}%
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'escalated':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex space-x-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error || !conversation) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p>Erro ao carregar conversa</p>
            <p className="text-sm">Tente selecionar outra conversa</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Conversation Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {conversation.customerName || 'Cliente'}
                </CardTitle>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {conversation.customerPhone}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(conversation.status)}
              <Select
                value={conversation.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="resolved">Resolvida</SelectItem>
                  <SelectItem value="escalated">Escalada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total de mensagens:</span>
              <span className="ml-2 font-medium">{conversation.totalMessages}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Mensagens da IA:</span>
              <span className="ml-2 font-medium">{conversation.aiMessages}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Criada em:</span>
              <span className="ml-2 font-medium">
                {format(new Date(conversation.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Última atividade:</span>
              <span className="ml-2 font-medium">
                {format(new Date(conversation.lastActivity), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Mensagens</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Solicitar Controle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Solicitar Controle Manual</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="takeover-reason">Motivo da solicitação</Label>
                    <Textarea
                      id="takeover-reason"
                      placeholder="Descreva por que precisa assumir o controle desta conversa..."
                      value={takeoverReason}
                      onChange={(e) => setTakeoverReason(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleTakeover} className="w-full">
                    Enviar Solicitação
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {conversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex space-x-3 p-3 rounded-lg",
                    message.type === 'incoming' ? "bg-muted/50" : "bg-primary/5",
                    message.flagged && "border-l-4 border-yellow-500"
                  )}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-background border flex items-center justify-center">
                      {message.type === 'incoming' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {message.type === 'incoming' ? 'Cliente' : 'IA'}
                        </span>
                        {message.isAI && getConfidenceBadge(message.confidence)}
                        {message.flagged && (
                          <Badge variant="outline" className="text-yellow-600">
                            <Flag className="h-3 w-3 mr-1" />
                            Sinalizada
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(message.timestamp), 'HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {/* Message Actions */}
                    <div className="flex items-center space-x-2 mt-2">
                      {!message.flagged ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(message)}>
                              <Flag className="h-3 w-3 mr-1" />
                              Sinalizar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Sinalizar Mensagem</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="flag-reason">Motivo da sinalização</Label>
                                <Textarea
                                  id="flag-reason"
                                  placeholder="Descreva por que esta mensagem deve ser sinalizada..."
                                  value={flagReason}
                                  onChange={(e) => setFlagReason(e.target.value)}
                                />
                              </div>
                              <Button onClick={() => handleFlagMessage(message)} className="w-full">
                                Sinalizar Mensagem
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleUnflagMessage(message)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Remover Sinalização
                        </Button>
                      )}

                      {message.isAI && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(message)}>
                              <Edit className="h-3 w-3 mr-1" />
                              Substituir
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Substituir Resposta da IA</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="override-content">Nova resposta</Label>
                                <Textarea
                                  id="override-content"
                                  placeholder="Digite a nova resposta..."
                                  value={overrideContent}
                                  onChange={(e) => setOverrideContent(e.target.value)}
                                />
                              </div>
                              <Button onClick={() => handleOverrideResponse(message)} className="w-full">
                                Substituir Resposta
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}