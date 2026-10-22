-- Requires v6-v10. Only Sandbox; preserves every historical binding and receipt.
begin;
alter table public.paypal_sandbox_checkouts add column if not exists archived_at timestamptz;
drop index if exists public.paypal_sandbox_checkouts_user_profile_key;
create unique index if not exists paypal_sandbox_current_checkout_key
 on public.paypal_sandbox_checkouts(user_id,merchant_profile) where archived_at is null;

create or replace function public.paypal_sandbox_reserve_profile(target_user uuid,target_plan text,target_profile text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if target_profile is null or target_profile not in ('legacy','jp') or target_plan is null or target_plan not in ('pro','family') then raise exception 'INVALID_CHECKOUT'; end if;
 perform 1 from auth.users where id=target_user for update;
 if not found then raise exception 'INVALID_CHECKOUT'; end if;
 insert into public.paypal_sandbox_checkouts(user_id,plan,merchant_profile) values(target_user,target_plan,target_profile)
 on conflict(user_id,merchant_profile) where archived_at is null do nothing;
 return (select to_jsonb(c) from public.paypal_sandbox_checkouts c where c.user_id=target_user and c.merchant_profile=target_profile and c.archived_at is null);
end $$;

create or replace function public.paypal_sandbox_restart(target_user uuid,target_checkout uuid,target_profile text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_checkout public.paypal_sandbox_checkouts; entitlement jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if target_profile is null or target_profile not in ('legacy','jp') then raise exception 'INVALID_PROFILE'; end if;
 perform 1 from auth.users where id=target_user for update;
 if not found then raise exception 'INVALID_CHECKOUT'; end if;
 if not exists(select 1 from public.paypal_sandbox_checkouts where id=target_checkout and user_id=target_user and merchant_profile=target_profile) then raise exception 'INVALID_CHECKOUT'; end if;
 select * into current_checkout from public.paypal_sandbox_checkouts where user_id=target_user and merchant_profile=target_profile and archived_at is null for update;
 -- A retry or concurrent request must reuse the new checkout, not archive it again.
 if current_checkout.id is distinct from target_checkout then
   return public.paypal_sandbox_reserve_profile(target_user,'pro',target_profile);
 end if;
 if not exists(select 1 from public.paypal_sandbox_subscription_states where checkout_id=target_checkout and provider_status in ('CANCELLED','EXPIRED')) then raise exception 'SUBSCRIPTION_NOT_ENDED'; end if;
 entitlement:=public.paypal_sandbox_entitlement(target_checkout,target_profile);
 if entitlement->>'active'='true' then raise exception 'PAID_PERIOD_REMAINS'; end if;
 update public.paypal_sandbox_checkouts set archived_at=now() where id=target_checkout;
 return public.paypal_sandbox_reserve_profile(target_user,'pro',target_profile);
end $$;

create or replace function public.paypal_sandbox_customer_status_profile(target_user uuid,target_profile text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if target_profile is null or target_profile not in ('legacy','jp') then raise exception 'INVALID_PROFILE'; end if;
 return (select to_jsonb(c)||jsonb_build_object(
  'confirmed_receipts',(select count(distinct e.payment_id) from public.paypal_sandbox_events e where e.checkout_id=c.id and e.event_kind='PAYMENT.SALE.COMPLETED'),
  'last_confirmed_at',(select max(e.received_at) from public.paypal_sandbox_events e where e.checkout_id=c.id and e.payment_id is not null and e.event_kind='PAYMENT.SALE.COMPLETED'),
  'last_event_at',(select max(e.received_at) from public.paypal_sandbox_events e where e.checkout_id=c.id)
 ) from public.paypal_sandbox_checkouts c where c.user_id=target_user and c.merchant_profile=target_profile and c.archived_at is null);
end $$;

create or replace function public.commercial_effective_plan(target_user uuid)
returns text language sql stable security definer set search_path='' as $$
 select coalesce(
 (select o.plan from public.commercial_access_overrides o where o.user_id=target_user and (o.valid_until is null or o.valid_until>now())),
 (select coalesce((select c.plan from public.paypal_sandbox_checkouts c
   join public.paypal_sandbox_subscription_states s on s.checkout_id=c.id
   join public.paypal_sandbox_periods p on p.checkout_id=c.id and p.merchant_profile=c.merchant_profile
   where c.user_id=t.user_id and c.merchant_profile=t.merchant_profile and c.archived_at is null
   and s.provider_status in ('ACTIVE','CANCELLED') and p.paid_from<=now() and p.paid_until>now()
   and not exists(select 1 from public.paypal_sandbox_payment_holds h where h.merchant_profile=p.merchant_profile and h.payment_id=p.payment_id)
   order by p.paid_until desc limit 1),'free') from public.paypal_sandbox_access_testers t where t.user_id=target_user and t.enabled),
 (select case when s.status='trialing' and s.trial_ends_at>now() then s.plan
   when s.status in ('active','past_due','canceled') and s.paid_until>now() then s.plan else 'free' end
   from public.commercial_subscriptions s where s.user_id=target_user),'free');
$$;
revoke all on function public.paypal_sandbox_restart(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.paypal_sandbox_restart(uuid,uuid,text) to service_role;
commit;
