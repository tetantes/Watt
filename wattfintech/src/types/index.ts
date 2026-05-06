export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  referral_code: string
  referred_by: string | null
  balance: number
  total_deposited: number
  total_withdrawn: number
  total_commission: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  name: string
  description: string | null
  price: number
  duration_days: number
  features: string[]
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface UserPlan {
  id: string
  user_id: string
  plan_id: string
  status: 'active' | 'expired' | 'cancelled'
  started_at: string
  expires_at: string
  amount_paid: number
  created_at: string
  plan?: Plan
}

export interface Transaction {
  id: string
  user_id: string
  type: 'deposit' | 'withdrawal' | 'commission' | 'plan_purchase' | 'bonus' | 'adjustment'
  amount: number
  balance_before: number
  balance_after: number
  description: string | null
  reference_id: string | null
  created_at: string
}

export interface Deposit {
  id: string
  user_id: string
  amount: number
  payment_method: string
  payment_proof: string | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  profile?: Profile
}

export interface Withdrawal {
  id: string
  user_id: string
  amount: number
  wallet_address: string
  network: string
  status: 'pending' | 'approved' | 'rejected' | 'processing'
  admin_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  profile?: Profile
}

export interface Commission {
  id: string
  earner_id: string
  source_user_id: string
  plan_id: string
  tier: 1 | 2 | 3
  rate: number
  amount: number
  status: 'pending' | 'paid'
  created_at: string
}

export interface AppSettings {
  [key: string]: string
}

export type TabRoute = 'dashboard' | 'wallet' | 'plans' | 'team' | 'account'
