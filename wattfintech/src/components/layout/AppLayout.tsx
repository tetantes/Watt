import { ReactNode } from 'react'
import { BottomNav } from './BottomNav'

interface AppLayoutProps {
  children: ReactNode
  title?: string
  showNav?: boolean
}

export function AppLayout({ children, showNav = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full pb-24 overflow-y-auto">
        {children}
      </div>
      {showNav && <BottomNav />}
    </div>
  )
}
