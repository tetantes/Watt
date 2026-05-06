import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Wallet, TrendingUp, Users, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'wallet', label: 'Wallet', icon: Wallet, path: '/wallet' },
  { id: 'plans', label: 'Plans', icon: TrendingUp, path: '/plans' },
  { id: 'team', label: 'Team', icon: Users, path: '/team' },
  { id: 'account', label: 'Account', icon: UserCircle, path: '/account' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto">
      <div className="glass border-t border-brand-border px-2 pb-safe">
        <div className="flex items-center justify-around">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = location.pathname === tab.path
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex flex-col items-center gap-1 py-3 px-4 rounded-xl transition-all duration-200 min-w-0',
                  active ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'
                )}
              >
                <div className={cn(
                  'relative flex items-center justify-center w-6 h-6',
                  active && 'after:absolute after:inset-0 after:bg-teal-400/20 after:rounded-full after:scale-150 after:blur-sm'
                )}>
                  <Icon className={cn('w-5 h-5 relative z-10', active && 'drop-shadow-[0_0_6px_rgba(13,148,136,0.8)]')} />
                </div>
                <span className={cn('text-[10px] font-semibold font-display', active && 'text-teal-400')}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
