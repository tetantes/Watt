import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Zap, TrendingUp, ArrowDownLeft, ArrowUpRight, Users, Bell, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDateTime, generateReferralLink } from '@/lib/utils'
import type { Transaction, UserPlan } from '@/types'

export default function DashboardPage() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activePlan, setActivePlan] = useState<UserPlan | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const [txRes, planRes, settingRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('user_plans').select('*, plan:plans(*)').eq('user_id', profile.id).eq('status', 'active').order('expires_at', { ascending: false }).limit(1),
        supabase.from('app_settings').select('value').eq('key', 'announcement').maybeSingle(),
      ])
      if (txRes.data) setTransactions(txRes.data)
      if (planRes.data?.[0]) setActivePlan(planRes.data[0])
      if (settingRes.data) setAnnouncement(settingRes.data.value)
      setLoading(false)
    }
    load()
    refreshProfile()
  }, [profile?.id])

  const copyReferral = () => {
    if (!profile) return
    navigator.clipboard.writeText(generateReferralLink(profile.referral_code))
    toast({ title: 'Copied!', description: 'Referral link copied to clipboard', variant: 'success' })
  }

  const txIcon = (type: string) => {
    if (type === 'deposit') return <ArrowDownLeft className="w-4 h-4 text-teal-400" />
    if (type === 'withdrawal') return <ArrowUpRight className="w-4 h-4 text-red-400" />
    if (type === 'commission') return <Users className="w-4 h-4 text-yellow-400" />
    return <TrendingUp className="w-4 h-4 text-cyan-400" />
  }

  const txColor = (type: string) => {
    if (type === 'deposit' || type === 'commission' || type === 'bonus') return 'text-teal-400'
    if (type === 'withdrawal' || type === 'plan_purchase') return 'text-red-400'
    return 'text-slate-400'
  }

  const txSign = (type: string) => ['deposit', 'commission', 'bonus'].includes(type) ? '+' : '-'

  return (
    <AppLayout>
      {/* Header */}
      <div className="px-4 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm">Welcome back,</p>
            <h1 className="font-display font-bold text-white text-xl">{profile?.full_name || 'User'}</h1>
          </div>
          <div className="w-10 h-10 gradient-teal rounded-xl flex items-center justify-center glow-teal">
            <Zap className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Announcement */}
      {announcement && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 rounded-xl px-3 py-2">
          <Bell className="w-4 h-4 text-teal-400 shrink-0" />
          <p className="text-xs text-teal-300 flex-1">{announcement}</p>
        </div>
      )}

      {/* Balance Card */}
      <div className="mx-4 mt-4">
        <div className="relative overflow-hidden rounded-2xl p-5" style={{
          background: 'linear-gradient(135deg, #0d2137 0%, #0a3d4a 50%, #0d3320 100%)',
          border: '1px solid rgba(13,148,136,0.3)',
          boxShadow: '0 0 40px rgba(13,148,136,0.15)'
        }}>
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'linear-gradient(rgba(13,148,136,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,0.5) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />
          <div className="relative">
            <p className="text-slate-400 text-xs font-display uppercase tracking-widest">Total Balance</p>
            <p className="font-display font-bold text-4xl text-white mt-1">
              {loading ? '---' : formatCurrency(profile?.balance || 0)}
            </p>
            <div className="flex gap-4 mt-4">
              <div>
                <p className="text-slate-500 text-xs">Deposited</p>
                <p className="text-teal-400 font-semibold text-sm">{formatCurrency(profile?.total_deposited || 0)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Withdrawn</p>
                <p className="text-red-400 font-semibold text-sm">{formatCurrency(profile?.total_withdrawn || 0)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Commission</p>
                <p className="text-yellow-400 font-semibold text-sm">{formatCurrency(profile?.total_commission || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <Button onClick={() => navigate('/wallet')} variant="secondary" className="flex-col h-16 gap-1">
          <ArrowDownLeft className="w-5 h-5 text-teal-400" />
          <span className="text-xs">Deposit</span>
        </Button>
        <Button onClick={() => navigate('/wallet')} variant="secondary" className="flex-col h-16 gap-1">
          <ArrowUpRight className="w-5 h-5 text-red-400" />
          <span className="text-xs">Withdraw</span>
        </Button>
      </div>

      {/* Active Plan */}
      <div className="mx-4 mt-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-display uppercase tracking-wider">Active Plan</p>
              {activePlan ? (
                <div className="mt-1">
                  <p className="font-display font-bold text-white">{(activePlan.plan as any)?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Expires {new Date(activePlan.expires_at).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-slate-400 text-sm mt-1">No active plan</p>
              )}
            </div>
            {activePlan ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Button size="sm" onClick={() => navigate('/plans')}>Get Plan</Button>
            )}
          </div>
        </Card>
      </div>

      {/* Referral */}
      <div className="mx-4 mt-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-500 text-xs font-display uppercase tracking-wider">Referral Link</p>
            <Badge variant="gold">3-Tier</Badge>
          </div>
          <div className="flex items-center gap-2 bg-brand-dark rounded-xl px-3 py-2 border border-brand-border">
            <p className="text-xs text-slate-400 flex-1 truncate font-mono">
              {profile ? generateReferralLink(profile.referral_code) : '...'}
            </p>
            <button onClick={copyReferral} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <Copy className="w-4 h-4 text-teal-400" />
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2">Earn commissions when your referrals purchase plans (5% / 3% / 1%)</p>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="mx-4 mt-4 mb-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-white text-sm">Recent Activity</h3>
          <button onClick={() => navigate('/wallet')} className="text-xs text-teal-400 flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <Card>
            <p className="text-center text-slate-600 text-sm py-4">No transactions yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <Card key={tx.id} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 bg-brand-dark rounded-xl flex items-center justify-center shrink-0">
                  {txIcon(tx.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold capitalize truncate">
                    {tx.description || tx.type.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-slate-600">{formatDateTime(tx.created_at)}</p>
                </div>
                <p className={`font-mono font-bold text-sm shrink-0 ${txColor(tx.type)}`}>
                  {txSign(tx.type)}{formatCurrency(tx.amount)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
