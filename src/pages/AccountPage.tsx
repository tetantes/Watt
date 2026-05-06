import { useState } from 'react'
import { User, Mail, Phone, Shield, LogOut, ChevronRight, Edit2, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'

export default function AccountPage() {
  const { profile, isAdmin, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const saveProfile = async () => {
    if (!profile) return
    setLoading(true)
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', profile.id)
    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Profile updated!', variant: 'success' })
      refreshProfile()
      setShowEditModal(false)
    }
    setLoading(false)
  }

  const changePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Too short', description: 'Password must be at least 6 characters', variant: 'destructive' }); return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Password changed!', variant: 'success' })
      setShowPasswordModal(false); setNewPassword('')
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <AppLayout>
      <PageHeader title="Account" subtitle="Profile & settings" />

      {/* Avatar */}
      <div className="flex flex-col items-center py-4 mx-4">
        <div className="w-20 h-20 gradient-teal rounded-full flex items-center justify-center text-white font-display font-bold text-3xl glow-teal mb-3">
          {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
        </div>
        <h2 className="font-display font-bold text-white text-xl">{profile?.full_name || 'User'}</h2>
        <p className="text-slate-500 text-sm">{profile?.email}</p>
        {isAdmin && (
          <span className="mt-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-xs font-display font-semibold text-yellow-400">
            Admin
          </span>
        )}
      </div>

      {/* Info cards */}
      <div className="mx-4 space-y-2">
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Full Name</p>
                <p className="text-sm text-white font-semibold">{profile?.full_name || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm text-white">{profile?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-sm text-white">{profile?.phone || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Member Since</p>
                <p className="text-sm text-white">{profile?.created_at ? formatDate(profile.created_at) : '-'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button onClick={() => { setFullName(profile?.full_name || ''); setPhone(profile?.phone || ''); setShowEditModal(true) }}
            className="w-full card-dark flex items-center gap-3 p-4 hover:border-teal-500/40 transition-all">
            <Edit2 className="w-5 h-5 text-teal-400" />
            <span className="flex-1 text-left text-sm font-semibold text-white">Edit Profile</span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>

          <button onClick={() => setShowPasswordModal(true)}
            className="w-full card-dark flex items-center gap-3 p-4 hover:border-cyan-500/40 transition-all">
            <Lock className="w-5 h-5 text-cyan-400" />
            <span className="flex-1 text-left text-sm font-semibold text-white">Change Password</span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>

          {isAdmin && (
            <button onClick={() => navigate('/admin')}
              className="w-full card-dark flex items-center gap-3 p-4 hover:border-yellow-500/40 transition-all">
              <Shield className="w-5 h-5 text-yellow-400" />
              <span className="flex-1 text-left text-sm font-semibold text-white">Admin Panel</span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          )}

          <button onClick={handleSignOut}
            className="w-full card-dark flex items-center gap-3 p-4 border-red-500/20 hover:border-red-500/50 transition-all">
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="flex-1 text-left text-sm font-semibold text-red-400">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Profile">
        <div className="space-y-4">
          <Input label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
          <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1234567890" type="tel" />
          <Button onClick={saveProfile} loading={loading} className="w-full">Save Changes</Button>
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password">
        <div className="space-y-4">
          <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
          <Button onClick={changePassword} loading={loading} className="w-full">Update Password</Button>
        </div>
      </Modal>
    </AppLayout>
  )
}
