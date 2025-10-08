'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  MessageSquare, 
  Clock, 
  User, 
  Bot, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Flag
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Conversation } from '@/types/api'
import { cn } from '@/lib/utils'

interface ConversationListProps {
  conversations: Conversation[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (conversationId: string) => void
  showFlags?: boolean
}

export function ConversationList({ 
  conversations, 
  isLoading, 
  selectedId, 
  onSelect,
  showFlags = false 
}: ConversationListProps) {
  
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Ativa</Badge>
      case 'resolved':
        return <Badge variant="secondary">Resolvida</Badge>
      case 'escalated':
        return <Badge variant="destructive">Escalada</Badge>
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
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
          <CardTitle>Conversas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (conversations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma conversa encontrada</p>
            <p className="text-sm">Tente ajustar os filtros ou aguarde novas conversas</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Conversas ({conversations.length})</span>
          {showFlags && (
            <Flag className="h-5 w-5 text-yellow-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                  selectedId === conversation.id && "bg-muted border-primary"
                )}
                onClick={() => onSelect(conversation.id)}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium truncate">
                        {conversation.customerName || conversation.customerPhone}
                      </p>
                      {getStatusIcon(conversation.status)}
                    </div>
                    <div className="flex items-center space-x-1">
                      {getConfidenceBadge(conversation.averageConfidence)}
                      {getStatusBadge(conversation.status)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {conversation.totalMessages}
                      </span>
                      <span className="flex items-center">
                        <Bot className="h-3 w-3 mr-1" />
                        {conversation.aiMessages}
                      </span>
                      <span className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {conversation.humanMessages}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(new Date(conversation.lastActivity), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </div>
                  </div>

                  {/* Show flagged messages indicator */}
                  {showFlags && conversation.messages.some(m => m.flagged) && (
                    <div className="flex items-center mt-2 text-xs text-yellow-600">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Mensagens sinalizadas
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}