'use client'

import { Sidebar } from "./sidebar"
import { Toaster } from "sonner"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto lg:ml-0">
          {children}
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  )
}