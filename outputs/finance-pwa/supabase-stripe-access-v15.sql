-- Opt-in Stripe TEST entitlements. Manual ADMIN overrides remain authoritative.
begin;
alter table public.stripe_test_checkouts add column if not exists subscription_id text unique;
create table if not exists public.stripe_test_access_testers (
 user_id uuid primary key references auth.users(id) on delete cascade, enabled boolean not null default false
);
create table if not exists public.stripe_test_periods (
 invoice_id text primary key, checkout_id uuid not null references public.stripe_test_checkouts(id),
 charge_id text not null, paid_from timestamptz not null, paid_until timestamptz not null,
 check(paid_until>paid_from and paid_until<=paid_from+interval '32 days')
);
create table if not exists public.stripe_test_holds (
 charge_id text primary key, reason text not null check(reason in ('refund','dispute')),
 event_id text not null, created_at timestamptz not null default now()
);
alter table public.stripe_test_access_testers enable row level security;
alter table public.stripe_test_periods enable row level security;
alter table public.stripe_test_holds enable row level security;
revoke all on public.stripe_test_access_testers,public.stripe_test_periods,public.stripe_test_holds from public,anon,authenticated;

create or replace function public.stripe_test_lookup(target_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 return(select to_jsonb(c) from public.stripe_test_checkouts c
 join public.stripe_test_access_testers t on t.user_id=c.user_id and t.enabled where c.user_id=target_user);
end $$;

create or replace function public.stripe_test_record(target_checkout uuid,target_event text,target_kind text,target_subscription text,effect jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare owner_id uuid; changed integer; previous_plan text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 select c.user_id into owner_id from public.stripe_test_checkouts c
 join public.stripe_test_access_testers t on t.user_id=c.user_id and t.enabled
 where c.id=target_checkout for update of c;
 if owner_id is null or target_event is null or target_event !~ '^evt_[A-Za-z0-9]+$'
 or target_subscription is null or target_subscription !~ '^sub_[A-Za-z0-9]+$' then raise exception 'INVALID_EVENT'; end if;
 previous_plan:=public.commercial_effective_plan(owner_id);
 update public.stripe_test_checkouts set subscription_id=target_subscription where id=target_checkout
 and(subscription_id is null or subscription_id=target_subscription);
 if not found then raise exception 'BINDING_CONFLICT'; end if;
 insert into public.stripe_test_events(event_id,checkout_id,event_kind) values(target_event,target_checkout,target_kind) on conflict do nothing;
 get diagnostics changed=row_count;
 if changed=0 then return false; end if;
 if effect->>'action' in ('paid','hold') then
  if effect->>'charge' is null or effect->>'charge' !~ '^ch_[A-Za-z0-9]+$' then raise exception 'INVALID_CHARGE'; end if;
 end if;
 if effect->>'action'='paid' then
  if effect->>'invoice' is null or effect->>'invoice' !~ '^in_[A-Za-z0-9]+$'
    or effect->>'from' is null or effect->>'until' is null
    or (effect->>'from')::timestamptz>now()+interval '5 minutes' then raise exception 'INVALID_PERIOD'; end if;
  insert into public.stripe_test_periods(invoice_id,checkout_id,charge_id,paid_from,paid_until)
   values(effect->>'invoice',target_checkout,effect->>'charge',(effect->>'from')::timestamptz,(effect->>'until')::timestamptz) on conflict do nothing;
 elsif effect->>'action'='hold' then
  insert into public.stripe_test_holds(charge_id,reason,event_id) values(effect->>'charge',effect->>'reason',target_event) on conflict do nothing;
 elsif effect->>'action' is distinct from 'state' then raise exception 'INVALID_ACTION'; end if;
 if previous_plan is distinct from 'pro' and public.commercial_effective_plan(owner_id)='pro' then
  insert into public.commercial_notifications(user_id,plan) values(owner_id,'pro');
 end if;
 return true;
end $$;

create or replace function public.stripe_test_entitlement(target_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 return jsonb_build_object('active',exists(select 1 from public.stripe_test_checkouts c
  join public.stripe_test_access_testers t on t.user_id=c.user_id and t.enabled
  join public.stripe_test_periods p on p.checkout_id=c.id where c.user_id=target_user
  and p.paid_from<=now() and p.paid_until>now() and not exists(select 1 from public.stripe_test_holds h where h.charge_id=p.charge_id)),
  'paidUntil',(select max(p.paid_until) from public.stripe_test_periods p join public.stripe_test_checkouts c on c.id=p.checkout_id where c.user_id=target_user));
end $$;

do $$ begin
 if to_regprocedure('public.commercial_effective_plan_before_stripe_v15(uuid)') is null then
  alter function public.commercial_effective_plan(uuid) rename to commercial_effective_plan_before_stripe_v15;
 end if;
end $$;
create or replace function public.commercial_effective_plan(target_user uuid)
returns text language sql stable security definer set search_path='' as $$
 select coalesce(
  (select o.plan from public.commercial_access_overrides o where o.user_id=target_user and(o.valid_until is null or o.valid_until>now())),
  (select case when exists(select 1 from public.stripe_test_checkouts c join public.stripe_test_periods p on p.checkout_id=c.id
   where c.user_id=t.user_id and p.paid_from<=now() and p.paid_until>now()
   and not exists(select 1 from public.stripe_test_holds h where h.charge_id=p.charge_id)) then 'pro' else 'free' end
   from public.stripe_test_access_testers t where t.user_id=target_user and t.enabled),
  public.commercial_effective_plan_before_stripe_v15(target_user));
$$;
revoke all on function public.stripe_test_lookup(uuid),public.stripe_test_record(uuid,text,text,text,jsonb),public.stripe_test_entitlement(uuid),public.commercial_effective_plan_before_stripe_v15(uuid),public.commercial_effective_plan(uuid) from public,anon,authenticated;
grant execute on function public.stripe_test_lookup(uuid),public.stripe_test_record(uuid,text,text,text,jsonb),public.stripe_test_entitlement(uuid) to service_role;
insert into public.stripe_test_access_testers(user_id,enabled) select id,true from auth.users
 where id='569ccf01-6360-479e-8117-28dcdfba2335' and lower(email)='nekumagrupo@gmail.com'
 on conflict(user_id) do update set enabled=true;
commit;
