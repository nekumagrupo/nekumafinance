-- Sandbox entitlement simulation only; no commercial_subscriptions writes.
begin;
create table if not exists public.paypal_sandbox_periods (
  merchant_profile text not null check (merchant_profile in ('legacy','jp')),
  payment_id text not null,
  checkout_id uuid not null references public.paypal_sandbox_checkouts(id),
  paid_from timestamptz not null,
  paid_until timestamptz not null,
  recorded_at timestamptz not null default now(),
  primary key(merchant_profile,payment_id),
  check (paid_until>paid_from and paid_until<=paid_from+interval '32 days')
);
create table if not exists public.paypal_sandbox_payment_holds (
  merchant_profile text not null check (merchant_profile in ('legacy','jp')),
  payment_id text not null,
  event_key text not null,
  reason text not null check(reason in ('PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED')),
  created_at timestamptz not null default now(),
  primary key(merchant_profile,payment_id)
);
alter table public.paypal_sandbox_periods enable row level security;
alter table public.paypal_sandbox_payment_holds enable row level security;
revoke all on public.paypal_sandbox_periods,public.paypal_sandbox_payment_holds from public,anon,authenticated;

create or replace function public.paypal_sandbox_confirm_period(target_checkout uuid,target_profile text,target_payment text,period_start timestamptz,period_end timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
declare existing public.paypal_sandbox_periods;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  if target_payment is null or length(target_payment) not between 1 and 200
    or period_start is null or period_end is null or period_start>now()+interval '5 minutes'
    or period_end<=period_start or period_end>period_start+interval '32 days'
    or not exists(select 1 from public.paypal_sandbox_checkouts where id=target_checkout and merchant_profile=target_profile and subscription_id is not null)
    then raise exception 'INVALID_PERIOD'; end if;
  insert into public.paypal_sandbox_periods(merchant_profile,payment_id,checkout_id,paid_from,paid_until)
    values(target_profile,target_payment,target_checkout,period_start,period_end) on conflict do nothing;
  select * into existing from public.paypal_sandbox_periods where merchant_profile=target_profile and payment_id=target_payment;
  if existing.checkout_id<>target_checkout or existing.paid_from<>period_start or existing.paid_until<>period_end
    then raise exception 'PERIOD_CONFLICT'; end if;
  return true;
end $$;

create or replace function public.paypal_sandbox_hold_payment(target_profile text,target_payment text,target_event text,target_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  if target_payment is null or length(target_payment) not between 1 and 200 or target_event is null or length(target_event) not between 1 and 200
    then raise exception 'INVALID_PAYMENT'; end if;
  -- Holds can arrive before the completed-sale event. Never erase them on replay.
  insert into public.paypal_sandbox_payment_holds(merchant_profile,payment_id,event_key,reason)
    values(target_profile,target_payment,target_event,target_reason) on conflict do nothing;
  return true;
end $$;

create or replace function public.paypal_sandbox_entitlement(target_checkout uuid,target_profile text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object('active',true,'plan',c.plan,'paidUntil',p.paid_until,'reason','paid') into result
    from public.paypal_sandbox_periods p join public.paypal_sandbox_checkouts c on c.id=p.checkout_id
    where c.id=target_checkout and c.merchant_profile=target_profile and p.merchant_profile=target_profile
      and p.paid_from<=now() and p.paid_until>now()
      and not exists(select 1 from public.paypal_sandbox_payment_holds h where h.merchant_profile=p.merchant_profile and h.payment_id=p.payment_id)
    order by p.paid_until desc limit 1;
  return coalesce(result,jsonb_build_object('active',false,'plan','free','paidUntil',null,'reason',
    case when exists(select 1 from public.paypal_sandbox_periods p join public.paypal_sandbox_payment_holds h using(merchant_profile,payment_id)
      where p.checkout_id=target_checkout and p.merchant_profile=target_profile and p.paid_until>now())
      then 'payment_review' else 'no_current_paid_period' end));
end $$;
revoke all on function public.paypal_sandbox_confirm_period(uuid,text,text,timestamptz,timestamptz),public.paypal_sandbox_hold_payment(text,text,text,text),public.paypal_sandbox_entitlement(uuid,text) from public,anon,authenticated;
grant execute on function public.paypal_sandbox_confirm_period(uuid,text,text,timestamptz,timestamptz),public.paypal_sandbox_hold_payment(text,text,text,text),public.paypal_sandbox_entitlement(uuid,text) to service_role;
commit;
