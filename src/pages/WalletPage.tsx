import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Copy, Users, TrendingUp, Clock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDateTime, truncateAddress } from '@/lib/utils'
import type { Transaction, Deposit, Withdrawal } from '@/types'

type WalletTab = 'transactions' | 'deposits' | 'withdrawals'

export default function WalletPage() {
  const { profile, refreshProfile } = useAuth()
  const [tab, setTab] = useState<WalletTab>('transactions')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [depositAddress, setDepositAddress] = useState('')
  const [depositNetwork, setDepositNetwork] = useState('')
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositProof, setDepositProof] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawWallet, setWithdrawWallet] = useState('')
  const [withdrawNetwork, setWithdrawNetwork] = useState('USDT-TRC20')
  const [loading, setLoading] = useState(false)
  const [hasActivePlan, setHasActivePlan] = useState(false)

  useEffect(() => {
    if (!profile) return
    loadData()
  }, [profile?.id, tab])

  const loadData = async () => {
    if (!profile) return
    const [txRes, depRes, wdRes, planRes, settingsRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('deposits').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('withdrawals').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('user_plans').select('id').eq('user_id', profile.id).eq('status', 'active').maybeSingle(),
      supabase.from('app_settings').select('key, value').in('key', ['deposit_address', 'deposit_network']),
    ])
    if (txRes.data) setTransactions(txRes.data)
    if (depRes.data) setDeposits(depRes.data)
    if (wdRes.data) setWithdrawals(wdRes.data)
    setHasActivePlan(!!planRes.data)
    if (settingsRes.data) {
      settingsRes.data.forEach((s: any) => {
        if (s.key === 'deposit_address') setDepositAddress(s.value)
        if (s.key === 'deposit_network') setDepositNetwork(s.value)
      })
    }
  }

  const submitDeposit = async () => {
    if (!profile || !depositAmount) return
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount < 10) {
      toast({ title: 'Invalid amount', description: 'Minimum deposit is $10', variant: 'destructive' }); return
    }
    setLoading(true)
    const { error } = await supabase.from('deposits').insert({
      user_id: profile.id, amount, payment_method: 'crypto', payment_proof: depositProof || null,
    })
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Deposit submitted!', description: 'Awaiting admin approval', variant: 'success' })
      setShowDepositModal(false); setDepositAmount(''); setDepositProof('')
      loadData()
    }
    setLoading(false)
  }

  const submitWithdrawal = async () => {
    if (!profile) return
    if (!hasActivePlan) {
      toast({ title: 'No active plan', description: 'You need an active plan to withdraw', variant: 'destructive' }); return
    }
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount < 20) {
      toast({ title: 'Invalid amount', description: 'Minimum withdrawal is $20', variant: 'destructive' }); return
    }
    if (amount > profile.balance) {
      toast({ title: 'Insufficient balance', variant: 'destructive' }); return
    }
    if (!withdrawWallet) {
      toast({ title: 'Enter wallet address', variant: 'destructive' }); return
    }
    setLoading(true)
    const { error } = await supabase.from('withdrawals').insert({
      user_id: profile.id, amount, wallet_address: withdrawWallet, network: withdrawNetwork,
    })
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Withdrawal requested!', description: 'Awaiting admin approval', variant: 'success' })
      setShowWithdrawModal(false); setWithdrawAmount(''); setWithdrawWallet('')
      loadData(); refreshProfile()
    }
    setLoading(false)
  }

  const txIcon = (type: string) => {
    if (type === 'deposit') return <ArrowDownLeft className="w-4 h-4 text-teal-400" />
    if (type === 'withdrawal') return <ArrowUpRight className="w-4 h-4 text-red-400" />
    if (type === 'commission') return <Users className="w-4 h-4 text-yellow-400" />
    return <TrendingUp className="w-4 h-4 text-cyan-400" />
  }

  const statusBadge = (status: string) => {
    if (status === 'approved') return <Badge variant="success">Approved</Badge>
    if (status === 'rejected') return <Badge variant="danger">Rejected</Badge>
    if (status === 'processing') return <Badge variant="info">Processing</Badge>
    return <Badge variant="warning">Pending</Badge>
  }

  return (
    <AppLayout>
      <PageHeader title="Wallet" subtitle="Manage your funds" />

      {/* Balance */}
      <div className="mx-4">
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{
          background: 'linear-gradient(135deg, #0d2137, #0a3d4a)',
          border: '1px solid rgba(13,148,136,0.3)'
        }}>
          <p className="text-slate-400 text-xs font-display uppercase tracking-widest">Available Balance</p>
          <p className="font-display font-bold text-3xl text-white mt-1">{formatCurrency(profile?.balance || 0)}</p>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => setShowDepositModal(true)} size="sm" className="flex-1">
              <ArrowDownLeft className="w-4 h-4" /> Deposit
            </Button>
            <Button onClick={() => setShowWithdrawModal(true)} variant="secondary" size="sm" className="flex-1">
              <ArrowUpRight className="w-4 h-4" /> Withdraw
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-4 mt-4 flex gap-2 bg-brand-card border border-brand-border rounded-xl p-1">
        {(['transactions', 'deposits', 'withdrawals'] as WalletTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-xs font-display font-semibold transition-all capitalize ${tab === t ? 'gradient-teal text-white' : 'text-slate-500'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mx-4 mt-3 space-y-2 pb-4">
        {tab === 'transactions' && (
          transactions.length === 0 ? (
            <Card><p className="text-center text-slate-600 py-8">No transactions yet</p></Card>
          ) : transactions.map(tx => (
            <Card key={tx.id} className="flex items-center gap-3 py-3">
              <div className="w-9 h-9 bg-brand-dark rounded-xl flex items-center justify-center shrink-0">{txIcon(tx.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-semibold truncate">{tx.description || tx.type.replace('_', ' ')}</p>
                <p className="text-xs text-slate-600">{formatDateTime(tx.created_at)}</p>
              </div>
              <p className={`font-mono font-bold text-sm ${['deposit','commission','bonus'].includes(tx.type) ? 'text-teal-400' : 'text-red-400'}`}>
                {['deposit','commission','bonus'].includes(tx.type) ? '+' : '-'}{formatCurrency(tx.amount)}
              </p>
            </Card>
          ))
        )}

        {tab === 'deposits' && (
          deposits.length === 0 ? (
            <Card><p className="text-center text-slate-600 py-8">No deposits yet</p></Card>
          ) : deposits.map(d => (
            <Card key={d.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{formatCurrency(d.amount)}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDateTime(d.created_at)}</p>
                </div>
                {statusBadge(d.status)}
              </div>
              {d.admin_note && <p className="text-xs text-slate-500 mt-2 bg-brand-dark rounded-lg px-3 py-1.5">{d.admin_note}</p>}
            </Card>
          ))
        )}

        {tab === 'withdrawals' && (
          withdrawals.length === 0 ? (
            <Card><p className="text-center text-slate-600 py-8">No withdrawals yet</p></Card>
          ) : withdrawals.map(w => (
            <Card key={w.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{formatCurrency(w.amount)}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{truncateAddress(w.wallet_address)} · {w.network}</p>
                  <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDateTime(w.created_at)}</p>
                </div>
                {statusBadge(w.status)}
              </div>
              {w.admin_note && <p className="text-xs text-slate-500 mt-2 bg-brand-dark rounded-lg px-3 py-1.5">{w.admin_note}</p>}
            </Card>
          ))
        )}
      </div>

      {/* Deposit Modal */}
      <Modal open={showDepositModal} onClose={() => setShowDepositModal(false)} title="Make a Deposit">
        <div className="space-y-4">
          <div className="bg-brand-dark rounded-xl p-3 border border-brand-border">
            <p className="text-xs text-slate-500 mb-1">Send to this address ({depositNetwork})</p>
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono text-teal-400 flex-1 break-all">{depositAddress || 'Loading...'}</p>
              <button onClick={() => { navigator.clipboard.writeText(depositAddress); toast({ title: 'Copied!', variant: 'success' }) }} className="p-1.5 hover:bg-white/10 rounded-lg">
                <Copy className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
          <Input label="Amount (USD)" type="number" placeholder="Min. $10" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
          <Input label="Transaction Hash / Proof (optional)" placeholder="Paste tx hash" value={depositProof} onChange={e => setDepositProof(e.target.value)} />
          <p className="text-xs text-slate-600">After sending, submit this form. Admin will verify and credit your balance.</p>
          <Button onClick={submitDeposit} loading={loading} className="w-full">Submit Deposit Request</Button>
        </div>
      </Modal>

      {/* Withdrawal Modal */}
      <Modal open={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} title="Request Withdrawal">
        <div className="space-y-4">
          {!hasActivePlan && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-xs text-red-400">⚠️ You need an active plan to make withdrawals.</p>
            </div>
          )}
          <div className="bg-brand-dark rounded-xl p-3 border border-brand-border">
            <p className="text-xs text-slate-500">Available</p>
            <p className="font-display font-bold text-white text-lg">{formatCurrency(profile?.balance || 0)}</p>
          </div>
          <Input label="Amount (USD)" type="number" placeholder="Min. $20" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
          <Input label="Your Wallet Address" placeholder="Enter your wallet address" value={withdrawWallet} onChange={e => setWithdrawWallet(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Network</label>
            <select value={withdrawNetwork} onChange={e => setWithdrawNetwork(e.target.value)}
              className="bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500/70">
              <option value="USDT-TRC20">USDT (TRC20)</option>
              <option value="USDT-ERC20">USDT (ERC20)</option>
              <option value="BNB-BEP20">BNB (BEP20)</option>
              <option value="ETH">ETH (ERC20)</option>
            </select>
          </div>
          <p className="text-xs text-slate-600">Withdrawals are manually reviewed and processed within 24-48 hours.</p>
          <Button onClick={submitWithdrawal} loading={loading} className="w-full" disabled={!hasActivePlan}>Submit Withdrawal</Button>
        </div>
      </Modal>
    </AppLayout>
  )
}
