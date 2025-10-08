'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  useConversationExamples, 
  useCreateConversationExample, 
  useUpdateConversationExample, 
  useDeleteConversationExample 
} from '@/hooks/use-ai-training'
import { ConversationExample } from '@/types/api'
import { Plus, Edit, Trash2, MessageSquare, Bot } from 'lucide-react'
import { toast } from 'sonner'

export function ConversationExamplesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExample, setEditingExample] = useState<ConversationExample | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const { data: examples, isLoading } = useConversationExamples()
  const createMutation = useCreateConversationExample()
  const updateMutation = useUpdateConversationExample()
  const deleteMutation = useDeleteConversationExample()

  const filteredExamples = examples?.filter(example =>
    example.customerMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
    example.desiredResponse.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (example.category && example.category.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  const handleSubmit = async (formData: FormData) => {
    const customerMessage = formData.get('customerMessage') as string
    const desiredResponse = formData.get('desiredResponse') as string
    const category = formData.get('category') as string

    if (!customerMessage.trim() || !desiredResponse.trim()) {
      toast.error('Mensagem do cliente e resposta desejada são obrigatórias')
      return
    }

    try {
      if (editingExample) {
        await updateMutation.mutateAsync({
          id: editingExample.id,
          updates: {
            customerMessage: customerMessage.trim(),
            desiredResponse: desiredResponse.trim(),
            category: category.trim() || undefined
          }
        })
      } else {
        await createMutation.mutateAsync({
          customerMessage: customerMessage.trim(),
          desiredResponse: desiredResponse.trim(),
          category: category.trim() || undefined
        })
      }
      
      setIsDialogOpen(false)
      setEditingExample(null)
    } catch {
      // Error handling is done in the mutation hooks
    }
  }

  const handleEdit = (example: ConversationExample) => {
    setEditingExample(example)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este exemplo?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch {
        // Error handling is done in the mutation hook
      }
    }
  }

  const openCreateDialog = () => {
    setEditingExample(null)
    setIsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1">
          <Input
            placeholder="Buscar exemplos por mensagem, resposta ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Exemplo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form action={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingExample ? 'Editar Exemplo' : 'Novo Exemplo de Conversa'}
                </DialogTitle>
                <DialogDescription>
                  Adicione um exemplo de como a IA deve responder a mensagens específicas dos clientes.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="customerMessage">Mensagem do Cliente</Label>
                  <Textarea
                    id="customerMessage"
                    name="customerMessage"
                    placeholder="Ex: Olá, gostaria de saber sobre seus produtos..."
                    defaultValue={editingExample?.customerMessage || ''}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="desiredResponse">Resposta Desejada da IA</Label>
                  <Textarea
                    id="desiredResponse"
                    name="desiredResponse"
                    placeholder="Ex: Olá! Ficamos felizes com seu interesse. Temos uma variedade de produtos..."
                    defaultValue={editingExample?.desiredResponse || ''}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria (Opcional)</Label>
                  <Input
                    id="category"
                    name="category"
                    placeholder="Ex: Saudação, Produtos, Suporte..."
                    defaultValue={editingExample?.category || ''}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingExample ? 'Atualizar' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Examples list */}
      <div className="space-y-4">
        {filteredExamples.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhum exemplo encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {examples?.length === 0 
                  ? 'Comece adicionando exemplos de conversas para treinar sua IA.'
                  : 'Nenhum exemplo corresponde à sua busca.'
                }
              </p>
              {examples?.length === 0 && (
                <Button onClick={openCreateDialog} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Primeiro Exemplo
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredExamples.map((example) => (
            <Card key={example.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Category badge */}
                  {example.category && (
                    <div>
                      <Badge variant="outline">{example.category}</Badge>
                    </div>
                  )}
                  
                  {/* Customer message */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      Mensagem do Cliente
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm">{example.customerMessage}</p>
                    </div>
                  </div>
                  
                  {/* AI response */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Bot className="h-4 w-4" />
                      Resposta Desejada da IA
                    </div>
                    <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
                      <p className="text-sm">{example.desiredResponse}</p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex justify-between items-center pt-2">
                    <p className="text-xs text-muted-foreground">
                      Criado em {new Date(example.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(example)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(example.id)}
                        disabled={deleteMutation.isPending}
                        className="flex items-center gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Summary */}
      {examples && examples.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          {filteredExamples.length} de {examples.length} exemplos
          {searchTerm && ` encontrados para "${searchTerm}"`}
        </div>
      )}
    </div>
  )
}