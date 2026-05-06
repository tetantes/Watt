import { useEffect, useState } from 'react'
import { Users, ArrowDownLeft, ArrowUpRight, Settings, CheckCircle, XCircle, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Deposit, Withdrawal } from '@/types'

type AdminTab = 'deposits' | 'withdrawals' | 'users' | 'settings'

export default function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<AdminTab>('deposits')
  const [deposits, setDeposits] = useState<(Deposit & { profile?: any })[]>([])
  const [withdrawals, setWithdrawals] = useState<(Withdrawal & { profile?: any })[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [adminNote, setAdminNote] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [manualAmount, setManualAmount] = useState<Record<string, string>>({})

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard') }, [isAdmin, authLoading])
  useEffect(() => { loadData() }, [tab])
  useEffect(() => {
    if (!userSearch) { setFilteredUsers(users); return }
    const q = userSearch.toLowerCase()
    setFilteredUsers(users.filter(u => u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q) || u.referral_code?.toLowerCase().includes(q)))
  }, [userSearch, users])

  const loadData = async () => {
    if (tab === 'deposits') {
      const { data } = await supabase.from('deposits').select('*, profile:profiles(full_name, email)').order('created_at', { ascending: false })
      if (data) setDeposits(data)
    } else if (tab === 'withdrawals') {
      const { data } = await supabase.from('withdrawals').select('*, profile:profiles(full_name, email)').order('created_at', { ascending: false })
      if (data) setWithdrawals(data)
    } else if (tab === 'users') {
      const { data } = await supabase.from('admin_users_view').select('*').order('created_at', { ascending: false })
      if (data) { setUsers(data); setFilteredUsers(data) }
    } else if (tab === 'settings') {
      const { data } = await supabase.from('app_settings').select('*')
      if (data) { const obj: Record<string, string> = {}; data.forEach((s: any) => { obj[s.key] = s.value }); setSettings(obj) }
    }
  }

  const approveDeposit = async (id: string) => {
    setProcessing(id)
    const { error } = await supabase.rpc('approve_deposit', { deposit_id: id, admin_note_text: adminNote[id] || null })
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Deposit approved!', variant: 'success' }); loadData() }
    setProcessing(null)
  }

  const rejectDeposit = async (id: string) => {
    setProcessing(id)
    const { error } = await supabase.rpc('reject_deposit', { deposit_id: id, admin_note_text: adminNote[id] || null })
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Rejected', variant: 'success' }); loadData() }
    setProcessing(null)
  }

  const approveWithdrawal = async (id: string) => {
    setProcessing(id)
    const { error } = await supabase.rpc('approve_withdrawal', { withdrawal_id: id, admin_note_text: adminNote[id] || null })
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Withdrawal approved!', variant: 'success' }); loadData() }
    setProcessing(null)
  }

  const rejectWithdrawal = async (id: string) => {
    setProcessing(id)
    const { error } = await supabase.rpc('reject_withdrawal', { withdrawal_id: id, admin_note_text: adminNote[id] || null })
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Rejected', variant: 'success' }); loadData() }
    setProcessing(null)
  }

  const saveSetting = async (key: string) => {
    const { error } = await supabase.from('app_settings').update({ value: settings[key], updated_at: new Date().toISOString() }).eq('key', key)
    if (error) toast({ title: 'Failed', variant: 'destructive' })
    else toast({ title: 'Saved!', variant: 'success' })
  }

  const toggleUserStatus = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_active: !current }).eq('id', userId)
    toast({ title: `User ${!current ? 'activated' : 'deactivated'}`, variant: 'success' }); loadData()
  }

  const adjustBalance = async (userId: string, add: boolean) => {
    const amount = parseFloat(manualAmount[userId] || '0')
    if (!amount || isNaN(amount)) { toast({ title: 'Enter valid amount', variant: 'destructive' }); return }
    const { data: usr } = await supabase.from('profiles').select('balance').eq('id', userId).single()
    if (!usr) return
    const newBal = add ? usr.balance + amount : Math.max(0, usr.balance - amount)
    await supabase.from('profiles').update({ balance: newBal }).eq('id', userId)
    await supabase.from('transactions').insert({ user_id: userId, type: 'adjustment', amount, balance_before: usr.balance, balance_after: newBal, description: `Admin ${add ? 'credit' : 'debit'}` })
    toast({ title: `Balance ${add ? 'credited' : 'debited'}!`, variant: 'success' }); loadData()
  }

  const statusBadge = (s: string) => s === 'approved' ? <Badge variant="success">Approved</Badge> : s === 'rejected' ? <Badge variant="danger">Rejected</Badge> : <Badge variant="warning">Pending</Badge>
  const pendingDep = deposits.filter(d => d.status === 'pending').length
  const pendingWd = withdrawals.filter(w => w.status === 'pending').length

  return (
    <AppLayout>
      <PageHeader title="Admin Panel" subtitle="Platform control" back />

      <div className="mx-4 grid grid-cols-2 gap-3 mb-4">
        <Card className="text-center py-3"><p className="text-yellow-400 font-display font-bold text-2xl">{pendingDep}</p><p className="text-slate-500 text-xs">Pending Deposits</p></Card>
        <Card className="text-center py-3"><p className="text-red-400 font-display font-bold text-2xl">{pendingWd}</p><p className="text-slate-500 text-xs">Pending Withdrawals</p></Card>
      </div>

      <div className="mx-4 grid grid-cols-4 gap-1 bg-brand-card border border-brand-border rounded-xl p-1 mb-4">
        {([{ id: 'deposits', icon: ArrowDownLeft, label: 'Deposits' }, { id: 'withdrawals', icon: ArrowUpRight, label: 'Withdraw' }, { id: 'users', icon: Users, label: 'Users' }, { id: 'settings', icon: Settings, label: 'Settings' }] as { id: AdminTab; icon: any; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] font-display font-semibold transition-all ${tab === t.id ? 'gradient-teal text-white' : 'text-slate-500'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'deposits' && (
        <div className="mx-4 space-y-3 pb-4">
          {deposits.length === 0 && <Card><p className="text-center text-slate-600 py-6">No deposits</p></Card>}
          {deposits.map(d => (
            <Card key={d.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-white">{d.amount.toFixed(4)} USDT</p>
                  <p className="text-xs text-slate-400">{d.profile?.full_name} · {d.profile?.email}</p>
                  <p className="text-xs text-slate-600">{formatDateTime(d.created_at)}</p>
                  {d.payment_proof && <p className="text-xs text-teal-400 font-mono mt-1 break-all">TX: {d.payment_proof}</p>}
                  {d.notes && <p className="text-xs text-slate-500 mt-1">{d.notes}</p>}
                </div>
                {statusBadge(d.status)}
              </div>
              {d.status === 'pending' && (
                <div className="space-y-2 pt-2 border-t border-brand-border">
                  <Input placeholder="Admin note (optional)" value={adminNote[d.id] || ''} onChange={e => setAdminNote(p => ({ ...p, [d.id]: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button onClick={() => approveDeposit(d.id)} size="sm" className="flex-1" loading={processing === d.id}><CheckCircle className="w-3.5 h-3.5" /> Approve</Button>
                    <Button onClick={() => rejectDeposit(d.id)} variant="danger" size="sm" className="flex-1" loading={processing === d.id}><XCircle className="w-3.5 h-3.5" /> Reject</Button>
                  </div>
                </div>
              )}
              {d.admin_note && <p className="text-xs text-slate-500 mt-2">Note: {d.admin_note}</p>}
            </Card>
          ))}
        </div>
      )}

      {tab === 'withdrawals' && (
        <div className="mx-4 space-y-3 pb-4">
          {withdrawals.length === 0 && <Card><p className="text-center text-slate-600 py-6">No withdrawals</p></Card>}
          {withdrawals.map(w => (
            <Card key={w.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-white">{w.amount.toFixed(4)} USDT</p>
                  <p className="text-xs text-slate-400">{w.profile?.full_name} · {w.profile?.email}</p>
                  <p className="text-xs text-slate-500 font-mono">{w.network}</p>
                  <p className="text-xs text-slate-500 font-mono break-all">{w.wallet_address}</p>
                  <p className="text-xs text-slate-600">{formatDateTime(w.created_at)}</p>
                </div>
                {statusBadge(w.status)}
              </div>
              {w.status === 'pending' && (
                <div className="space-y-2 pt-2 border-t border-brand-border">
                  <Input placeholder="Admin note (optional)" value={adminNote[w.id] || ''} onChange={e => setAdminNote(p => ({ ...p, [w.id]: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button onClick={() => approveWithdrawal(w.id)} size="sm" className="flex-1" loading={processing === w.id}><CheckCircle className="w-3.5 h-3.5" /> Approve</Button>
                    <Button onClick={() => rejectWithdrawal(w.id)} variant="danger" size="sm" className="flex-1" loading={processing === w.id}><XCircle className="w-3.5 h-3.5" /> Reject</Button>
                  </div>
                </div>
              )}
              {w.admin_note && <p className="text-xs text-slate-500 mt-2">Note: {w.admin_note}</p>}
            </Card>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="mx-4 pb-4">
          <div className="mb-3">
            <Input placeholder="Search by name, email or referral code..." value={userSearch} onChange={e => setUserSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
          </div>
          <p className="text-xs text-slate-600 mb-2">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found</p>
          <div className="space-y-2">
            {filteredUsers.length === 0 && <Card><p className="text-center text-slate-600 py-6">No users found</p></Card>}
            {filteredUsers.map(u => (
              <Card key={u.id}>
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 gradient-teal rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(u.full_name || u.email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white font-semibold truncate">{u.full_name || 'User'}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {u.is_admin && <Badge variant="gold">Admin</Badge>}
                    <Badge variant={u.is_active ? 'success' : 'danger'}>{u.is_active ? 'Active' : 'Off'}</Badge>
                    {expandedUser === u.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </div>
                {expandedUser === u.id && (
                  <div className="mt-3 pt-3 border-t border-brand-border space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-brand-dark rounded-lg p-2"><p className="text-teal-400 font-bold text-sm">{formatCurrency(u.balance)}</p><p className="text-slate-600 text-xs">Balance</p></div>
                      <div className="bg-brand-dark rounded-lg p-2"><p className="text-cyan-400 font-bold text-sm">{formatCurrency(u.total_deposited)}</p><p className="text-slate-600 text-xs">Deposited</p></div>
                      <div className="bg-brand-dark rounded-lg p-2"><p className="text-yellow-400 font-bold text-sm">{formatCurrency(u.total_commission)}</p><p className="text-slate-600 text-xs">Commission</p></div>
                    </div>
                    <p className="text-xs text-slate-600">Ref Code: <span className="font-mono text-slate-400">{u.referral_code}</span></p>
                    <div className="flex gap-2">
                      <input type="number" placeholder="Amount" value={manualAmount[u.id] || ''} onChange={e => setManualAmount(p => ({ ...p, [u.id]: e.target.value }))}
                        className="flex-1 bg-brand-dark border border-brand-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/70" />
                      <Button onClick={() => adjustBalance(u.id, true)} size="sm" variant="outline">+ Credit</Button>
                      <Button onClick={() => adjustBalance(u.id, false)} size="sm" variant="danger">- Debit</Button>
                    </div>
                    {!u.is_admin && (
                      <Button onClick={() => toggleUserStatus(u.id, u.is_active)} variant={u.is_active ? 'danger' : 'outline'} size="sm" className="w-full">
                        {u.is_active ? 'Deactivate User' : 'Activate User'}
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="mx-4 space-y-3 pb-4">
          {Object.entries(settings).map(([key, value]) => (
            <Card key={key}>
              <p className="text-xs text-slate-500 font-display uppercase tracking-wider mb-2">{key.replace(/_/g, ' ')}</p>
              <div className="flex gap-2">
                <input value={value} onChange={e => setSettings(p => ({ ...p, [key]: e.target.value }))}
                  className="flex-1 bg-brand-dark border border-brand-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/70" />
                <Button onClick={() => saveSetting(key)} size="sm" variant="outline">Save</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
