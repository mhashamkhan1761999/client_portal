-- Live finance migration.
-- Run after reviewing against the live schema you shared.
-- Creates only the new finance tables used by the current code.

create table if not exists public.client_sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sale_type text not null default 'new_sale'
    check (sale_type in ('new_sale', 'upsell', 'renewal', 'add_on')),
  seller_user_id uuid not null references public.users(id),
  added_by uuid references public.users(id),
  total_amount numeric not null check (total_amount >= 0),
  currency text not null default 'USD',
  sold_items text not null,
  invoice_number text,
  sale_date date not null default current_date,
  status text not null default 'open'
    check (status in ('open', 'partially_paid', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.client_sales(id) on delete cascade,
  amount_paid numeric not null check (amount_paid > 0),
  payment_date date not null default current_date,
  payment_method text not null default 'paypal',
  payment_stage text not null default 'upfront'
    check (payment_stage in ('upfront', 'remaining', 'partial', 'upsell', 'refund', 'adjustment')),
  invoice_number text,
  paypal_transaction_id text,
  added_by uuid references public.users(id),
  note text,
  commission_locked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.sale_commission_splits (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.client_sale_payments(id) on delete cascade,
  recipient_user_id uuid references public.users(id),
  lead_gen_id uuid references public.lead_gens(id),
  role_on_sale text not null
    check (role_on_sale in ('lead_gen', 'nurturer', 'seller', 'closer', 'upseller', 'helper')),
  commission_percent numeric not null check (commission_percent >= 0),
  commission_amount numeric not null check (commission_amount >= 0),
  added_by uuid references public.users(id),
  note text,
  created_at timestamptz not null default now(),
  check (recipient_user_id is not null or lead_gen_id is not null)
);

create index if not exists client_sales_client_id_idx
  on public.client_sales(client_id);

create index if not exists client_sales_seller_user_id_idx
  on public.client_sales(seller_user_id);

create index if not exists client_sales_sale_date_idx
  on public.client_sales(sale_date);

create index if not exists client_sale_payments_sale_id_idx
  on public.client_sale_payments(sale_id);

create index if not exists client_sale_payments_payment_date_idx
  on public.client_sale_payments(payment_date);

create index if not exists client_sale_payments_commission_locked_idx
  on public.client_sale_payments(commission_locked);

create index if not exists sale_commission_splits_payment_id_idx
  on public.sale_commission_splits(payment_id);

create index if not exists sale_commission_splits_recipient_user_id_idx
  on public.sale_commission_splits(recipient_user_id);

create index if not exists sale_commission_splits_lead_gen_id_idx
  on public.sale_commission_splits(lead_gen_id);

grant select, insert, update, delete on public.client_sales to authenticated;
grant select, insert, update, delete on public.client_sale_payments to authenticated;
grant select, insert, update, delete on public.sale_commission_splits to authenticated;
