-- Requires commercial v2 and PayPal v9. Opt-in Sandbox accounts only.
begin;
create table if not exists public.paypal_sandbox_access_testers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  merchant_profile text not null check(merchant_profile in ('legacy','jp')),
  enabled boolean not null default false
);
create table if not exists public.paypal_sandbox_subscription_states (
  checkout_id uuid primary key references public.paypal_sandbox_checkouts(id),
  provider_status text not null check(provider_status in ('APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED')),
  provider_updated_at timestamptz not null
);
alter table public.paypal_sandbox_access_testers enable row level security;
alter table public.paypal_sandbox_subscription_states enable row level security;
revoke all on public.paypal_sandbox_access_testers,public.paypal_sandbox_subscription_states from public,anon,authenticated;

create or replace function public.paypal_sandbox_sync_state(target_checkout uuid,target_profile text,target_status text,target_updated_at timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  if target_updated_at is null or target_updated_at>now()+interval '5 minutes'
    or not exists(select 1 from public.paypal_sandbox_checkouts where id=target_checkout and merchant_profile=target_profile and subscription_id is not null)
    then raise exception 'INVALID_STATE'; end if;
  insert into public.paypal_sandbox_subscription_states as s(checkout_id,provider_status,provider_updated_at)
    values(target_checkout,target_status,target_updated_at)
    on conflict(checkout_id) do update set provider_status=excluded.provider_status,provider_updated_at=excluded.provider_updated_at
    where excluded.provider_updated_at>s.provider_updated_at
      or (excluded.provider_updated_at=s.provider_updated_at and excluded.provider_status in ('CANCELLED','EXPIRED','SUSPENDED'));
  return true;
end $$;
revoke all on function public.paypal_sandbox_sync_state(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.paypal_sandbox_sync_state(uuid,text,text,timestamptz) to service_role;

create or replace function public.commercial_effective_plan(target_user uuid)
returns text language sql stable security definer set search_path='' as $$
  select coalesce(
    (select o.plan from public.commercial_access_overrides o where o.user_id=target_user and (o.valid_until is null or o.valid_until>now())),
    (select case when exists(
       select 1 from public.paypal_sandbox_checkouts c
       join public.paypal_sandbox_subscription_states s on s.checkout_id=c.id
       join public.paypal_sandbox_periods p on p.checkout_id=c.id and p.merchant_profile=c.merchant_profile
       where c.user_id=t.user_id and c.merchant_profile=t.merchant_profile
         and s.provider_status in ('ACTIVE','CANCELLED') and p.paid_from<=now() and p.paid_until>now()
         and not exists(select 1 from public.paypal_sandbox_payment_holds h where h.merchant_profile=p.merchant_profile and h.payment_id=p.payment_id)
     ) then (select c.plan from public.paypal_sandbox_checkouts c where c.user_id=t.user_id and c.merchant_profile=t.merchant_profile)
       else 'free' end from public.paypal_sandbox_access_testers t where t.user_id=target_user and t.enabled),
    (select case when s.status='trialing' and s.trial_ends_at>now() then s.plan
      when s.status in ('active','past_due','canceled') and s.paid_until>now() then s.plan
      else 'free' end from public.commercial_subscriptions s where s.user_id=target_user),'free');
$$;
commit;
