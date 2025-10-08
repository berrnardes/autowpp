'use client'

import { useState } from 'react'
import { Trash2, Edit, Download, X } from 'lucide-react'
import { useDeleteProduct, useUpdateProduct } from '@/hooks/use-products'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import type { Product } from '@/types/api'

interface BulkOperationsProps {
  selectedProducts: Product[]
  onSelectionChange: (products: Product[]) => void
  onClose: () => void
}

export function BulkOperations({ 
  selectedProducts, 
  onSelectionChange, 
  onClose 
}: BulkOperationsProps) {
  const [operation, setOperation] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [bulkUpdateData, setBulkUpdateData] = useState<{
    category?: string
    inStock?: boolean
  }>({})

  const deleteProduct = useDeleteProduct()
  const updateProduct = useUpdateProduct()

  const handleBulkDelete = async () => {
    setIsProcessing(true)
    try {
      for (const product of selectedProducts) {
        await deleteProduct.mutateAsync(product.id)
      }
      onSelectionChange([])
      onClose()
    } catch (error) {
      console.error('Erro ao excluir produtos:', error)
    } finally {
      setIsProcessing(false)
      setShowConfirmDialog(false)
    }
  }

  const handleBulkUpdate = async () => {
    if (!bulkUpdateData.category && bulkUpdateData.inStock === undefined) {
      return
    }

    setIsProcessing(true)
    try {
      for (const product of selectedProducts) {
        const updates: Partial<{ category: string; inStock: boolean }> = {}
        if (bulkUpdateData.category) {
          updates.category = bulkUpdateData.category
        }
        if (bulkUpdateData.inStock !== undefined) {
          updates.inStock = bulkUpdateData.inStock
        }

        await updateProduct.mutateAsync({
          id: product.id,
          updates,
        })
      }
      onSelectionChange([])
      onClose()
    } catch (error) {
      console.error('Erro ao atualizar produtos:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExportCSV = () => {
    const headers = ['ID', 'Nome', 'Descrição', 'Preço', 'Moeda', 'Categoria', 'Em Estoque', 'Criado em']
    const csvContent = [
      headers.join(','),
      ...selectedProducts.map(product => [
        product.id,
        `"${product.name}"`,
        `"${product.description || ''}"`,
        product.price,
        product.currency,
        `"${product.category || ''}"`,
        product.inStock ? 'Sim' : 'Não',
        new Date(product.createdAt).toLocaleDateString('pt-BR')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `produtos_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const executeOperation = () => {
    switch (operation) {
      case 'delete':
        setShowConfirmDialog(true)
        break
      case 'update':
        handleBulkUpdate()
        break
      case 'export':
        handleExportCSV()
        onClose()
        break
    }
  }

  const commonCategories = [
    'Eletrônicos',
    'Roupas',
    'Casa e Jardim',
    'Esportes',
    'Livros',
    'Beleza',
    'Alimentação',
    'Automóveis',
    'Outros',
  ]

  return (
    <>
      <Dialog open={selectedProducts.length > 0} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Operações em Lote ({selectedProducts.length} produto{selectedProducts.length !== 1 ? 's' : ''})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Selected Products Summary */}
            <div className="space-y-2">
              <h3 className="font-semibold">Produtos Selecionados:</h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{product.name}</span>
                    <Badge variant={product.inStock ? 'default' : 'secondary'} className="text-xs">
                      {product.inStock ? 'Em estoque' : 'Fora de estoque'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Operation Selection */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Selecione uma operação:</label>
                <Select value={operation} onValueChange={setOperation}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Escolha uma operação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update">
                      <div className="flex items-center">
                        <Edit className="h-4 w-4 mr-2" />
                        Atualizar produtos
                      </div>
                    </SelectItem>
                    <SelectItem value="export">
                      <div className="flex items-center">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar para CSV
                      </div>
                    </SelectItem>
                    <SelectItem value="delete">
                      <div className="flex items-center text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir produtos
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Update Options */}
              {operation === 'update' && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium">Opções de Atualização:</h4>
                  
                  <div>
                    <label className="text-sm font-medium">Alterar categoria:</label>
                    <Select 
                      value={bulkUpdateData.category || ''} 
                      onValueChange={(value) => setBulkUpdateData(prev => ({ 
                        ...prev, 
                        category: value || undefined 
                      }))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione uma categoria (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Não alterar</SelectItem>
                        {commonCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Alterar status do estoque:</label>
                    <Select 
                      value={bulkUpdateData.inStock?.toString() || ''} 
                      onValueChange={(value) => setBulkUpdateData(prev => ({ 
                        ...prev, 
                        inStock: value ? value === 'true' : undefined 
                      }))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione o status (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Não alterar</SelectItem>
                        <SelectItem value="true">Em estoque</SelectItem>
                        <SelectItem value="false">Fora de estoque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Delete Warning */}
              {operation === 'delete' && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center space-x-2 text-destructive">
                    <X className="h-4 w-4" />
                    <span className="font-medium">Atenção!</span>
                  </div>
                  <p className="text-sm text-destructive/80 mt-1">
                    Esta ação não pode ser desfeita. Todos os produtos selecionados serão permanentemente excluídos.
                  </p>
                </div>
              )}

              {/* Export Info */}
              {operation === 'export' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-700">
                    <Download className="h-4 w-4" />
                    <span className="font-medium">Exportar dados</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Os dados dos produtos selecionados serão exportados em formato CSV.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={executeOperation}
              disabled={!operation || isProcessing || (operation === 'update' && !bulkUpdateData.category && bulkUpdateData.inStock === undefined)}
              variant={operation === 'delete' ? 'destructive' : 'default'}
            >
              {isProcessing ? 'Processando...' : 'Executar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Delete */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p>
              Tem certeza que deseja excluir <strong>{selectedProducts.length}</strong> produto{selectedProducts.length !== 1 ? 's' : ''}?
            </p>
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={isProcessing}
            >
              {isProcessing ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}