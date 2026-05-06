import { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative glass rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto animate-slide-up',
        className
      )}>
        <div className="flex items-center justify-between p-4 border-b border-brand-border">
          {title && <h3 className="font-display font-bold text-white text-lg">{title}</h3>}
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
