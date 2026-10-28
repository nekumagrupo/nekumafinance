-- Stripe test audit only. No commercial entitlement writes.
begin;
create table if not exists public.stripe_test_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  plan text not null default 'pro' check (plan = 'pro'),
  session_id text unique,
  created_at timestamptz not null default now()
);
create table if not exists public.stripe_test_events (
  event_id text primary key,
  checkout_id uuid references public.stripe_test_checkouts(id),
  event_kind text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_test_checkouts enable row level security;
alter table public.stripe_test_events enable row level security;
revoke all on public.stripe_test_checkouts, public.stripe_test_events from public, anon, authenticated;

create or replace function public.stripe_test_reserve(target_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from auth.users where id = target_user) then raise exception 'INVALID_USER'; end if;
  insert into public.stripe_test_checkouts(user_id) values(target_user) on conflict(user_id) do nothing;
  return (select to_jsonb(c) from public.stripe_test_checkouts c where user_id = target_user);
end $$;
create or replace function public.stripe_test_bind(target_checkout uuid, target_session text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  if target_session is null or target_session !~ '^cs_test_[A-Za-z0-9]+$' then raise exception 'INVALID_SESSION'; end if;
  update public.stripe_test_checkouts set session_id = target_session
    where id = target_checkout and (session_id is null or session_id = target_session);
  if not found then raise exception 'BINDING_CONFLICT'; end if;
  return true;
end $$;
revoke all on function public.stripe_test_reserve(uuid), public.stripe_test_bind(uuid,text) from public, anon, authenticated;
grant execute on function public.stripe_test_reserve(uuid), public.stripe_test_bind(uuid,text) to service_role;
commit;
