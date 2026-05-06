import { useToasts } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export function Toaster() {
  const toasts = useToasts()

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto glass rounded-xl p-4 flex items-start gap-3 animate-slide-up shadow-xl',
            t.variant === 'destructive' && 'border-red-500/50 bg-red-950/40',
            t.variant === 'success' && 'border-teal-500/50 bg-teal-950/40',
          )}
        >
          {t.variant === 'success' && <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />}
          {t.variant === 'destructive' && <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />}
          {(!t.variant || t.variant === 'default') && <Info className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white font-display">{t.title}</p>
            {t.description && <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
