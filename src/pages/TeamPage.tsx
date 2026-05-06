import { useEffect, useState } from 'react'
import { Users, Copy, TrendingUp, Award } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDate, generateReferralLink } from '@/lib/utils'
import type { Profile, Commission } from '@/types'

export default function TeamPage() {
  const { profile } = useAuth()
  const [referrals, setReferrals] = useState<Profile[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [stats, setStats] = useState({ tier1: 0, tier2: 0, tier3: 0, total: 0 })

  useEffect(() => {
    if (!profile) return
    loadTeam()
  }, [profile?.id])

  const loadTeam = async () => {
    if (!profile) return
    const [refRes, commRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('referred_by', profile.id).order('created_at', { ascending: false }),
      supabase.from('commissions').select('*').eq('earner_id', profile.id).order('created_at', { ascending: false }),
    ])
    if (refRes.data) setReferrals(refRes.data)
    if (commRes.data) {
      setCommissions(commRes.data)
      const t1 = commRes.data.filter(c => c.tier === 1).reduce((s, c) => s + c.amount, 0)
      const t2 = commRes.data.filter(c => c.tier === 2).reduce((s, c) => s + c.amount, 0)
      const t3 = commRes.data.filter(c => c.tier === 3).reduce((s, c) => s + c.amount, 0)
      setStats({ tier1: t1, tier2: t2, tier3: t3, total: t1 + t2 + t3 })
    }
  }

  const copyLink = () => {
    if (!profile) return
    navigator.clipboard.writeText(generateReferralLink(profile.referral_code))
    toast({ title: 'Copied!', description: 'Referral link copied', variant: 'success' })
  }

  return (
    <AppLayout>
      <PageHeader title="My Team" subtitle="Referral program overview" />

      {/* Referral link */}
      <div className="mx-4">
        <Card>
          <p className="text-xs text-slate-500 font-display uppercase tracking-wider mb-2">Your Referral Code</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-brand-dark rounded-xl px-3 py-2 border border-brand-border">
              <p className="font-mono font-bold text-teal-400 text-lg tracking-widest">{profile?.referral_code}</p>
            </div>
            <button onClick={copyLink} className="w-10 h-10 flex items-center justify-center bg-teal-500/20 border border-teal-500/30 rounded-xl hover:bg-teal-500/30 transition-colors">
              <Copy className="w-4 h-4 text-teal-400" />
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2">Share your link and earn commissions when referrals purchase plans</p>
        </Card>
      </div>

      {/* Commission rates */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
        {[{ tier: 1, rate: '5%', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/30' },
          { tier: 2, rate: '3%', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
          { tier: 3, rate: '1%', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' }
        ].map(t => (
          <div key={t.tier} className={`rounded-xl border p-3 text-center ${t.bg}`}>
            <p className={`font-display font-bold text-lg ${t.color}`}>{t.rate}</p>
            <p className="text-slate-500 text-xs">Tier {t.tier}</p>
          </div>
        ))}
      </div>

      {/* Commission stats */}
      <div className="mx-4 mt-4">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-yellow-400" />
            <p className="font-display font-semibold text-white text-sm">Commission Earned</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-dark rounded-xl p-3">
              <p className="text-slate-500 text-xs">Total Earned</p>
              <p className="font-display font-bold text-yellow-400 text-lg">{formatCurrency(stats.total)}</p>
            </div>
            <div className="bg-brand-dark rounded-xl p-3">
              <p className="text-slate-500 text-xs">Direct (Tier 1)</p>
              <p className="font-display font-bold text-teal-400">{formatCurrency(stats.tier1)}</p>
            </div>
            <div className="bg-brand-dark rounded-xl p-3">
              <p className="text-slate-500 text-xs">Tier 2</p>
              <p className="font-display font-bold text-cyan-400">{formatCurrency(stats.tier2)}</p>
            </div>
            <div className="bg-brand-dark rounded-xl p-3">
              <p className="text-slate-500 text-xs">Tier 3</p>
              <p className="font-display font-bold text-slate-400">{formatCurrency(stats.tier3)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Direct referrals */}
      <div className="mx-4 mt-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-slate-400" />
          <h3 className="font-display font-semibold text-white text-sm">Direct Referrals ({referrals.length})</h3>
        </div>

        {referrals.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">No referrals yet</p>
              <p className="text-slate-700 text-xs mt-1">Share your link to start earning</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {referrals.map(r => (
              <Card key={r.id} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 gradient-teal rounded-full flex items-center justify-center text-white font-display font-bold text-sm shrink-0">
                  {(r.full_name || r.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{r.full_name || 'User'}</p>
                  <p className="text-xs text-slate-600">{formatDate(r.created_at)}</p>
                </div>
                <Badge variant={r.is_active ? 'success' : 'default'}>
                  {r.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </Card>
            ))}
          </div>
        )}

        {/* Recent commissions */}
        {commissions.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <h3 className="font-display font-semibold text-white text-sm">Recent Commissions</h3>
            </div>
            <div className="space-y-2">
              {commissions.slice(0, 10).map(c => (
                <Card key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-white font-semibold">Tier {c.tier} Commission</p>
                    <p className="text-xs text-slate-600">{formatDate(c.created_at)} · {(c.rate * 100).toFixed(0)}% rate</p>
                  </div>
                  <p className="text-teal-400 font-mono font-bold">+{formatCurrency(c.amount)}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
