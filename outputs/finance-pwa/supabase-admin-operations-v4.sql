-- Requires commercial v1, admin v2, family v3. Never merges duplicate accounts.
begin;
create table if not exists public.commercial_account_controls(
  user_id uuid primary key references auth.users(id) on delete cascade,
  blocked boolean not null default false,reason text not null,
  updated_by uuid references auth.users(id) on delete set null,updated_at timestamptz not null default now()
);
create table if not exists public.commercial_email_keys(
  user_id uuid primary key references auth.users(id) on delete cascade,
  normalized_email text not null unique
);
alter table public.commercial_account_controls enable row level security;
alter table public.commercial_email_keys enable row level security;
revoke all on public.commercial_account_controls,public.commercial_email_keys from public,anon,authenticated;
insert into public.commercial_email_keys(user_id,normalized_email)
select id,lower(trim(email)) from auth.users where nullif(trim(email),'') is not null
on conflict(user_id) do update set normalized_email=excluded.normalized_email;

create or replace function public.guard_commercial_email()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if nullif(trim(new.email),'') is null then delete from public.commercial_email_keys where user_id=new.id;
  else insert into public.commercial_email_keys(user_id,normalized_email) values(new.id,lower(trim(new.email)))
    on conflict(user_id) do update set normalized_email=excluded.normalized_email; end if;
  return new;
end;
$$;
drop trigger if exists guard_commercial_email on auth.users;
create trigger guard_commercial_email after insert or update of email on auth.users for each row execute function public.guard_commercial_email();

create or replace function public.commercial_account_active()
returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and exists(select 1 from auth.users where id=auth.uid())
 and not exists(select 1 from public.commercial_account_controls where user_id=auth.uid() and blocked);
$$;
-- Restrictive policies also cover existing direct table/API write paths.
do $$ declare t record; begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity and
    (c.relname='households' or exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='household_id' and not a.attisdropped))
  loop
    execute format('drop policy if exists commercial_active_account on public.%I',t.relname);
    execute format('create policy commercial_active_account on public.%I as restrictive for all to authenticated using (public.commercial_account_active()) with check (public.commercial_account_active())',t.relname);
  end loop;
end; $$;
-- Preserve reviewed v3 behavior behind private wrappers, including definer RPCs.
create or replace function public.guard_blocked_account_mutation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not public.commercial_account_active() then raise exception 'Conta bloqueada' using errcode='42501'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;
drop trigger if exists guard_blocked_account_mutation on public.households;
create trigger guard_blocked_account_mutation before insert or update or delete on public.households for each row execute function public.guard_blocked_account_mutation();
drop trigger if exists guard_blocked_account_mutation on public.household_members;
create trigger guard_blocked_account_mutation before insert or update or delete on public.household_members for each row execute function public.guard_blocked_account_mutation();
drop trigger if exists guard_blocked_account_mutation on public.app_states;
create trigger guard_blocked_account_mutation before insert or update or delete on public.app_states for each row execute function public.guard_blocked_account_mutation();
do $$ begin
  if to_regprocedure('public.commercial_ensure_workspace_v3(text)') is null then
    alter function public.ensure_default_household(text) rename to commercial_ensure_workspace_v3;
    alter function public.my_commercial_access() rename to commercial_access_v3;
  end if;
end; $$;
create or replace function public.ensure_default_household(household_name text default 'Familia')
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not public.commercial_account_active() then raise exception 'Conta bloqueada ou sessao invalida' using errcode='42501'; end if;
 return public.commercial_ensure_workspace_v3(household_name);
end; $$;
create or replace function public.is_household_member(target_household_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
select public.commercial_account_active() and exists(select 1 from public.household_members m
 where m.household_id=target_household_id and m.user_id=auth.uid()
 and (m.role='owner' or public.paid_family_active(target_household_id)));
$$;
create or replace function public.my_commercial_access()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.commercial_account_active() then return jsonb_build_object('blocked',true); end if;
 return public.commercial_access_v3()||jsonb_build_object('blocked',false);
end; $$;

create or replace function public.commercial_admin_set_block(target_user uuid,should_block boolean,change_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare previous boolean;
begin
 perform public.require_commercial_admin();
 if not public.commercial_account_active() then raise exception 'Blocked administrator' using errcode='42501'; end if;
 if target_user=auth.uid() or exists(select 1 from public.commercial_admins where user_id=target_user) then raise exception 'Protected administrator' using errcode='42501'; end if;
 if should_block is null or change_reason is null or length(trim(change_reason)) not between 5 and 500 then raise exception 'Reason required'; end if;
 perform 1 from auth.users where id=target_user for update;
 if not found then raise exception 'User not found'; end if;
 select blocked into previous from public.commercial_account_controls where user_id=target_user;
 insert into public.commercial_account_controls(user_id,blocked,reason,updated_by)
 values(target_user,should_block,trim(change_reason),auth.uid()) on conflict(user_id) do update
 set blocked=excluded.blocked,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=now();
 insert into public.commercial_audit(user_id,actor_id,event_key,event_type,reason,plan,status,before_data,after_data)
 values(target_user,auth.uid(),'block:'||gen_random_uuid(),case when should_block then 'account_blocked' else 'account_unblocked' end,
 trim(change_reason),public.commercial_effective_plan(target_user),case when should_block then 'blocked' else 'unblocked' end,
 jsonb_build_object('blocked',coalesce(previous,false)),jsonb_build_object('blocked',should_block));
end; $$;

create or replace view public.commercial_admin_user_rows as
with basic as (
 select u.id,u.email,u.created_at,u.last_sign_in_at,
 coalesce(u.raw_user_meta_data->>'display_name',u.raw_user_meta_data->>'name',u.raw_user_meta_data->>'full_name','') as display_name,
 length(coalesce(u.encrypted_password,''))>0 as has_password,
 public.commercial_effective_plan(u.id) as personal_plan,
 coalesce(c.blocked,false) as blocked,exists(select 1 from public.commercial_admins where user_id=u.id) as is_admin,
 coalesce(s.status,'free') as status,o.plan as override_plan,
 case when o.user_id is not null and (o.valid_until is null or o.valid_until>now()) then o.valid_until
 when s.status='trialing' and s.trial_ends_at>now() then s.trial_ends_at
 when s.status in ('active','past_due','canceled') and s.paid_until>now() then s.paid_until
 else greatest(o.valid_until,s.trial_ends_at,s.paid_until) end as personal_expires_at,
 exists(select 1 from public.commercial_access_overrides x where x.user_id=u.id and (x.valid_until is null or x.valid_until>now())) as manual_active,
 exists(select 1 from public.household_members m where m.user_id=u.id and public.paid_family_active(m.household_id)) as sponsored,
 (select max(case when ov.plan='family' and ov.valid_until>now() then ov.valid_until
   when sub.status='trialing' then sub.trial_ends_at else sub.paid_until end)
  from public.household_members guest join public.household_members own on own.household_id=guest.household_id and own.role='owner'
  left join public.commercial_access_overrides ov on ov.user_id=own.user_id
  left join public.commercial_subscriptions sub on sub.user_id=own.user_id
  where guest.user_id=u.id and public.paid_family_active(guest.household_id)
    and public.commercial_effective_plan(own.user_id)='family') as sponsor_expires_at,
 (select count(distinct other.user_id) from public.household_members own join public.household_members other
 on other.household_id=own.household_id and other.user_id<>own.user_id where own.user_id=u.id and own.role='owner') as family_linked,
 exists(select 1 from public.household_members m where m.user_id=u.id and m.role<>'owner' and public.paid_family_active(m.household_id)) as family_member
 from auth.users u left join public.commercial_subscriptions s on s.user_id=u.id
 left join public.commercial_access_overrides o on o.user_id=u.id
 left join public.commercial_account_controls c on c.user_id=u.id
), resolved as (
 select *,case when sponsored then 'family' else personal_plan end as plan,
 case when sponsored and personal_plan<>'family' then sponsor_expires_at else personal_expires_at end as expires_at,
 status='trialing' and personal_expires_at>now() and not manual_active and not sponsored as in_trial,
 personal_expires_at<=now() and personal_plan='free' and not sponsored and not manual_active as expired
 from basic
) select *,case when in_trial then 'trialing' else plan end as display_status from resolved;
revoke all on public.commercial_admin_user_rows from public,anon,authenticated;
create or replace function public.commercial_admin_overview(page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare total_bytes bigint;
begin
 perform public.require_commercial_admin();
 if not public.commercial_account_active() then raise exception 'Blocked administrator' using errcode='42501'; end if;
 if page_number is null or page_number<0 or page_number>100000 then raise exception 'Invalid page'; end if;
 begin select pg_database_size(current_database()) into total_bytes; exception when others then total_bytes:=null; end;
 return jsonb_build_object('users',(select count(*) from public.commercial_admin_user_rows),
 'active',(select count(*) from public.commercial_admin_user_rows where not blocked and not coalesce(expired,false) and not coalesce(in_trial,false)),
 'expired',(select count(*) from public.commercial_admin_user_rows where not blocked and expired),
 'blocked',(select count(*) from public.commercial_admin_user_rows where blocked),
 'trials',(select count(*) from public.commercial_admin_user_rows where not blocked and in_trial),
 'databaseBytes',total_bytes,'billingConnected',false,
 'rows',coalesce((select jsonb_agg(r) from (select * from public.commercial_admin_user_rows order by created_at desc,id limit 50 offset page_number*50)r),'[]'::jsonb));
end; $$;

-- The deletion trigger treats these two lifecycle tables as non-financial data.
create or replace function public.cleanup_commercial_lifecycle()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.commercial_email_keys where user_id=old.id;
 delete from public.commercial_account_controls where user_id=old.id;
 update public.commercial_account_controls set updated_by=null where updated_by=old.id;
 return old;
end; $$;
drop trigger if exists aaa_cleanup_commercial_lifecycle on auth.users;
create trigger aaa_cleanup_commercial_lifecycle before delete on auth.users for each row execute function public.cleanup_commercial_lifecycle();
revoke all on function public.guard_commercial_email(),public.cleanup_commercial_lifecycle(),public.commercial_ensure_workspace_v3(text),
 public.commercial_access_v3(),public.commercial_account_active(),public.ensure_default_household(text),
 public.is_household_member(uuid),public.my_commercial_access(),public.commercial_admin_set_block(uuid,boolean,text),public.commercial_admin_overview(integer)
 from public,anon,authenticated;
revoke all on function public.guard_blocked_account_mutation() from public,anon,authenticated;
grant execute on function public.commercial_account_active(),public.ensure_default_household(text),public.is_household_member(uuid),
 public.my_commercial_access(),public.commercial_admin_set_block(uuid,boolean,text),public.commercial_admin_overview(integer) to authenticated;
commit;
