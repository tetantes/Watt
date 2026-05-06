import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-display',
        {
          'bg-slate-800 text-slate-300': variant === 'default',
          'bg-teal-500/20 text-teal-400 border border-teal-500/30': variant === 'success',
          'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30': variant === 'warning',
          'bg-red-500/20 text-red-400 border border-red-500/30': variant === 'danger',
          'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30': variant === 'info',
          'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30': variant === 'gold',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
