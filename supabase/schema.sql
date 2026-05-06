-- ============================================================
-- WATT Finance - Complete Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text,
  phone text,
  avatar_url text,
  referral_code text unique not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  referred_by uuid references public.profiles(id),
  balance numeric(18,2) not null default 0,
  total_deposited numeric(18,2) not null default 0,
  total_withdrawn numeric(18,2) not null default 0,
  total_commission numeric(18,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- USER ROLES
-- ============================================================
create table public.user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

-- ============================================================
-- PLANS
-- ============================================================
create table public.plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price numeric(18,2) not null,
  duration_days integer not null default 30,
  features jsonb default '[]',
  is_active boolean not null default true,
  sort_order integer default 0,
  created_at timestamptz not null default now()
);

-- Insert default plans
insert into public.plans (name, description, price, duration_days, features, sort_order) values
('Starter', 'Perfect for beginners', 50.00, 30, '["Access to basic features","Withdrawal access","Referral program","Email support"]', 1),
('Growth', 'Most popular plan', 200.00, 30, '["All Starter features","Priority support","Higher withdrawal limits","Enhanced dashboard"]', 2),
('Pro', 'For serious traders', 500.00, 30, '["All Growth features","VIP support","Maximum withdrawal limits","Exclusive rewards"]', 3),
('Elite', 'Maximum benefits', 1000.00, 30, '["All Pro features","Dedicated manager","Unlimited withdrawals","Elite bonuses"]', 4);

-- ============================================================
-- USER PLANS (subscriptions)
-- ============================================================
create table public.user_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan_id uuid references public.plans(id) not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  amount_paid numeric(18,2) not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TRANSACTIONS (wallet ledger)
-- ============================================================
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('deposit', 'withdrawal', 'commission', 'plan_purchase', 'bonus', 'adjustment')),
  amount numeric(18,2) not null,
  balance_before numeric(18,2) not null default 0,
  balance_after numeric(18,2) not null default 0,
  description text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

-- ============================================================
-- DEPOSITS
-- ============================================================
create table public.deposits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(18,2) not null,
  payment_method text not null default 'crypto',
  payment_proof text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- WITHDRAWALS
-- ============================================================
create table public.withdrawals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(18,2) not null,
  wallet_address text not null,
  network text not null default 'USDT-TRC20',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'processing')),
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- COMMISSIONS (referral earnings)
-- ============================================================
create table public.commissions (
  id uuid primary key default uuid_generate_v4(),
  earner_id uuid references public.profiles(id) on delete cascade not null,
  source_user_id uuid references public.profiles(id) not null,
  plan_id uuid references public.plans(id) not null,
  tier integer not null check (tier between 1 and 3),
  rate numeric(5,4) not null,
  amount numeric(18,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- APP SETTINGS
-- ============================================================
create table public.app_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value, description) values
('announcement', 'Welcome to WATT Finance! Trade smarter.', 'Homepage announcement banner'),
('min_deposit', '10', 'Minimum deposit amount (USD)'),
('min_withdrawal', '20', 'Minimum withdrawal amount (USD)'),
('withdrawal_fee', '2', 'Withdrawal fee percentage'),
('commission_tier1', '0.05', 'Tier 1 referral commission rate (5%)'),
('commission_tier2', '0.03', 'Tier 2 referral commission rate (3%)'),
('commission_tier3', '0.01', 'Tier 3 referral commission rate (1%)'),
('deposit_address', 'TYourUSDTWalletAddressHere', 'Platform USDT deposit address'),
('deposit_network', 'TRC20 (TRON)', 'Accepted deposit network'),
('maintenance_mode', 'false', 'Put site in maintenance mode'),
('platform_name', 'WATT Finance', 'Platform display name');

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.plans enable row level security;
alter table public.user_plans enable row level security;
alter table public.transactions enable row level security;
alter table public.deposits enable row level security;
alter table public.withdrawals enable row level security;
alter table public.commissions enable row level security;
alter table public.app_settings enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- PROFILES policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for select using (public.is_admin());
create policy "Admins can update all profiles" on public.profiles for update using (public.is_admin());

-- USER ROLES policies
create policy "Users can view own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "Admins can manage all roles" on public.user_roles for all using (public.is_admin());

-- PLANS policies (public read)
create policy "Anyone can view active plans" on public.plans for select using (is_active = true);
create policy "Admins can manage plans" on public.plans for all using (public.is_admin());

-- USER PLANS policies
create policy "Users can view own plans" on public.user_plans for select using (auth.uid() = user_id);
create policy "Admins can manage all user plans" on public.user_plans for all using (public.is_admin());

-- TRANSACTIONS policies
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Admins can view all transactions" on public.transactions for select using (public.is_admin());
create policy "Admins can insert transactions" on public.transactions for insert with check (public.is_admin());

-- DEPOSITS policies
create policy "Users can view own deposits" on public.deposits for select using (auth.uid() = user_id);
create policy "Users can create deposits" on public.deposits for insert with check (auth.uid() = user_id);
create policy "Admins can manage all deposits" on public.deposits for all using (public.is_admin());

-- WITHDRAWALS policies
create policy "Users can view own withdrawals" on public.withdrawals for select using (auth.uid() = user_id);
create policy "Users can create withdrawals" on public.withdrawals for insert with check (auth.uid() = user_id);
create policy "Admins can manage all withdrawals" on public.withdrawals for all using (public.is_admin());

-- COMMISSIONS policies
create policy "Users can view own commissions" on public.commissions for select using (auth.uid() = earner_id);
create policy "Admins can manage all commissions" on public.commissions for all using (public.is_admin());

-- APP SETTINGS policies
create policy "Anyone can view settings" on public.app_settings for select using (true);
create policy "Admins can manage settings" on public.app_settings for all using (public.is_admin());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  ref_user_id uuid;
begin
  -- Find referrer if referral code provided
  if new.raw_user_meta_data->>'referral_code' is not null then
    select id into ref_user_id
    from public.profiles
    where referral_code = upper(new.raw_user_meta_data->>'referral_code')
    limit 1;
  end if;

  insert into public.profiles (id, email, full_name, referred_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    ref_user_id
  );

  -- Default role
  insert into public.user_roles (user_id, role) values (new.id, 'user');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function: approve deposit
create or replace function public.approve_deposit(deposit_id uuid, admin_note_text text default null)
returns void language plpgsql security definer as $$
declare
  dep record;
  usr record;
  new_balance numeric;
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;

  select * into dep from public.deposits where id = deposit_id and status = 'pending';
  if not found then raise exception 'Deposit not found or already processed'; end if;

  select * into usr from public.profiles where id = dep.user_id;
  new_balance := usr.balance + dep.amount;

  -- Update balance
  update public.profiles set
    balance = new_balance,
    total_deposited = total_deposited + dep.amount,
    updated_at = now()
  where id = dep.user_id;

  -- Mark deposit approved
  update public.deposits set
    status = 'approved',
    admin_note = admin_note_text,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = deposit_id;

  -- Record transaction
  insert into public.transactions (user_id, type, amount, balance_before, balance_after, description, reference_id)
  values (dep.user_id, 'deposit', dep.amount, usr.balance, new_balance, 'Deposit approved', deposit_id);
end;
$$;

-- Function: reject deposit
create or replace function public.reject_deposit(deposit_id uuid, admin_note_text text default null)
returns void language plpgsql security definer as $$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  update public.deposits set
    status = 'rejected',
    admin_note = admin_note_text,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = deposit_id and status = 'pending';
end;
$$;

-- Function: approve withdrawal
create or replace function public.approve_withdrawal(withdrawal_id uuid, admin_note_text text default null)
returns void language plpgsql security definer as $$
declare
  wd record;
  usr record;
  new_balance numeric;
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;

  select * into wd from public.withdrawals where id = withdrawal_id and status = 'pending';
  if not found then raise exception 'Withdrawal not found or already processed'; end if;

  select * into usr from public.profiles where id = wd.user_id;
  if usr.balance < wd.amount then raise exception 'Insufficient balance'; end if;

  new_balance := usr.balance - wd.amount;

  update public.profiles set
    balance = new_balance,
    total_withdrawn = total_withdrawn + wd.amount,
    updated_at = now()
  where id = wd.user_id;

  update public.withdrawals set
    status = 'approved',
    admin_note = admin_note_text,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = withdrawal_id;

  insert into public.transactions (user_id, type, amount, balance_before, balance_after, description, reference_id)
  values (wd.user_id, 'withdrawal', wd.amount, usr.balance, new_balance, 'Withdrawal approved', withdrawal_id);
end;
$$;

-- Function: reject withdrawal
create or replace function public.reject_withdrawal(withdrawal_id uuid, admin_note_text text default null)
returns void language plpgsql security definer as $$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  update public.withdrawals set
    status = 'rejected',
    admin_note = admin_note_text,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = withdrawal_id and status = 'pending';
end;
$$;

-- Function: purchase plan + process referral commissions
create or replace function public.purchase_plan(plan_id_input uuid)
returns uuid language plpgsql security definer as $$
declare
  usr record;
  plan record;
  new_balance numeric;
  new_plan_id uuid;
  ref1 record;
  ref2 record;
  ref3 record;
  tier1_rate numeric;
  tier2_rate numeric;
  tier3_rate numeric;
  comm_amount numeric;
begin
  select * into usr from public.profiles where id = auth.uid();
  select * into plan from public.plans where id = plan_id_input and is_active = true;
  if not found then raise exception 'Plan not found'; end if;
  if usr.balance < plan.price then raise exception 'Insufficient balance'; end if;

  new_balance := usr.balance - plan.price;

  -- Deduct balance
  update public.profiles set balance = new_balance, updated_at = now() where id = auth.uid();

  -- Create subscription
  insert into public.user_plans (user_id, plan_id, expires_at, amount_paid)
  values (auth.uid(), plan_id_input, now() + (plan.duration_days || ' days')::interval, plan.price)
  returning id into new_plan_id;

  -- Record transaction
  insert into public.transactions (user_id, type, amount, balance_before, balance_after, description, reference_id)
  values (auth.uid(), 'plan_purchase', plan.price, usr.balance, new_balance, 'Plan: ' || plan.name, new_plan_id);

  -- Get commission rates
  select value::numeric into tier1_rate from public.app_settings where key = 'commission_tier1';
  select value::numeric into tier2_rate from public.app_settings where key = 'commission_tier2';
  select value::numeric into tier3_rate from public.app_settings where key = 'commission_tier3';

  -- Tier 1 commission
  if usr.referred_by is not null then
    select * into ref1 from public.profiles where id = usr.referred_by;
    comm_amount := plan.price * tier1_rate;
    update public.profiles set balance = balance + comm_amount, total_commission = total_commission + comm_amount, updated_at = now() where id = ref1.id;
    insert into public.commissions (earner_id, source_user_id, plan_id, tier, rate, amount) values (ref1.id, auth.uid(), plan_id_input, 1, tier1_rate, comm_amount);
    insert into public.transactions (user_id, type, amount, balance_before, balance_after, description) values (ref1.id, 'commission', comm_amount, ref1.balance, ref1.balance + comm_amount, 'Tier 1 referral commission');

    -- Tier 2 commission
    if ref1.referred_by is not null then
      select * into ref2 from public.profiles where id = ref1.referred_by;
      comm_amount := plan.price * tier2_rate;
      update public.profiles set balance = balance + comm_amount, total_commission = total_commission + comm_amount, updated_at = now() where id = ref2.id;
      insert into public.commissions (earner_id, source_user_id, plan_id, tier, rate, amount) values (ref2.id, auth.uid(), plan_id_input, 2, tier2_rate, comm_amount);
      insert into public.transactions (user_id, type, amount, balance_before, balance_after, description) values (ref2.id, 'commission', comm_amount, ref2.balance, ref2.balance + comm_amount, 'Tier 2 referral commission');

      -- Tier 3 commission
      if ref2.referred_by is not null then
        select * into ref3 from public.profiles where id = ref2.referred_by;
        comm_amount := plan.price * tier3_rate;
        update public.profiles set balance = balance + comm_amount, total_commission = total_commission + comm_amount, updated_at = now() where id = ref3.id;
        insert into public.commissions (earner_id, source_user_id, plan_id, tier, rate, amount) values (ref3.id, auth.uid(), plan_id_input, 3, tier3_rate, comm_amount);
        insert into public.transactions (user_id, type, amount, balance_before, balance_after, description) values (ref3.id, 'commission', comm_amount, ref3.balance, ref3.balance + comm_amount, 'Tier 3 referral commission');
      end if;
    end if;
  end if;

  return new_plan_id;
end;
$$;

-- Function: make first user admin (run once after your first signup)
create or replace function public.make_admin(user_email text)
returns void language plpgsql security definer as $$
declare
  target_id uuid;
begin
  select id into target_id from public.profiles where email = user_email;
  if not found then raise exception 'User not found'; end if;
  insert into public.user_roles (user_id, role) values (target_id, 'admin') on conflict do nothing;
end;
$$;

-- ============================================================
-- VIEWS (for admin convenience)
-- ============================================================

create or replace view public.admin_users_view as
select
  p.id, p.email, p.full_name, p.phone, p.referral_code,
  p.balance, p.total_deposited, p.total_withdrawn, p.total_commission,
  p.is_active, p.created_at,
  ref.email as referred_by_email,
  exists(select 1 from public.user_roles ur where ur.user_id = p.id and ur.role = 'admin') as is_admin,
  (select up.status from public.user_plans up where up.user_id = p.id and up.status = 'active' order by up.expires_at desc limit 1) as plan_status
from public.profiles p
left join public.profiles ref on ref.id = p.referred_by;
