import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  back?: boolean
  right?: ReactNode
}

export function PageHeader({ title, subtitle, back, right }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center gap-3 px-4 pt-12 pb-4">
      {back && (
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="font-display font-bold text-white text-xl truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}
