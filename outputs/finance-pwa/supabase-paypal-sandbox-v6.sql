-- Sandbox only. Never modifies commercial_subscriptions or real entitlements.
begin;
create table if not exists public.paypal_sandbox_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  plan text not null check (plan in ('pro','family')),
  subscription_id text unique,
  provider_status text,
  created_at timestamptz not null default now()
);
-- No auth FK: the minimal payment audit must survive an account deletion.
create table if not exists public.paypal_sandbox_events (
  event_key text primary key,
  checkout_id uuid references public.paypal_sandbox_checkouts(id),
  event_kind text not null,
  payment_id text,
  received_at timestamptz not null default now()
);
alter table public.paypal_sandbox_checkouts enable row level security;
alter table public.paypal_sandbox_events enable row level security;
revoke all on public.paypal_sandbox_checkouts, public.paypal_sandbox_events from public, anon, authenticated;

create or replace function public.paypal_sandbox_reserve(target_user uuid, target_plan text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  if target_plan not in ('pro','family') or not exists(select 1 from auth.users where id=target_user) then raise exception 'INVALID_CHECKOUT'; end if;
  insert into public.paypal_sandbox_checkouts(user_id,plan) values(target_user,target_plan) on conflict(user_id) do nothing;
  select to_jsonb(c) into result from public.paypal_sandbox_checkouts c where user_id=target_user;
  return result;
end $$;
create or replace function public.paypal_sandbox_bind(checkout_id uuid, subscription text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  if subscription !~ '^I-[A-Z0-9]+$' then raise exception 'INVALID_SUBSCRIPTION'; end if;
  update public.paypal_sandbox_checkouts set subscription_id=subscription where id=checkout_id and (subscription_id is null or subscription_id=subscription);
  if not found then raise exception 'BINDING_CONFLICT'; end if;
  return true;
end $$;
create or replace function public.paypal_sandbox_lookup(subscription text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  return (select to_jsonb(c) from public.paypal_sandbox_checkouts c where subscription_id=subscription);
end $$;
create or replace function public.paypal_sandbox_record(checkout_id uuid, event_key text, event_kind text, provider_status text, payment_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  insert into public.paypal_sandbox_events(event_key,checkout_id,event_kind,payment_id)
    values(event_key,checkout_id,event_kind,payment_id) on conflict do nothing;
  -- Event arrival order is not subscription state order. Do not overwrite state from delayed events.
  return true;
end $$;
create or replace function public.paypal_sandbox_review(event_key text, event_kind text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  insert into public.paypal_sandbox_events(event_key,event_kind) values(event_key,event_kind) on conflict do nothing;
  return true;
end $$;
revoke all on function public.paypal_sandbox_reserve(uuid,text), public.paypal_sandbox_bind(uuid,text), public.paypal_sandbox_lookup(text), public.paypal_sandbox_record(uuid,text,text,text,text), public.paypal_sandbox_review(text,text) from public, anon, authenticated;
grant execute on function public.paypal_sandbox_reserve(uuid,text), public.paypal_sandbox_bind(uuid,text), public.paypal_sandbox_lookup(text), public.paypal_sandbox_record(uuid,text,text,text,text), public.paypal_sandbox_review(text,text) to service_role;
commit;
