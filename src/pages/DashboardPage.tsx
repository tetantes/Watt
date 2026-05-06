import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Zap, TrendingUp, ArrowDownLeft, ArrowUpRight, Users, Bell, ChevronRight, Activity } from 'lucide-react'
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
  const [teamCount, setTeamCount] = useState(0)

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const [txRes, planRes, settingRes, teamRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('user_plans').select('*, plan:plans(*)').eq('user_id', profile.id).eq('status', 'active').order('expires_at', { ascending: false }).limit(1),
        supabase.from('app_settings').select('value').eq('key', 'announcement').maybeSingle(),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('referred_by', profile.id),
      ])
      if (txRes.data) setTransactions(txRes.data)
      if (planRes.data?.[0]) setActivePlan(planRes.data[0])
      if (settingRes.data) setAnnouncement(settingRes.data.value)
      if (teamRes.count !== null) setTeamCount(teamRes.count)
    }
    load()
    refreshProfile()
  }, [profile?.id])

  const copyReferral = () => {
    if (!profile) return
    navigator.clipboard.writeText(generateReferralLink(profile.referral_code))
    toast({ title: 'Copied!', description: 'Referral link copied', variant: 'success' })
  }

  const txIcon = (type: string) => {
    if (type === 'deposit') return <ArrowDownLeft className="w-4 h-4 text-teal-400" />
    if (type === 'withdrawal') return <ArrowUpRight className="w-4 h-4 text-red-400" />
    if (type === 'commission') return <Users className="w-4 h-4 text-yellow-400" />
    return <TrendingUp className="w-4 h-4 text-cyan-400" />
  }
  const txLabel: Record<string, string> = { deposit: 'Top Up', withdrawal: 'Withdrawal', commission: 'Team Commission', plan_purchase: 'Investment', bonus: 'Bonus', adjustment: 'Adjustment' }

  const activePlanData = activePlan?.plan as any
  const dailyRates: Record<string, number> = { 'Starter': 1.0, 'Growth': 1.5, 'Pro': 2.0, 'Elite': 2.5 }
  const dailyIncome = activePlanData ? (activePlan!.amount_paid * (dailyRates[activePlanData.name] || 1) / 100) : 0

  return (
    <AppLayout>
      {/* Header */}
      <div className="px-4 pt-12 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 gradient-teal rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-slate-500 text-xs">Welcome back</p>
                <h1 className="font-display font-bold text-white text-base leading-tight">{profile?.full_name || 'Investor'}</h1>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-xs">Today's Income</p>
            <p className="text-teal-400 font-display font-bold text-sm">{activePlan ? `${formatCurrency(dailyIncome)} USDT` : '0 USDT'}</p>
          </div>
        </div>
      </div>

      {/* Announcement */}
      {announcement && (
        <div className="mx-4 mb-3 flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 rounded-xl px-3 py-2">
          <Bell className="w-4 h-4 text-teal-400 shrink-0" />
          <p className="text-xs text-teal-300">{announcement}</p>
        </div>
      )}

      {/* Main balance card */}
      <div className="mx-4">
        <div className="relative overflow-hidden rounded-2xl p-5" style={{
          background: 'linear-gradient(135deg, #0d2137 0%, #0a3d4a 50%, #0d3320 100%)',
          border: '1px solid rgba(13,148,136,0.3)',
          boxShadow: '0 0 40px rgba(13,148,136,0.15)'
        }}>
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'linear-gradient(rgba(13,148,136,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,0.5) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />
          <div className="relative">
            <p className="text-slate-400 text-xs font-display uppercase tracking-widest">USDT Total Assets</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="font-display font-bold text-4xl text-white">{(profile?.balance || 0).toFixed(4)}</p>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">≈ {formatCurrency(profile?.balance || 0)}</p>

            <div className="flex gap-3 mt-4">
              <Button onClick={() => navigate('/wallet')} size="sm" className="flex-1">
                <ArrowDownLeft className="w-4 h-4" /> Top Up
              </Button>
              <Button onClick={() => navigate('/wallet')} variant="secondary" size="sm" className="flex-1">
                <ArrowUpRight className="w-4 h-4" /> Withdraw
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
        <button onClick={() => navigate('/plans')} className="card-dark p-3 text-center hover:border-teal-500/40 transition-all">
          <TrendingUp className="w-4 h-4 text-teal-400 mx-auto mb-1" />
          <p className="text-teal-400 font-bold text-xs">{formatCurrency(dailyIncome)}</p>
          <p className="text-slate-600 text-[10px]">Daily Income</p>
        </button>
        <button onClick={() => navigate('/team')} className="card-dark p-3 text-center hover:border-yellow-500/40 transition-all">
          <Users className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
          <p className="text-yellow-400 font-bold text-xs">{teamCount}</p>
          <p className="text-slate-600 text-[10px]">Team Members</p>
        </button>
        <button onClick={() => navigate('/team')} className="card-dark p-3 text-center hover:border-cyan-500/40 transition-all">
          <Activity className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <p className="text-cyan-400 font-bold text-xs">{formatCurrency(profile?.total_commission || 0)}</p>
          <p className="text-slate-600 text-[10px]">Commission</p>
        </button>
      </div>

      {/* Active investment */}
      <div className="mx-4 mt-3">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-display uppercase tracking-wider">Mining Package</p>
              {activePlan ? (
                <div className="mt-1">
                  <p className="font-display font-bold text-white">{activePlanData?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daily: <span className="text-teal-400">{dailyRates[activePlanData?.name] || 1}% · {formatCurrency(dailyIncome)} USDT</span>
                  </p>
                  <p className="text-xs text-slate-600">Expires {new Date(activePlan.expires_at).toLocaleDateString()}</p>
                </div>
              ) : (
                <p className="text-slate-400 text-sm mt-1">No active investment</p>
              )}
            </div>
            {activePlan ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Button size="sm" onClick={() => navigate('/plans')}>Invest Now</Button>
            )}
          </div>
        </Card>
      </div>

      {/* Referral */}
      <div className="mx-4 mt-3">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-xs font-display uppercase tracking-wider">Referral Program</p>
            <Badge variant="gold">5% / 3% / 1%</Badge>
          </div>
          <div className="flex items-center gap-2 bg-brand-dark rounded-xl px-3 py-2 border border-brand-border">
            <p className="text-xs text-slate-400 flex-1 truncate font-mono">
              {profile ? generateReferralLink(profile.referral_code) : '...'}
            </p>
            <button onClick={copyReferral} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <Copy className="w-4 h-4 text-teal-400" />
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2">Invite friends · Earn team commissions when they invest</p>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="mx-4 mt-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-semibold text-white text-sm">Recent Activity</h3>
          <button onClick={() => navigate('/wallet')} className="text-xs text-teal-400 flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {transactions.length === 0 ? (
          <Card><p className="text-center text-slate-600 text-sm py-4">No activity yet</p></Card>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <Card key={tx.id} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 bg-brand-dark rounded-xl flex items-center justify-center shrink-0">{txIcon(tx.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{tx.description || txLabel[tx.type] || tx.type}</p>
                  <p className="text-xs text-slate-600">{formatDateTime(tx.created_at)}</p>
                </div>
                <p className={`font-mono font-bold text-sm shrink-0 ${['deposit','commission','bonus'].includes(tx.type) ? 'text-teal-400' : 'text-red-400'}`}>
                  {['deposit','commission','bonus'].includes(tx.type) ? '+' : '-'}{tx.amount.toFixed(4)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
