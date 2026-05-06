import { useEffect, useState } from 'react'
import { CheckCircle, TrendingUp, Zap, Star, Crown, Rocket, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/hooks/useToast'
import { formatCurrency } from '@/lib/utils'
import type { Plan, UserPlan } from '@/types'

const planIcons = [Zap, Star, Crown, Rocket]
const dailyRates = [1.0, 1.5, 2.0, 2.5] // % daily income rates
const maxReturns = [240, 240, 240, 240] // % max return

export default function PlansPage() {
  const { profile, refreshProfile } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [activePlan, setActivePlan] = useState<UserPlan | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadPlans() }, [profile?.id])

  const loadPlans = async () => {
    if (!profile) return
    const [plansRes, activePlanRes] = await Promise.all([
      supabase.from('plans').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('user_plans').select('*, plan:plans(*)').eq('user_id', profile.id).eq('status', 'active').order('expires_at', { ascending: false }).limit(1),
    ])
    if (plansRes.data) setPlans(plansRes.data)
    if (activePlanRes.data?.[0]) setActivePlan(activePlanRes.data[0])
  }

  const purchasePlan = async () => {
    if (!selectedPlan || !profile) return
    if (profile.balance < selectedPlan.price) {
      toast({ title: 'Insufficient balance', description: `Please top up at least ${formatCurrency(selectedPlan.price - profile.balance)} more`, variant: 'destructive' }); return
    }
    setLoading(true)
    const { error } = await supabase.rpc('purchase_plan', { plan_id_input: selectedPlan.id })
    if (error) { toast({ title: 'Purchase failed', description: error.message, variant: 'destructive' }) }
    else {
      toast({ title: '🎉 Investment activated!', description: `${selectedPlan.name} is now running`, variant: 'success' })
      setSelectedPlan(null); loadPlans(); refreshProfile()
    }
    setLoading(false)
  }

  const getDailyIncome = (plan: Plan, i: number) => {
    return (plan.price * dailyRates[i] / 100)
  }

  return (
    <AppLayout>
      <PageHeader title="Investment Plans" subtitle="Hashrate Mining Packages" />

      {/* Active plan banner */}
      {activePlan && (
        <div className="mx-4 mb-4 rounded-xl p-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.2), rgba(6,182,212,0.1))', border: '1px solid rgba(13,148,136,0.4)' }}>
          <div className="w-10 h-10 gradient-teal rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-teal-300 font-semibold font-display">Active: {(activePlan.plan as any)?.name}</p>
            <p className="text-xs text-slate-500">Expires {new Date(activePlan.expires_at).toLocaleDateString()}</p>
          </div>
          <Badge variant="success">Running</Badge>
        </div>
      )}

      {/* Info banner */}
      <div className="mx-4 mb-4 bg-brand-card border border-brand-border rounded-xl p-3">
        <p className="text-xs text-slate-400 text-center">
          🤖 AI Quantitative Trading · Hashrate Mining · Team Commission
        </p>
        <p className="text-xs text-slate-600 text-center mt-1">
          Purchase a plan to unlock daily rewards and team commissions
        </p>
      </div>

      {/* Plans */}
      <div className="mx-4 space-y-4 pb-4">
        {plans.map((plan, i) => {
          const Icon = planIcons[i % planIcons.length]
          const isGold = i === 2 || i === 3
          const isCurrent = activePlan && (activePlan.plan as any)?.id === plan.id
          const features = Array.isArray(plan.features) ? plan.features : []
          const dailyIncome = getDailyIncome(plan, i)

          return (
            <div key={plan.id} className={`relative rounded-2xl overflow-hidden ${isCurrent ? 'ring-2 ring-teal-500' : ''}`}
              style={{
                background: isGold ? 'linear-gradient(135deg, #1a1200, #2a1f00)' : 'linear-gradient(135deg, #0a1929, #0d2137)',
                border: isGold ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(26,58,92,0.8)'
              }}>

              {i === 1 && <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-display font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>}
              {i === 3 && <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-display font-bold px-3 py-1 rounded-bl-xl">BEST VALUE</div>}

              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isGold ? 'gradient-gold' : 'gradient-teal'}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-lg">{plan.name}</h3>
                    <p className="text-slate-500 text-xs">Mining Package · {plan.duration_days} days</p>
                  </div>
                </div>

                {/* Key stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-black/20 rounded-xl p-2 text-center">
                    <p className={`font-display font-bold text-sm ${isGold ? 'text-yellow-400' : 'text-teal-400'}`}>
                      {dailyRates[i]}%
                    </p>
                    <p className="text-slate-600 text-[10px]">Daily Rate</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-2 text-center">
                    <p className={`font-display font-bold text-sm ${isGold ? 'text-yellow-400' : 'text-teal-400'}`}>
                      {formatCurrency(dailyIncome)}
                    </p>
                    <p className="text-slate-600 text-[10px]">Daily Income</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-2 text-center">
                    <p className={`font-display font-bold text-sm ${isGold ? 'text-yellow-400' : 'text-teal-400'}`}>
                      {maxReturns[i]}%
                    </p>
                    <p className="text-slate-600 text-[10px]">Max Return</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-slate-500 text-xs">Investment Amount</p>
                    <span className={`font-display font-bold text-2xl ${isGold ? 'text-gradient-gold' : 'text-gradient-teal'}`}>
                      {formatCurrency(plan.price)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-xs">Daily Withdrawal</p>
                    <p className={`font-semibold text-sm ${isGold ? 'text-yellow-400' : 'text-teal-400'}`}>{formatCurrency(dailyIncome)} USDT</p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  {features.map((f: string, fi: number) => (
                    <div key={fi} className="flex items-center gap-2">
                      <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${isGold ? 'text-yellow-400' : 'text-teal-400'}`} />
                      <p className="text-xs text-slate-300">{f}</p>
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <Button variant="secondary" className="w-full" disabled>
                    <CheckCircle className="w-4 h-4 text-teal-400" /> Currently Active
                  </Button>
                ) : (profile?.balance || 0) < plan.price ? (
                  <Button variant="secondary" className="w-full opacity-60" onClick={() => setSelectedPlan(plan)}>
                    <Lock className="w-4 h-4" /> Top Up to Invest
                  </Button>
                ) : (
                  <Button onClick={() => setSelectedPlan(plan)} variant={isGold ? 'gold' : 'primary'} className="w-full">
                    Invest Now
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirm modal */}
      <Modal open={!!selectedPlan} onClose={() => setSelectedPlan(null)} title="Confirm Investment">
        {selectedPlan && (() => {
          const i = plans.findIndex(p => p.id === selectedPlan.id)
          const daily = getDailyIncome(selectedPlan, i)
          return (
            <div className="space-y-4">
              <div className="bg-brand-dark rounded-xl p-4 border border-brand-border space-y-3">
                <div className="flex justify-between"><p className="text-slate-400 text-sm">Plan</p><p className="text-white font-semibold">{selectedPlan.name}</p></div>
                <div className="flex justify-between"><p className="text-slate-400 text-sm">Duration</p><p className="text-white font-semibold">{selectedPlan.duration_days} days</p></div>
                <div className="flex justify-between"><p className="text-slate-400 text-sm">Daily Rate</p><p className="text-teal-400 font-semibold">{dailyRates[i]}%</p></div>
                <div className="flex justify-between"><p className="text-slate-400 text-sm">Daily Income</p><p className="text-teal-400 font-semibold">{formatCurrency(daily)} USDT</p></div>
                <div className="flex justify-between border-t border-brand-border pt-3"><p className="text-slate-400 text-sm">Investment</p><p className="text-gradient-teal font-display font-bold text-lg">{formatCurrency(selectedPlan.price)}</p></div>
              </div>
              <div className="flex justify-between">
                <p className="text-slate-500 text-sm">Your Balance</p>
                <p className={`font-semibold ${(profile?.balance || 0) >= selectedPlan.price ? 'text-teal-400' : 'text-red-400'}`}>{formatCurrency(profile?.balance || 0)}</p>
              </div>
              {(profile?.balance || 0) < selectedPlan.price && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  Insufficient balance. Top up {formatCurrency(selectedPlan.price - (profile?.balance || 0))} more to invest.
                </p>
              )}
              <Button onClick={purchasePlan} loading={loading} className="w-full" size="lg" disabled={(profile?.balance || 0) < selectedPlan.price}>
                Confirm Investment
              </Button>
            </div>
          )
        })()}
      </Modal>
    </AppLayout>
  )
}
