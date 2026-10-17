-- Stage in a separate Supabase project before production. Does not change financial data.
begin;

create table if not exists public.commercial_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.commercial_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro','family')),
  status text not null default 'free' check (status in ('free','trialing','active','past_due','canceled')),
  trial_ends_at timestamptz,
  paid_until timestamptz,
  updated_at timestamptz not null default now(),
  check (status <> 'trialing' or trial_ends_at is not null),
  check (status not in ('active','past_due','canceled') or paid_until is not null)
);
create table if not exists public.commercial_audit (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_key text not null unique,
  event_type text not null,
  plan text not null,
  status text not null,
  created_at timestamptz not null default now()
);
alter table public.commercial_admins enable row level security;
alter table public.commercial_subscriptions enable row level security;
alter table public.commercial_audit enable row level security;
revoke all on public.commercial_admins, public.commercial_subscriptions, public.commercial_audit from public, anon, authenticated;

-- Existing accounts remain free; trials are NOT restarted by this migration.
insert into public.commercial_subscriptions(user_id) select id from auth.users on conflict do nothing;

create or replace function public.commercial_new_account()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.commercial_subscriptions(user_id,plan,status,trial_ends_at)
  values (new.id,'pro','trialing',new.created_at + interval '3 days') on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists nekuma_commercial_signup on auth.users;
create trigger nekuma_commercial_signup after insert on auth.users for each row execute function public.commercial_new_account();

create or replace function public.commercial_effective_plan(target_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select case
    when s.status = 'trialing' and s.trial_ends_at > now() then s.plan
    when s.status in ('active','past_due','canceled') and s.paid_until > now() then s.plan
    else 'free' end from public.commercial_subscriptions s where s.user_id=target_user),'free');
$$;

create or replace function public.commercial_plan_catalog()
returns jsonb language sql immutable set search_path = '' as $$
select '{
 "free":{"priceJPY":0,"accounts":1,"incomeSources":1,"budgetCategories":2,"activeGoals":1,"scansMonthly":0,"members":1,"charts":["monthly_comparison"],"features":["manual_transactions","manual_crypto","export"]},
 "pro":{"priceJPY":480,"accounts":null,"incomeSources":null,"budgetCategories":null,"activeGoals":null,"scansMonthly":30,"members":1,"charts":["monthly_comparison","individual","salary_projection"],"features":["manual_transactions","manual_crypto","export","salary_projection","receipt_scan","automation","projections","cards","wealth","metamask","binance"]},
 "family":{"priceJPY":850,"accounts":null,"incomeSources":null,"budgetCategories":null,"activeGoals":null,"scansMonthly":60,"members":5,"charts":["monthly_comparison","individual","salary_projection","family_xray"],"features":["manual_transactions","manual_crypto","export","salary_projection","receipt_scan","automation","projections","cards","wealth","metamask","binance","family_sharing","family_xray","shared_housing"]}
}'::jsonb;
$$;

create or replace function public.my_commercial_access()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.commercial_subscriptions; effective text; sponsor uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into s from public.commercial_subscriptions where user_id=auth.uid();
  effective := public.commercial_effective_plan(auth.uid());
  -- Only a household owner can sponsor a family, not any member with a subscription.
  select owner.user_id into sponsor from public.household_members member
    join public.household_members owner on owner.household_id=member.household_id and owner.role='owner'
    where member.user_id=auth.uid() and public.commercial_effective_plan(owner.user_id)='family'
    and (select count(*) from public.household_members hm where hm.household_id=member.household_id)<=5
    order by owner.created_at, owner.user_id limit 1;
  if sponsor is not null then effective := 'family'; end if;
  return jsonb_build_object('plan',effective,'subscriptionPlan',coalesce(s.plan,'free'),
    'status',coalesce(s.status,'free'),'trialEndsAt',s.trial_ends_at,'paidUntil',s.paid_until,
    'familySponsored',sponsor is not null and sponsor<>auth.uid(),
    'limits',public.commercial_plan_catalog()->effective,'catalog',public.commercial_plan_catalog(),
    'enforcementActive',false,
    'isAdmin',exists(select 1 from public.commercial_admins where user_id=auth.uid()));
end;
$$;

-- Service-role only: future verified webhooks call this, never the browser or checkout return URL.
create or replace function public.apply_commercial_event(
  target_user uuid, event_id text, next_plan text, next_status text,
  access_until timestamptz default null
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'Server only' using errcode='42501'; end if;
  if event_id is null or length(event_id) not between 1 and 200 then raise exception 'Invalid event'; end if;
  if next_plan is null or next_plan not in ('free','pro','family') or next_status is null or next_status not in ('free','active','past_due','canceled') then raise exception 'Invalid subscription'; end if;
  if next_status<>'free' and access_until is null then raise exception 'Access expiry required'; end if;
  -- Serialize per user; duplicate deliveries must not apply twice.
  perform 1 from auth.users where id=target_user for update;
  if not found then raise exception 'User not found'; end if;
  insert into public.commercial_audit(user_id,event_key,event_type,plan,status)
    values(target_user,event_id,'subscription_update',next_plan,next_status) on conflict(event_key) do nothing;
  if not found then return false; end if;
  insert into public.commercial_subscriptions(user_id,plan,status,paid_until)
    values(target_user,next_plan,next_status,access_until)
    on conflict(user_id) do update set plan=excluded.plan,status=excluded.status,
      paid_until=excluded.paid_until,updated_at=now();
  return true;
end;
$$;

create or replace function public.commercial_admin_overview(page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.commercial_admins where user_id=auth.uid()) then
    raise exception 'Administrator required' using errcode='42501';
  end if;
  if coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'MFA required' using errcode='42501'; end if;
  if page_number is null or page_number<0 or page_number>100000 then raise exception 'Invalid page'; end if;
  select jsonb_build_object(
    'users',(select count(*) from auth.users),
    'paid',(select count(*) from public.commercial_subscriptions where status in ('active','past_due','canceled') and paid_until>now() and plan<>'free'),
    'trials',(select count(*) from public.commercial_subscriptions where status='trialing' and trial_ends_at>now()),
    'households',(select count(*) from public.households),
    'financialStateBytes',(select coalesce(sum(pg_column_size(state)),0) from public.app_states),
    'billingConnected',false,
    'rows',coalesce((select jsonb_agg(row_data) from (
      select u.id,u.email,u.created_at,u.last_sign_in_at,public.commercial_effective_plan(u.id) as plan,
        coalesce(s.status,'free') as status,s.paid_until,s.trial_ends_at
      from auth.users u left join public.commercial_subscriptions s on s.user_id=u.id
      order by u.created_at desc,u.id limit 50 offset page_number*50
    ) row_data),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.commercial_new_account(), public.commercial_effective_plan(uuid),
  public.commercial_plan_catalog(), public.my_commercial_access(),
  public.apply_commercial_event(uuid,text,text,text,timestamptz), public.commercial_admin_overview(integer)
  from public, anon, authenticated;
grant execute on function public.my_commercial_access(),public.commercial_admin_overview(integer) to authenticated;
grant execute on function public.apply_commercial_event(uuid,text,text,text,timestamptz) to service_role;
commit;
