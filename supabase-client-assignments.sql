-- Run this in Supabase SQL Editor before using the connected-people workflow.

create table if not exists public.client_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  assigned_by uuid references public.users(id) on delete set null,
  lead_gen_id uuid references public.lead_gens(id) on delete set null,
  assignment_type text not null default 'connected',
  status text not null default 'connected',
  remarks text,
  lead_nature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_assignments_unique_user_per_client unique (client_id, user_id),
  constraint client_assignments_assignment_type_check check (
    assignment_type in ('primary', 'connected')
  ),
  constraint client_assignments_status_check check (
    status in ('connected', 'interested', 'not_interested', 'followup', 'converted', 'drop')
  )
);

create index if not exists client_assignments_client_id_idx
  on public.client_assignments(client_id);

create index if not exists client_assignments_user_id_idx
  on public.client_assignments(user_id);

create or replace function public.set_client_assignments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_client_assignments_updated_at on public.client_assignments;

create trigger set_client_assignments_updated_at
before update on public.client_assignments
for each row
execute function public.set_client_assignments_updated_at();
