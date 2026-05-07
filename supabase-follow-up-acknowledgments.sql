create table if not exists public.follow_up_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  follow_up_id uuid not null references public.follow_ups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  triggered_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint follow_up_acknowledgments_unique_user_follow_up unique (follow_up_id, user_id)
);

create index if not exists follow_up_acknowledgments_follow_up_id_idx
  on public.follow_up_acknowledgments(follow_up_id);

create index if not exists follow_up_acknowledgments_user_id_idx
  on public.follow_up_acknowledgments(user_id);

alter table public.follow_up_acknowledgments enable row level security;

drop policy if exists "follow up acknowledgments select" on public.follow_up_acknowledgments;
drop policy if exists "follow up acknowledgments insert" on public.follow_up_acknowledgments;
drop policy if exists "follow up acknowledgments update" on public.follow_up_acknowledgments;
drop policy if exists "follow up acknowledgments delete" on public.follow_up_acknowledgments;

create policy "follow up acknowledgments select"
on public.follow_up_acknowledgments
for select
to authenticated
using (true);

create policy "follow up acknowledgments insert"
on public.follow_up_acknowledgments
for insert
to authenticated
with check (true);

create policy "follow up acknowledgments update"
on public.follow_up_acknowledgments
for update
to authenticated
using (true)
with check (true);

create policy "follow up acknowledgments delete"
on public.follow_up_acknowledgments
for delete
to authenticated
using (true);
