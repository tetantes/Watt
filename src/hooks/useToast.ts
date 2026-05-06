import { useState, useCallback } from 'react'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
}

let toastListeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

function notify(listeners: typeof toastListeners) {
  listeners.forEach(l => l([...toasts]))
}

export function toast(options: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  toasts = [...toasts, { ...options, id }]
  notify(toastListeners)
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    notify(toastListeners)
  }, 4000)
}

export function useToasts() {
  const [list, setList] = useState<Toast[]>([])
  const subscribe = useCallback(() => {
    toastListeners.push(setList)
    return () => { toastListeners = toastListeners.filter(l => l !== setList) }
  }, [])
  useState(subscribe)
  return list
}
