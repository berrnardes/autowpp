'use client'

import { AITrainingManagement } from '@/components/ai-training/ai-training-management'

export default function AITrainingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Treinamento da IA</h1>
        <p className="text-muted-foreground mt-2">
          Configure o comportamento da IA e gerencie exemplos de conversas para melhorar as respostas automáticas.
        </p>
      </div>
      
      <AITrainingManagement />
    </div>
  )
}