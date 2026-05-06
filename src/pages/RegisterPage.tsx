import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, User, Gift, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/hooks/useToast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'At least 6 characters required', variant: 'destructive' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          referral_code: referralCode.toUpperCase() || null,
        },
      },
    })
    if (error) {
      toast({ title: 'Registration failed', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Account created!', description: 'Welcome to WATT Finance', variant: 'success' })
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-6 py-12">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 gradient-teal rounded-2xl flex items-center justify-center mb-4 glow-teal">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white">WATT Finance</h1>
          <p className="text-slate-500 text-sm mt-1">Create your account</p>
        </div>

        <div className="card-dark p-6 space-y-4">
          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              icon={<User className="w-4 h-4" />}
              required
            />
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
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
            />
            <Input
              label="Referral Code (Optional)"
              type="text"
              placeholder="Enter referral code"
              value={referralCode}
              onChange={e => setReferralCode(e.target.value)}
              icon={<Gift className="w-4 h-4" />}
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create Account
            </Button>
          </form>

          <p className="text-xs text-slate-600 text-center">
            By registering, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-400 font-semibold hover:text-teal-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
