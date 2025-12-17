
-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  company_name text,
  business_type text, -- 'sdn_bhd', 'sole_prop', 'partnership'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create lhdn_tax_codes table (Master Data)
create table public.lhdn_tax_codes (
  code text primary key,
  description text not null,
  category text,
  default_deductibility_rate numeric default 1.0, -- 1.0 = 100%, 0.5 = 50%
  conditions jsonb, -- For complex rules
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create vouchers table
create table public.vouchers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  voucher_no text,
  payee_name text,
  date date,
  total_amount numeric default 0,
  status text default 'Draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create voucher_items table
create table public.voucher_items (
  id uuid default gen_random_uuid() primary key,
  voucher_id uuid references public.vouchers on delete cascade not null,
  description text not null,
  amount numeric not null,
  lhdn_code_id text references public.lhdn_tax_codes(code),
  deductible_amount numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.lhdn_tax_codes enable row level security;
alter table public.vouchers enable row level security;
alter table public.voucher_items enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on public.profiles for select using ( true );
create policy "Users can insert their own profile." on public.profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on public.profiles for update using ( auth.uid() = id );

create policy "Tax codes are viewable by everyone." on public.lhdn_tax_codes for select using ( true );

create policy "Users can view own vouchers." on public.vouchers for select using ( auth.uid() = user_id );
create policy "Users can insert own vouchers." on public.vouchers for insert with check ( auth.uid() = user_id );
create policy "Users can update own vouchers." on public.vouchers for update using ( auth.uid() = user_id );

create policy "Users can view own voucher items." on public.voucher_items for select using ( exists ( select 1 from public.vouchers where id = voucher_items.voucher_id and user_id = auth.uid() ) );
create policy "Users can insert own voucher items." on public.voucher_items for insert with check ( exists ( select 1 from public.vouchers where id = voucher_items.voucher_id and user_id = auth.uid() ) );

-- Seed some initial LHDN codes (Example)
insert into public.lhdn_tax_codes (code, description, category, default_deductibility_rate) values
('ENT-001', 'Entertainment - Clients', 'Entertainment', 0.5), -- 50% deductible
('ENT-002', 'Entertainment - Staff', 'Entertainment', 1.0),   -- 100% deductible
('TRV-001', 'Domestic Travel', 'Travel', 1.0),
('GEN-001', 'Office Supplies', 'General', 1.0),
('DON-001', 'Donation to Approved Inst.', 'Donation', 1.0),    -- Need receipt check
('PEN-001', 'Fines and Penalties', 'Penalty', 0.0);            -- Not deductible
