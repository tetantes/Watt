import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-semibold font-display rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95',
          {
            'gradient-teal text-white shadow-lg hover:opacity-90 glow-teal': variant === 'primary',
            'bg-brand-card border border-brand-border text-slate-300 hover:border-teal-500/50 hover:text-white': variant === 'secondary',
            'hover:bg-white/5 text-slate-400 hover:text-white': variant === 'ghost',
            'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30': variant === 'danger',
            'gradient-gold text-black shadow-lg hover:opacity-90 glow-gold': variant === 'gold',
            'border border-teal-500/50 text-teal-400 hover:bg-teal-500/10': variant === 'outline',
          },
          {
            'text-xs px-3 py-1.5 gap-1.5': size === 'sm',
            'text-sm px-4 py-2.5 gap-2': size === 'md',
            'text-base px-6 py-3 gap-2': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading...
          </span>
        ) : children}
      </button>
    )
  }
)
Button.displayName = 'Button'
