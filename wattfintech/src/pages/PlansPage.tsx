import { useEffect, useState } from 'react'
import { CheckCircle, Zap, Star, Crown, Rocket } from 'lucide-react'
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
const planColors = ['teal', 'cyan', 'gold', 'teal']

export default function PlansPage() {
  const { profile, refreshProfile } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [activePlan, setActivePlan] = useState<UserPlan | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPlans()
  }, [profile?.id])

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
      toast({ title: 'Insufficient balance', description: `You need ${formatCurrency(selectedPlan.price)}. Please deposit first.`, variant: 'destructive' })
      return
    }
    setLoading(true)
    const { error } = await supabase.rpc('purchase_plan', { plan_id_input: selectedPlan.id })
    if (error) {
      toast({ title: 'Purchase failed', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Plan activated!', description: `${selectedPlan.name} plan is now active`, variant: 'success' })
      setSelectedPlan(null)
      loadPlans()
      refreshProfile()
    }
    setLoading(false)
  }

  return (
    <AppLayout>
      <PageHeader title="Subscription Plans" subtitle="Unlock platform features" />

      {/* Active plan banner */}
      {activePlan && (
        <div className="mx-4 mb-4 bg-teal-500/10 border border-teal-500/30 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
          <div>
            <p className="text-sm text-teal-300 font-semibold">Active: {(activePlan.plan as any)?.name}</p>
            <p className="text-xs text-slate-500">Expires {new Date(activePlan.expires_at).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="mx-4 space-y-3 pb-4">
        {plans.map((plan, i) => {
          const Icon = planIcons[i % planIcons.length]
          const isGold = i === 2
          const isCurrent = activePlan && (activePlan.plan as any)?.id === plan.id
          const features = Array.isArray(plan.features) ? plan.features : []

          return (
            <div key={plan.id} className={`relative rounded-2xl overflow-hidden transition-all ${isCurrent ? 'ring-2 ring-teal-500' : ''}`}
              style={{
                background: isGold
                  ? 'linear-gradient(135deg, #1a1200, #2a1f00)'
                  : 'linear-gradient(135deg, #0a1929, #0d2137)',
                border: isGold ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(26,58,92,0.8)'
              }}>

              {i === 1 && (
                <div className="absolute top-3 right-3">
                  <Badge variant="success">Popular</Badge>
                </div>
              )}
              {isGold && (
                <div className="absolute top-3 right-3">
                  <Badge variant="gold">Best Value</Badge>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isGold ? 'gradient-gold' : 'gradient-teal'}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-lg">{plan.name}</h3>
                    <p className="text-slate-500 text-xs">{plan.duration_days} days access</p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className={`font-display font-bold text-3xl ${isGold ? 'text-gradient-gold' : 'text-gradient-teal'}`}>
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-slate-500 text-sm"> / {plan.duration_days}d</span>
                </div>

                <div className="space-y-2 mb-4">
                  {features.map((f: string, fi: number) => (
                    <div key={fi} className="flex items-center gap-2">
                      <CheckCircle className={`w-4 h-4 shrink-0 ${isGold ? 'text-yellow-400' : 'text-teal-400'}`} />
                      <p className="text-sm text-slate-300">{f}</p>
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <Button variant="secondary" className="w-full" disabled>Current Plan</Button>
                ) : (
                  <Button
                    onClick={() => setSelectedPlan(plan)}
                    variant={isGold ? 'gold' : 'primary'}
                    className="w-full"
                  >
                    Get {plan.name}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirm purchase modal */}
      <Modal open={!!selectedPlan} onClose={() => setSelectedPlan(null)} title="Confirm Purchase">
        {selectedPlan && (
          <div className="space-y-4">
            <div className="bg-brand-dark rounded-xl p-4 border border-brand-border">
              <div className="flex justify-between items-center mb-2">
                <p className="text-slate-400 text-sm">Plan</p>
                <p className="text-white font-semibold">{selectedPlan.name}</p>
              </div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-slate-400 text-sm">Duration</p>
                <p className="text-white font-semibold">{selectedPlan.duration_days} days</p>
              </div>
              <div className="flex justify-between items-center border-t border-brand-border pt-2">
                <p className="text-slate-400 text-sm">Cost</p>
                <p className="text-teal-400 font-display font-bold text-lg">{formatCurrency(selectedPlan.price)}</p>
              </div>
            </div>
            <div className="flex justify-between">
              <p className="text-slate-500 text-sm">Your Balance</p>
              <p className={`font-semibold ${(profile?.balance || 0) >= selectedPlan.price ? 'text-teal-400' : 'text-red-400'}`}>
                {formatCurrency(profile?.balance || 0)}
              </p>
            </div>
            {(profile?.balance || 0) < selectedPlan.price && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                Insufficient balance. Please deposit {formatCurrency(selectedPlan.price - (profile?.balance || 0))} more.
              </p>
            )}
            <Button onClick={purchasePlan} loading={loading} className="w-full" disabled={(profile?.balance || 0) < selectedPlan.price}>
              Confirm Purchase
            </Button>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
