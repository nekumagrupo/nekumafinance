-- Separate Sandbox merchants without deleting existing checkouts or events.
-- Requires v6 and v7. Never changes real subscriptions or entitlements.
begin;
alter table public.paypal_sandbox_checkouts
  add column if not exists merchant_profile text not null default 'legacy'
  check (merchant_profile in ('legacy','jp'));
alter table public.paypal_sandbox_checkouts
  drop constraint if exists paypal_sandbox_checkouts_user_id_key;
create unique index if not exists paypal_sandbox_checkouts_user_profile_key
  on public.paypal_sandbox_checkouts(user_id, merchant_profile);

create or replace function public.paypal_sandbox_reserve_profile(target_user uuid, target_plan text, target_profile text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  if target_profile is null or target_profile not in ('legacy','jp')
    or target_plan is null or target_plan not in ('pro','family')
    or not exists(select 1 from auth.users where id=target_user)
    then raise exception 'INVALID_CHECKOUT'; end if;
  insert into public.paypal_sandbox_checkouts(user_id,plan,merchant_profile)
    values(target_user,target_plan,target_profile)
    on conflict(user_id,merchant_profile) do nothing;
  return (select to_jsonb(c) from public.paypal_sandbox_checkouts c
    where c.user_id=target_user and c.merchant_profile=target_profile);
end $$;

create or replace function public.paypal_sandbox_customer_status_profile(target_user uuid, target_profile text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  if target_profile is null or target_profile not in ('legacy','jp') then raise exception 'INVALID_PROFILE'; end if;
  return (
    select to_jsonb(c) || jsonb_build_object(
      'confirmed_receipts', (select count(distinct e.payment_id) from public.paypal_sandbox_events e where e.checkout_id=c.id and e.event_kind='PAYMENT.SALE.COMPLETED'),
      'last_confirmed_at', (select max(e.received_at) from public.paypal_sandbox_events e where e.checkout_id=c.id and e.payment_id is not null and e.event_kind='PAYMENT.SALE.COMPLETED'),
      'last_event_at', (select max(e.received_at) from public.paypal_sandbox_events e where e.checkout_id=c.id)
    ) from public.paypal_sandbox_checkouts c where c.user_id=target_user and c.merchant_profile=target_profile
  );
end $$;

-- Keep the existing endpoint and old deployments bound to the legacy merchant.
create or replace function public.paypal_sandbox_reserve(target_user uuid, target_plan text)
returns jsonb language sql security definer set search_path = '' as $$
  select public.paypal_sandbox_reserve_profile(target_user,target_plan,'legacy');
$$;
create or replace function public.paypal_sandbox_customer_status(target_user uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select public.paypal_sandbox_customer_status_profile(target_user,'legacy');
$$;
revoke all on function public.paypal_sandbox_reserve_profile(uuid,text,text), public.paypal_sandbox_customer_status_profile(uuid,text), public.paypal_sandbox_reserve(uuid,text), public.paypal_sandbox_customer_status(uuid) from public, anon, authenticated;
grant execute on function public.paypal_sandbox_reserve_profile(uuid,text,text), public.paypal_sandbox_customer_status_profile(uuid,text), public.paypal_sandbox_reserve(uuid,text), public.paypal_sandbox_customer_status(uuid) to service_role;
commit;
