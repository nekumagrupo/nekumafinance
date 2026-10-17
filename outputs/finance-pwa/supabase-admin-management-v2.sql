-- Requires supabase-commercial-v1.sql. Validate in staging first.
begin;
alter table public.commercial_audit add column if not exists actor_id uuid references auth.users(id) on delete set null;
alter table public.commercial_audit add column if not exists reason text;
alter table public.commercial_audit add column if not exists before_data jsonb;
alter table public.commercial_audit add column if not exists after_data jsonb;
create index if not exists commercial_audit_user_time on public.commercial_audit(user_id,created_at desc);

-- Manual access is separate from payment history: granting PRO is not a sale.
create table if not exists public.commercial_access_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check(plan in ('free','pro','family')),
  valid_until timestamptz,
  reason text not null check(length(trim(reason)) between 5 and 500),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check(plan='free' or valid_until is not null)
);
alter table public.commercial_access_overrides enable row level security;
revoke all on public.commercial_access_overrides from public,anon,authenticated;

create or replace function public.require_commercial_admin()
returns void language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.commercial_admins where user_id=auth.uid()) then
    raise exception 'Administrator required' using errcode='42501';
  end if;
  if coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'MFA required' using errcode='42501'; end if;
end;
$$;

create or replace function public.commercial_effective_plan(target_user uuid)
returns text language sql stable security definer set search_path='' as $$
  select coalesce(
    (select o.plan from public.commercial_access_overrides o where o.user_id=target_user and (o.valid_until is null or o.valid_until>now())),
    (select case when s.status='trialing' and s.trial_ends_at>now() then s.plan
      when s.status in ('active','past_due','canceled') and s.paid_until>now() then s.plan
      else 'free' end from public.commercial_subscriptions s where s.user_id=target_user),'free');
$$;

create or replace function public.commercial_admin_overview(page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  perform public.require_commercial_admin();
  if page_number is null or page_number<0 or page_number>100000 then raise exception 'Invalid page'; end if;
  return jsonb_build_object(
    'users',(select count(*) from auth.users),
    'paid',(select count(*) from public.commercial_subscriptions where status in ('active','past_due','canceled') and paid_until>now() and plan<>'free'),
    'trials',(select count(*) from public.commercial_subscriptions where status='trialing' and trial_ends_at>now()),
    'households',(select count(*) from public.households),
    'financialStateBytes',(select coalesce(sum(pg_column_size(state)),0) from public.app_states),
    'billingConnected',false,
    'rows',coalesce((select jsonb_agg(r) from (
      select u.id,u.email,coalesce(u.raw_user_meta_data->>'display_name',u.raw_user_meta_data->>'name',u.raw_user_meta_data->>'full_name','') as display_name,
        u.created_at,u.last_sign_in_at,public.commercial_effective_plan(u.id) as plan,
        coalesce(s.status,'free') as status,s.paid_until,s.trial_ends_at,
        o.plan as override_plan,o.valid_until as override_until,
        exists(select 1 from public.commercial_admins a where a.user_id=u.id) as is_admin,
        (select coalesce(sum(pg_column_size(st.state)),0) from public.app_states st
          where exists(select 1 from public.household_members m where m.household_id=st.household_id and m.user_id=u.id)) as shared_state_bytes,
        (select count(*) from public.household_members m where m.user_id=u.id) as household_count
      from auth.users u left join public.commercial_subscriptions s on s.user_id=u.id
      left join public.commercial_access_overrides o on o.user_id=u.id and (o.valid_until is null or o.valid_until>now())
      order by u.created_at desc,u.id limit 50 offset page_number*50
    ) r),'[]'::jsonb));
end;
$$;

create or replace function public.commercial_admin_edit_user(
  target_user uuid, display_name text, access_mode text, manual_plan text,
  valid_until timestamptz, change_reason text, expected_version text
) returns void language plpgsql security definer set search_path='' as $$
declare old_name text; old_override jsonb; snapshot text;
begin
  perform public.require_commercial_admin();
  if display_name is null or length(trim(display_name)) not between 1 and 100 or display_name ~ '[[:cntrl:]]' then raise exception 'Invalid name'; end if;
  if change_reason is null or length(trim(change_reason)) not between 5 and 500 then raise exception 'Reason required'; end if;
  if access_mode is null or access_mode not in ('keep','manual','automatic') then raise exception 'Invalid mode'; end if;
  if access_mode='manual' and (manual_plan is null or manual_plan not in ('free','pro','family')) then raise exception 'Invalid plan'; end if;
  if access_mode='manual' and manual_plan<>'free' and (valid_until is null or valid_until<=now() or valid_until>now()+interval '5 years') then raise exception 'Invalid expiry'; end if;
  if access_mode='manual' and manual_plan='free' and valid_until is not null and valid_until<=now() then raise exception 'Invalid expiry'; end if;
  perform 1 from auth.users where id=target_user for update;
  if not found then raise exception 'User not found'; end if;
  select coalesce(raw_user_meta_data->>'display_name',raw_user_meta_data->>'name',raw_user_meta_data->>'full_name','') into old_name from auth.users where id=target_user;
  select to_jsonb(o) into old_override from public.commercial_access_overrides o where o.user_id=target_user;
  snapshot:=md5(jsonb_build_object('name',old_name,'override',old_override)::text);
  if expected_version is null or expected_version<>snapshot then raise exception 'User changed. Refresh before editing.' using errcode='40001'; end if;
  update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('display_name',trim(display_name),'name',trim(display_name)),updated_at=now() where id=target_user;
  if access_mode='manual' then
    insert into public.commercial_access_overrides(user_id,plan,valid_until,reason,updated_by)
    values(target_user,manual_plan,valid_until,trim(change_reason),auth.uid())
    on conflict(user_id) do update set plan=excluded.plan,valid_until=excluded.valid_until,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=now();
  elsif access_mode='automatic' then
    delete from public.commercial_access_overrides where user_id=target_user;
  end if;
  insert into public.commercial_audit(user_id,actor_id,event_key,event_type,plan,status,reason,before_data,after_data)
  values(target_user,auth.uid(),'admin:'||gen_random_uuid()::text,'admin_user_edit',public.commercial_effective_plan(target_user),'manual_edit',trim(change_reason),
    jsonb_build_object('name',old_name,'override',old_override),
    jsonb_build_object('name',trim(display_name),'override',(select to_jsonb(o) from public.commercial_access_overrides o where o.user_id=target_user)));
end;
$$;

create or replace function public.commercial_admin_user_detail(target_user uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare username text; overrides jsonb;
begin
  perform public.require_commercial_admin();
  select coalesce(raw_user_meta_data->>'display_name',raw_user_meta_data->>'name',raw_user_meta_data->>'full_name','') into username from auth.users where id=target_user;
  if not found then raise exception 'User not found'; end if;
  select to_jsonb(o) into overrides from public.commercial_access_overrides o where o.user_id=target_user;
  return jsonb_build_object('version',md5(jsonb_build_object('name',username,'override',overrides)::text),'name',username,'override',overrides,
    'audit',coalesce((select jsonb_agg(r) from (select event_type,created_at,actor_id,reason,plan,status from public.commercial_audit where user_id=target_user order by created_at desc,id desc limit 20)r),'[]'::jsonb));
end;
$$;

-- Logs an authorization/request, NOT proof of email delivery. No password is read.
create or replace function public.commercial_admin_recovery_target(target_user uuid)
returns text language plpgsql security definer set search_path='' as $$
declare target_email text;
begin
  perform public.require_commercial_admin();
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,268));
  if exists(select 1 from public.commercial_audit where actor_id=auth.uid() and event_type='recovery_requested' and created_at>now()-interval '60 seconds') then raise exception 'Wait before requesting another recovery'; end if;
  select email into target_email from auth.users where id=target_user;
  if target_email is null or target_email='' then raise exception 'User email unavailable'; end if;
  insert into public.commercial_audit(user_id,actor_id,event_key,event_type,plan,status)
    values(target_user,auth.uid(),'recovery:'||gen_random_uuid()::text,'recovery_requested',public.commercial_effective_plan(target_user),'requested');
  return target_email;
end;
$$;

revoke all on function public.require_commercial_admin(), public.commercial_admin_edit_user(uuid,text,text,text,timestamptz,text,text),public.commercial_admin_user_detail(uuid),public.commercial_admin_recovery_target(uuid) from public,anon,authenticated;
grant execute on function public.commercial_admin_edit_user(uuid,text,text,text,timestamptz,text,text),public.commercial_admin_user_detail(uuid),public.commercial_admin_recovery_target(uuid) to authenticated;
commit;
