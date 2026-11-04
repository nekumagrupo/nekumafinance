-- LIVE ledger only. Applying this migration does not enable sales.
begin;
create table public.stripe_live_settings(id boolean primary key default true check(id), enabled boolean not null default false);
insert into public.stripe_live_settings values(true,false);
create table public.stripe_live_checkouts(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 session_id text unique check(session_id ~ '^cs_live_[A-Za-z0-9]+$'),
 subscription_id text unique check(subscription_id ~ '^sub_[A-Za-z0-9]+$'),
 customer_id text, state text not null default 'reserved',
 closed boolean not null default false, created_at timestamptz not null default now()
);
create unique index stripe_live_one_open on public.stripe_live_checkouts(user_id) where not closed;
create table public.stripe_live_events(event_id text primary key, checkout_id uuid not null references public.stripe_live_checkouts(id), kind text not null, received_at timestamptz not null default now());
create table public.stripe_live_periods(invoice_id text primary key, checkout_id uuid not null references public.stripe_live_checkouts(id), charge_id text not null unique,
 paid_from timestamptz not null, paid_until timestamptz not null,
 check(paid_until>paid_from and paid_until<=paid_from+interval '32 days'));
create table public.stripe_live_holds(charge_id text primary key, reason text not null check(reason in('refund','dispute')), event_id text not null, created_at timestamptz not null default now());
alter table public.stripe_live_settings enable row level security;
alter table public.stripe_live_checkouts enable row level security;
alter table public.stripe_live_events enable row level security;
alter table public.stripe_live_periods enable row level security;
alter table public.stripe_live_holds enable row level security;
revoke all on public.stripe_live_settings,public.stripe_live_checkouts,public.stripe_live_events,public.stripe_live_periods,public.stripe_live_holds from public,anon,authenticated;

create function public.stripe_live_reserve(target_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if not(select enabled from public.stripe_live_settings where id) then raise exception 'LIVE_DISABLED'; end if;
 if not exists(select 1 from auth.users where id=target_user) then raise exception 'INVALID_USER'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_user::text,18));
 insert into public.stripe_live_checkouts(user_id) values(target_user) on conflict(user_id) where not closed do nothing;
 select to_jsonb(c) into result from public.stripe_live_checkouts c where user_id=target_user and not closed;
 return result;
end $$;
create function public.stripe_live_bind(target_checkout uuid,target_session text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if target_session is null or target_session !~ '^cs_live_[A-Za-z0-9]+$' then raise exception 'INVALID_SESSION'; end if;
 update public.stripe_live_checkouts set session_id=target_session where id=target_checkout and not closed and(session_id is null or session_id=target_session);
 if not found then raise exception 'BINDING_CONFLICT'; end if;
 return true;
end $$;
create function public.stripe_live_lookup(target_user uuid,target_subscription text default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 return(select to_jsonb(c) from public.stripe_live_checkouts c where user_id=target_user
 and(target_subscription is null or subscription_id=target_subscription or subscription_id is null)
 order by created_at desc limit 1);
end $$;
create function public.stripe_live_entitlement(target_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 return jsonb_build_object('active',exists(select 1 from public.stripe_live_periods p join public.stripe_live_checkouts c on c.id=p.checkout_id
 where c.user_id=target_user and p.paid_from<=now() and p.paid_until>now() and not exists(select 1 from public.stripe_live_holds h where h.charge_id=p.charge_id)),
 'paidUntil',(select max(p.paid_until) from public.stripe_live_periods p join public.stripe_live_checkouts c on c.id=p.checkout_id
 where c.user_id=target_user and not exists(select 1 from public.stripe_live_holds h where h.charge_id=p.charge_id)));
end $$;
create function public.stripe_live_record(target_checkout uuid,target_event text,target_kind text,target_subscription text,effect jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare owner_id uuid; previous_plan text; inserted integer; existing public.stripe_live_periods;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 select user_id into owner_id from public.stripe_live_checkouts where id=target_checkout for update;
 if owner_id is null or target_event is null or target_event !~ '^evt_[A-Za-z0-9]+$'
 or target_subscription is null or target_subscription !~ '^sub_[A-Za-z0-9]+$' then raise exception 'INVALID_EVENT'; end if;
 previous_plan:=public.commercial_effective_plan(owner_id);
 update public.stripe_live_checkouts set subscription_id=target_subscription where id=target_checkout and(subscription_id is null or subscription_id=target_subscription);
 if not found then raise exception 'BINDING_CONFLICT'; end if;
 insert into public.stripe_live_events values(target_event,target_checkout,target_kind,now()) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then
  if not exists(select 1 from public.stripe_live_events where event_id=target_event and checkout_id=target_checkout and kind=target_kind) then raise exception 'EVENT_CONFLICT'; end if;
  return false;
 end if;
 if effect->>'action' in('paid','hold') and(coalesce(effect->>'charge','') !~ '^ch_[A-Za-z0-9]+$') then raise exception 'INVALID_CHARGE'; end if;
 if effect->>'action'='paid' then
  if coalesce(effect->>'invoice','') !~ '^in_[A-Za-z0-9]+$' or effect->>'from' is null or effect->>'until' is null
   or (effect->>'from')::timestamptz>now()+interval '5 minutes' then raise exception 'INVALID_PERIOD'; end if;
  select * into existing from public.stripe_live_periods where invoice_id=effect->>'invoice';
  if found and(existing.checkout_id<>target_checkout or existing.charge_id<>effect->>'charge'
   or existing.paid_from<>(effect->>'from')::timestamptz or existing.paid_until<>(effect->>'until')::timestamptz) then raise exception 'PERIOD_CONFLICT'; end if;
  insert into public.stripe_live_periods values(effect->>'invoice',target_checkout,effect->>'charge',(effect->>'from')::timestamptz,(effect->>'until')::timestamptz) on conflict(invoice_id) do nothing;
 elsif effect->>'action'='hold' then
  insert into public.stripe_live_holds(charge_id,reason,event_id) values(effect->>'charge',effect->>'reason',target_event) on conflict do nothing;
 elsif effect->>'action' is distinct from 'state' then raise exception 'INVALID_ACTION'; end if;
 if previous_plan<>'pro' and public.commercial_effective_plan(owner_id)='pro' then insert into public.commercial_notifications(user_id,plan) values(owner_id,'pro'); end if;
 return true;
end $$;
-- Closing an expired session must never close a paid subscription.
create function public.stripe_live_close(target_checkout uuid,target_session text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 update public.stripe_live_checkouts set closed=true,state='expired' where id=target_checkout and session_id=target_session and subscription_id is null;
 return found;
end $$;

alter function public.commercial_effective_plan(uuid) rename to commercial_effective_plan_before_live_v18;
create function public.commercial_effective_plan(target_user uuid) returns text language plpgsql stable security definer set search_path='' as $$
declare base text:=public.commercial_effective_plan_before_live_v18(target_user);
begin
 if exists(select 1 from public.commercial_access_overrides o where o.user_id=target_user and(o.valid_until is null or o.valid_until>now())) then return base; end if;
 if exists(select 1 from public.stripe_live_periods p join public.stripe_live_checkouts c on c.id=p.checkout_id
  where c.user_id=target_user and p.paid_from<=now() and p.paid_until>now()
  and not exists(select 1 from public.stripe_live_holds h where h.charge_id=p.charge_id)) then
  if base='family' then return base; end if;
  return 'pro';
 end if;
 return base;
end $$;
revoke all on function public.commercial_effective_plan_before_live_v18(uuid),public.commercial_effective_plan(uuid) from public,anon,authenticated;
revoke all on function public.stripe_live_reserve(uuid),public.stripe_live_bind(uuid,text),public.stripe_live_lookup(uuid,text),public.stripe_live_entitlement(uuid),public.stripe_live_record(uuid,text,text,text,jsonb),public.stripe_live_close(uuid,text) from public,anon,authenticated;
grant execute on function public.stripe_live_reserve(uuid),public.stripe_live_bind(uuid,text),public.stripe_live_lookup(uuid,text),public.stripe_live_entitlement(uuid),public.stripe_live_record(uuid,text,text,text,jsonb),public.stripe_live_close(uuid,text) to service_role;
commit;
