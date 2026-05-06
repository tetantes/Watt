import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/hooks/useToast'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' })
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-6 py-12">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 gradient-teal rounded-2xl flex items-center justify-center mb-4 glow-teal animate-pulse-glow">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white">WATT Finance</h1>
          <p className="text-slate-500 text-sm mt-1">Digital Asset Platform</p>
        </div>

        {/* Form */}
        <div className="card-dark p-6 space-y-4">
          <div>
            <h2 className="font-display font-bold text-xl text-white">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-teal-400 font-semibold hover:text-teal-300">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
