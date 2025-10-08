'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { RecentInteraction, ConversationFilters } from "@/types/api"
import { Search, Phone, Bot, User, Clock, Filter, MessageCircle } from "lucide-react"

interface RecentInteractionsProps {
  interactions: RecentInteraction[]
  isLoading: boolean
  onFilterChange: (filters: ConversationFilters) => void
}

export function RecentInteractions({ 
  interactions, 
  isLoading, 
  onFilterChange 
}: RecentInteractionsProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    // In a real implementation, you might want to debounce this
    applyFilters(value, statusFilter)
  }

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status)
    applyFilters(searchTerm, status)
  }

  const applyFilters = (search: string, status: string) => {
    const filters: ConversationFilters = {}
    
    if (status !== "all") {
      filters.status = status as 'active' | 'resolved' | 'escalated'
    }
    
    onFilterChange(filters)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Ativa</Badge>
      case 'resolved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Resolvida</Badge>
      case 'escalated':
        return <Badge variant="default" className="bg-orange-100 text-orange-800">Escalada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null
    
    const percentage = Math.round(confidence * 100)
    let className = ""
    
    if (percentage >= 80) {
      className = "bg-green-100 text-green-800"
    } else if (percentage >= 60) {
      className = "bg-yellow-100 text-yellow-800"
    } else {
      className = "bg-red-100 text-red-800"
    }
    
    return (
      <Badge variant="outline" className={className}>
        {percentage}%
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return "Agora"
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`
    return date.toLocaleDateString('pt-BR')
  }

  const filteredInteractions = interactions.filter(interaction => {
    const matchesSearch = searchTerm === "" || 
      interaction.customerPhone.includes(searchTerm) ||
      interaction.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interaction.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Interações Recentes</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
        
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por telefone, nome ou mensagem..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativas</option>
              <option value="resolved">Resolvidas</option>
              <option value="escalated">Escaladas</option>
            </select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filteredInteractions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma interação encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInteractions.map((interaction) => (
              <div
                key={interaction.id}
                className="flex items-start space-x-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium truncate">
                        {interaction.customerName || interaction.customerPhone}
                      </p>
                      {interaction.isAI ? (
                        <Bot className="h-4 w-4 text-blue-500" />
                      ) : (
                        <User className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(interaction.status)}
                      {getConfidenceBadge(interaction.confidence)}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground truncate mb-2">
                    {interaction.lastMessage}
                  </p>
                  
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTimestamp(interaction.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}