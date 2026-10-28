-- Isolated, opt-in TEST cycles. Audit records are never removed.
begin;
alter table public.stripe_test_checkouts add column if not exists retired_at timestamptz;
alter table public.stripe_test_checkouts add column if not exists clock_id text unique;
alter table public.stripe_test_checkouts add column if not exists clock_time timestamptz;
alter table public.stripe_test_checkouts add column if not exists customer_id text unique;
alter table public.stripe_test_checkouts drop constraint if exists stripe_test_checkouts_user_id_key;
create unique index if not exists stripe_test_current_user on public.stripe_test_checkouts(user_id) where retired_at is null;

create or replace function public.stripe_test_reserve(target_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if not exists(select 1 from public.stripe_test_access_testers where user_id=target_user and enabled) then raise exception 'INVALID_TESTER'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_user::text,16));
 insert into public.stripe_test_checkouts(user_id) values(target_user) on conflict(user_id) where retired_at is null do nothing;
 return(select to_jsonb(c) from public.stripe_test_checkouts c where user_id=target_user and retired_at is null);
end $$;

create or replace function public.stripe_test_checkout_time(target_checkout uuid)
returns timestamptz language sql stable security definer set search_path='' as $$
 select case when clock_id is not null then clock_time else now() end from public.stripe_test_checkouts where id=target_checkout;
$$;

create or replace function public.stripe_test_lookup_subscription(target_user uuid,target_subscription text)
returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 return(select to_jsonb(c) from public.stripe_test_checkouts c
 join public.stripe_test_access_testers t on t.user_id=c.user_id and t.enabled
 where c.user_id=target_user and (c.subscription_id=target_subscription or(c.subscription_id is null and c.retired_at is null))
 order by (c.subscription_id=target_subscription) desc nulls last limit 1);
end $$;

create or replace function public.stripe_test_clock_bind(target_checkout uuid,target_clock text,target_customer text,target_time timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$ begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if target_clock is null or target_clock !~ '^clock_[A-Za-z0-9]+$' or target_customer is null or target_customer !~ '^cus_[A-Za-z0-9]+$'
 or target_time is null then raise exception 'INVALID_CLOCK'; end if;
 update public.stripe_test_checkouts c set clock_id=target_clock,customer_id=target_customer,clock_time=target_time
 where c.id=target_checkout and (c.retired_at is null or c.clock_id=target_clock) and (c.clock_id is null or c.clock_id=target_clock)
 and(c.customer_id is null or c.customer_id=target_customer) and(c.clock_time is null or c.clock_time<=target_time)
 and exists(select 1 from public.stripe_test_access_testers t where t.user_id=c.user_id and t.enabled);
 if not found then raise exception 'CLOCK_BINDING_CONFLICT'; end if;
 return true;
end $$;

create or replace function public.stripe_test_entitlement(target_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 return jsonb_build_object('active',exists(select 1 from public.stripe_test_checkouts c
 join public.stripe_test_access_testers t on t.user_id=c.user_id and t.enabled
 join public.stripe_test_periods p on p.checkout_id=c.id where c.user_id=target_user and c.retired_at is null
 and p.paid_from<=public.stripe_test_checkout_time(c.id) and p.paid_until>public.stripe_test_checkout_time(c.id)
 and not exists(select 1 from public.stripe_test_holds h where h.charge_id=p.charge_id)),
 'paidUntil',(select max(p.paid_until) from public.stripe_test_periods p join public.stripe_test_checkouts c on c.id=p.checkout_id where c.user_id=target_user and c.retired_at is null));
end $$;

create or replace function public.stripe_test_restart(target_user uuid,target_checkout uuid)
returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_user::text,16));
 if (public.stripe_test_entitlement(target_user)->>'active')::boolean then raise exception 'PAID_PERIOD_ACTIVE'; end if;
 update public.stripe_test_checkouts set retired_at=now() where id=target_checkout and user_id=target_user and retired_at is null;
 if not found then raise exception 'CYCLE_CONFLICT'; end if;
 return public.stripe_test_reserve(target_user);
end $$;

create or replace function public.stripe_test_lookup(target_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 return(select to_jsonb(c) from public.stripe_test_checkouts c join public.stripe_test_access_testers t on t.user_id=c.user_id and t.enabled
 where c.user_id=target_user and c.retired_at is null);
end $$;

create or replace function public.stripe_test_record(target_checkout uuid,target_event text,target_kind text,target_subscription text,effect jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare owner_id uuid; changed integer; previous_plan text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 select c.user_id into owner_id from public.stripe_test_checkouts c join public.stripe_test_access_testers t on t.user_id=c.user_id and t.enabled
 where c.id=target_checkout for update of c;
 if owner_id is null or target_event is null or target_event !~ '^evt_[A-Za-z0-9]+$'
 or target_subscription is null or target_subscription !~ '^sub_[A-Za-z0-9]+$' then raise exception 'INVALID_EVENT'; end if;
 previous_plan:=public.commercial_effective_plan(owner_id);
 update public.stripe_test_checkouts set subscription_id=target_subscription where id=target_checkout and(subscription_id is null or subscription_id=target_subscription);
 if not found then raise exception 'BINDING_CONFLICT'; end if;
 insert into public.stripe_test_events(event_id,checkout_id,event_kind) values(target_event,target_checkout,target_kind) on conflict do nothing;
 get diagnostics changed=row_count;
 if changed=0 then return false; end if;
 if effect->>'action' in ('paid','hold') and (effect->>'charge' is null or effect->>'charge' !~ '^ch_[A-Za-z0-9]+$') then raise exception 'INVALID_CHARGE'; end if;
 if effect->>'action'='paid' then
  if effect->>'invoice' is null or effect->>'invoice' !~ '^in_[A-Za-z0-9]+$' or effect->>'from' is null or effect->>'until' is null
   or (effect->>'from')::timestamptz>public.stripe_test_checkout_time(target_checkout)+interval '5 minutes' then raise exception 'INVALID_PERIOD'; end if;
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

create or replace function public.commercial_effective_plan(target_user uuid)
returns text language sql stable security definer set search_path='' as $$
 select coalesce((select o.plan from public.commercial_access_overrides o where o.user_id=target_user and(o.valid_until is null or o.valid_until>now())),
 (select case when exists(select 1 from public.stripe_test_checkouts c join public.stripe_test_periods p on p.checkout_id=c.id
 where c.user_id=t.user_id and c.retired_at is null and p.paid_from<=public.stripe_test_checkout_time(c.id)
 and p.paid_until>public.stripe_test_checkout_time(c.id) and not exists(select 1 from public.stripe_test_holds h where h.charge_id=p.charge_id)) then 'pro' else 'free' end
 from public.stripe_test_access_testers t where t.user_id=target_user and t.enabled),public.commercial_effective_plan_before_stripe_v15(target_user));
$$;
revoke all on function public.stripe_test_checkout_time(uuid),public.stripe_test_lookup_subscription(uuid,text),public.stripe_test_clock_bind(uuid,text,text,timestamptz),public.stripe_test_restart(uuid,uuid) from public,anon,authenticated;
grant execute on function public.stripe_test_lookup_subscription(uuid,text),public.stripe_test_clock_bind(uuid,text,text,timestamptz),public.stripe_test_restart(uuid,uuid) to service_role;
commit;
