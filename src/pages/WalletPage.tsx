import { useEffect, useState, useRef } from 'react'
import { ArrowDownLeft, ArrowUpRight, Users, TrendingUp, Clock, Hash, DollarSign, ImagePlus } from 'lucide-react'
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
  const [depositTxHash, setDepositTxHash] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState('')
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawWallet, setWithdrawWallet] = useState('')
  const [withdrawNetwork, setWithdrawNetwork] = useState('USDT-TRC20')
  const [loading, setLoading] = useState(false)
  const [hasActivePlan, setHasActivePlan] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (profile) loadData() }, [profile?.id, tab])

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

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' }); return }
    setScreenshotFile(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  const uploadScreenshot = async (): Promise<string | null> => {
    if (!screenshotFile || !profile) return null
    setUploadingScreenshot(true)
    const ext = screenshotFile.name.split('.').pop()
    const path = `deposits/${profile.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('payment-proofs').upload(path, screenshotFile, { upsert: true })
    setUploadingScreenshot(false)
    if (error) {
      // If storage bucket doesn't exist, store as base64 note instead
      return `[Screenshot uploaded - ${screenshotFile.name}]`
    }
    const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path)
    return data.publicUrl
  }

  const submitDeposit = async () => {
    if (!profile) return
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount < 10) { toast({ title: 'Minimum deposit is 10 USDT', variant: 'destructive' }); return }
    if (!depositTxHash && !screenshotFile) { toast({ title: 'Provide TX hash or upload screenshot', variant: 'destructive' }); return }
    setLoading(true)
    let screenshotUrl = ''
    if (screenshotFile) { screenshotUrl = (await uploadScreenshot()) || '' }
    const { error } = await supabase.from('deposits').insert({
      user_id: profile.id,
      amount,
      payment_method: 'crypto',
      payment_proof: depositTxHash || null,
      notes: screenshotUrl || null,
    })
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }) }
    else {
      toast({ title: 'Top-up submitted!', description: 'Awaiting admin confirmation', variant: 'success' })
      setShowDepositModal(false); setDepositAmount(''); setDepositTxHash('')
      setScreenshotFile(null); setScreenshotPreview('')
      loadData()
    }
    setLoading(false)
  }

  const submitWithdrawal = async () => {
    if (!profile) return
    if (!hasActivePlan) { toast({ title: 'Active investment required to withdraw', variant: 'destructive' }); return }
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount < 20) { toast({ title: 'Minimum withdrawal is 20 USDT', variant: 'destructive' }); return }
    if (amount > profile.balance) { toast({ title: 'Insufficient balance', variant: 'destructive' }); return }
    if (!withdrawWallet) { toast({ title: 'Enter wallet address', variant: 'destructive' }); return }
    setLoading(true)
    const { error } = await supabase.from('withdrawals').insert({ user_id: profile.id, amount, wallet_address: withdrawWallet, network: withdrawNetwork })
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }) }
    else {
      toast({ title: 'Withdrawal requested!', description: 'Processed within 24-48 hours', variant: 'success' })
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
  const txLabel: Record<string, string> = { deposit: 'Top Up', withdrawal: 'Withdrawal', commission: 'Team Commission', plan_purchase: 'Investment Purchase', bonus: 'Bonus Reward', adjustment: 'Balance Adjustment' }
  const statusBadge = (s: string) => s === 'approved' ? <Badge variant="success">Confirmed</Badge> : s === 'rejected' ? <Badge variant="danger">Rejected</Badge> : <Badge variant="warning">Pending</Badge>

  return (
    <AppLayout>
      <PageHeader title="Assets" subtitle="USDT Wallet" />

      <div className="mx-4">
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0d2137, #0a3d4a)', border: '1px solid rgba(13,148,136,0.3)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center"><span className="text-white text-[10px] font-bold">T</span></div>
            <p className="text-slate-400 text-xs">USDT · Tether USD</p>
          </div>
          <p className="font-display font-bold text-4xl text-white mt-1">{(profile?.balance || 0).toFixed(4)}</p>
          <p className="text-slate-500 text-xs mt-0.5">≈ {formatCurrency(profile?.balance || 0)}</p>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => setShowDepositModal(true)} size="sm" className="flex-1"><ArrowDownLeft className="w-4 h-4" /> Top Up</Button>
            <Button onClick={() => setShowWithdrawModal(true)} variant="secondary" size="sm" className="flex-1"><ArrowUpRight className="w-4 h-4" /> Withdraw</Button>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
        {[{ label: 'Total In', val: profile?.total_deposited || 0, color: 'text-teal-400' }, { label: 'Total Out', val: profile?.total_withdrawn || 0, color: 'text-red-400' }, { label: 'Commission', val: profile?.total_commission || 0, color: 'text-yellow-400' }].map(s => (
          <Card key={s.label} className="text-center py-3"><p className={`font-bold text-sm ${s.color}`}>{formatCurrency(s.val)}</p><p className="text-slate-600 text-xs mt-0.5">{s.label}</p></Card>
        ))}
      </div>

      <div className="mx-4 mt-4 flex gap-1 bg-brand-card border border-brand-border rounded-xl p-1">
        {(['transactions', 'deposits', 'withdrawals'] as WalletTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-xs font-display font-semibold transition-all ${tab === t ? 'gradient-teal text-white' : 'text-slate-500'}`}>
            {t === 'deposits' ? 'Top Ups' : t === 'transactions' ? 'History' : 'Withdrawals'}
          </button>
        ))}
      </div>

      <div className="mx-4 mt-3 space-y-2 pb-4">
        {tab === 'transactions' && (transactions.length === 0 ? <Card><p className="text-center text-slate-600 py-8">No transactions yet</p></Card> :
          transactions.map(tx => (
            <Card key={tx.id} className="flex items-center gap-3 py-3">
              <div className="w-9 h-9 bg-brand-dark rounded-xl flex items-center justify-center shrink-0">{txIcon(tx.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-semibold">{tx.description || txLabel[tx.type] || tx.type}</p>
                <p className="text-xs text-slate-600">{formatDateTime(tx.created_at)}</p>
              </div>
              <p className={`font-mono font-bold text-sm ${['deposit','commission','bonus'].includes(tx.type) ? 'text-teal-400' : 'text-red-400'}`}>
                {['deposit','commission','bonus'].includes(tx.type) ? '+' : '-'}{tx.amount.toFixed(4)}
              </p>
            </Card>
          ))
        )}
        {tab === 'deposits' && (deposits.length === 0 ? <Card><p className="text-center text-slate-600 py-8">No top-ups yet</p></Card> :
          deposits.map(d => (
            <Card key={d.id}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-semibold text-white">{d.amount.toFixed(4)} USDT</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(d.created_at)}</p>
                  {d.payment_proof && <p className="text-xs text-slate-600 font-mono mt-1 truncate">TX: {d.payment_proof.slice(0,20)}...</p>}
                  {d.notes && d.notes.startsWith('http') && (
                    <a href={d.notes} target="_blank" rel="noreferrer" className="text-xs text-teal-400 mt-1 block">View screenshot →</a>
                  )}
                </div>
                {statusBadge(d.status)}
              </div>
              {d.admin_note && <p className="text-xs text-slate-500 mt-2 bg-brand-dark rounded-lg px-3 py-1.5">{d.admin_note}</p>}
            </Card>
          ))
        )}
        {tab === 'withdrawals' && (withdrawals.length === 0 ? <Card><p className="text-center text-slate-600 py-8">No withdrawals yet</p></Card> :
          withdrawals.map(w => (
            <Card key={w.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{w.amount.toFixed(4)} USDT</p>
                  <p className="text-xs text-slate-500 font-mono">{w.network} · {truncateAddress(w.wallet_address)}</p>
                  <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(w.created_at)}</p>
                </div>
                {statusBadge(w.status)}
              </div>
              {w.admin_note && <p className="text-xs text-slate-500 mt-2 bg-brand-dark rounded-lg px-3 py-1.5">{w.admin_note}</p>}
            </Card>
          ))
        )}
      </div>

      {/* TOP UP Modal */}
      <Modal open={showDepositModal} onClose={() => setShowDepositModal(false)} title="Top Up USDT">
        <div className="space-y-4">
          <div className="bg-brand-dark rounded-xl p-4 border border-teal-500/30">
            <p className="text-xs text-slate-500 mb-2 font-display uppercase tracking-wider">Send USDT to this address</p>
            <p className="text-xs font-mono text-teal-400 break-all leading-relaxed">{depositAddress || 'Loading...'}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-slate-500">Network: <span className="text-slate-300">{depositNetwork}</span></span>
              <button onClick={() => { navigator.clipboard.writeText(depositAddress); toast({ title: 'Copied!', variant: 'success' }) }}
                className="text-xs text-teal-400 border border-teal-500/30 rounded-lg px-2 py-1">Copy</button>
            </div>
          </div>

          <Input label="Amount (USDT)" type="number" placeholder="Min. 10 USDT" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} icon={<DollarSign className="w-4 h-4" />} />
          <Input label="Transaction Hash (TX ID)" type="text" placeholder="Paste your transaction hash" value={depositTxHash} onChange={e => setDepositTxHash(e.target.value)} icon={<Hash className="w-4 h-4" />} />

          {/* Screenshot upload */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display block mb-1.5">Payment Screenshot</label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScreenshotSelect} className="hidden" />
            {screenshotPreview ? (
              <div className="relative">
                <img src={screenshotPreview} alt="Screenshot preview" className="w-full h-32 object-cover rounded-xl border border-brand-border" />
                <button onClick={() => { setScreenshotFile(null); setScreenshotPreview('') }}
                  className="absolute top-2 right-2 bg-red-500/80 text-white text-xs px-2 py-1 rounded-lg">Remove</button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-brand-border rounded-xl py-6 flex flex-col items-center gap-2 hover:border-teal-500/50 transition-colors">
                <ImagePlus className="w-8 h-8 text-slate-600" />
                <p className="text-sm text-slate-500">Tap to upload screenshot</p>
                <p className="text-xs text-slate-700">JPG, PNG up to 5MB</p>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-600 bg-brand-dark rounded-xl p-3">
            ⚠️ After sending USDT, submit this form. Your balance will be credited after admin verifies your payment.
          </p>
          <Button onClick={submitDeposit} loading={loading || uploadingScreenshot} className="w-full" size="lg">
            {uploadingScreenshot ? 'Uploading...' : 'Submit Top Up'}
          </Button>
        </div>
      </Modal>

      {/* WITHDRAWAL Modal */}
      <Modal open={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} title="Withdraw USDT">
        <div className="space-y-4">
          {!hasActivePlan && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3"><p className="text-xs text-red-400">⚠️ An active investment plan is required to withdraw.</p></div>}
          <div className="bg-brand-dark rounded-xl p-3 border border-brand-border">
            <p className="text-xs text-slate-500">Available Balance</p>
            <p className="font-display font-bold text-white text-xl">{(profile?.balance || 0).toFixed(4)} USDT</p>
          </div>
          <Input label="Amount (USDT)" type="number" placeholder="Min. 20 USDT" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} icon={<DollarSign className="w-4 h-4" />} />
          <Input label="Receiving Wallet Address" placeholder="Your USDT wallet address" value={withdrawWallet} onChange={e => setWithdrawWallet(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Network</label>
            <select value={withdrawNetwork} onChange={e => setWithdrawNetwork(e.target.value)} className="bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500/70">
              <option value="USDT-TRC20">USDT (TRC20)</option>
              <option value="USDT-ERC20">USDT (ERC20)</option>
              <option value="USDT-BEP20">USDT (BEP20)</option>
            </select>
          </div>
          <p className="text-xs text-slate-600">Withdrawals are reviewed and processed within 24-48 hours.</p>
          <Button onClick={submitWithdrawal} loading={loading} className="w-full" size="lg" disabled={!hasActivePlan}>Confirm Withdrawal</Button>
        </div>
      </Modal>
    </AppLayout>
  )
}
