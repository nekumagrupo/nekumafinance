-- Requires commercial v1, admin v2 and the existing household schema.
-- Validate on staging before production. Existing financial records are retained.
begin;
alter table public.households alter column invite_code drop not null;
alter table public.households alter column invite_code drop default;
revoke insert,update,delete on public.households,public.household_members from authenticated,anon;

create or replace function public.paid_family_active(target_household uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.household_members m where m.household_id=target_household
    and m.role='owner' and public.commercial_effective_plan(m.user_id)='family')
    and (select count(*) from public.household_members where household_id=target_household)<=5;
$$;

create or replace function public.paid_family_invite(target_household uuid)
returns text language plpgsql security definer set search_path='' as $$
declare result text;
begin
  if auth.uid() is null or public.commercial_effective_plan(auth.uid())<>'family'
    or not exists(select 1 from public.household_members where household_id=target_household and user_id=auth.uid() and role='owner')
    then raise exception 'Paid family owner required' using errcode='42501'; end if;
  perform 1 from public.households where id=target_household for update;
  select invite_code into result from public.households where id=target_household;
  if result is null then
    result:=upper(replace(gen_random_uuid()::text,'-',''));
    update public.households set invite_code=result where id=target_household;
  end if;
  return result;
end;
$$;

create or replace function public.configure_paid_family(target_household uuid,family_name text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or public.commercial_effective_plan(auth.uid())<>'family'
    or not exists(select 1 from public.household_members where household_id=target_household and user_id=auth.uid() and role='owner')
    then raise exception 'Paid family owner required' using errcode='42501'; end if;
  if family_name is null or length(trim(family_name)) not between 1 and 100 then raise exception 'Invalid family name'; end if;
  update public.households set name=trim(family_name) where id=target_household;
end;
$$;

create or replace function public.join_household_by_code(join_code text)
returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select id into target from public.households where invite_code=upper(trim(join_code)) for update;
  if target is null or not public.paid_family_active(target) then raise exception 'Convite invalido ou plano Familia inativo'; end if;
  if exists(select 1 from public.household_members where household_id=target and user_id=auth.uid()) then return target; end if;
  if (select count(*) from public.household_members where household_id=target)>=5 then raise exception 'Limite de 5 membros atingido'; end if;
  insert into public.household_members(household_id,user_id,role) values(target,auth.uid(),'viewer');
  return target;
end;
$$;

-- Owners retain their own workspace, even after downgrade. Sharing needs Family.
create or replace function public.is_household_member(target_household_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.household_members m
    where m.household_id=target_household_id and m.user_id=auth.uid()
    and (m.role='owner' or public.paid_family_active(target_household_id)));
$$;
create or replace function public.is_household_writer(target_household_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select public.is_household_member(target_household_id) and exists(select 1 from public.household_members
    where household_id=target_household_id and user_id=auth.uid() and role in ('owner','admin','editor','member'));
$$;
create or replace function public.ensure_default_household(household_name text default 'Familia')
returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  -- Serialize personal workspace creation for concurrent first logins.
  perform 1 from auth.users where id=auth.uid() for update;
  select m.household_id into target from public.household_members m where m.user_id=auth.uid()
    and public.is_household_member(m.household_id) order by m.created_at,m.household_id limit 1;
  if target is null then
    insert into public.households(name) values(coalesce(nullif(trim(household_name),''),'Familia')) returning id into target;
    insert into public.household_members(household_id,user_id,role) values(target,auth.uid(),'owner');
  end if;
  return target;
end;
$$;
create or replace function public.guard_family_state_changes()
returns trigger language plpgsql security definer set search_path='' as $$
declare previous jsonb:='{}'::jsonb; key text;
begin
  if auth.uid() is null then return new; end if;
  if public.paid_family_active(new.household_id) then return new; end if;
  if tg_op='UPDATE' then previous:=coalesce(old.state,'{}'::jsonb); end if;
  foreach key in array array['familyMembers','familyBusinesses'] loop
    if coalesce(new.state->key,'[]'::jsonb) is distinct from coalesce(previous->key,'[]'::jsonb) then
      raise exception 'Plano Familia necessario para alterar membros e negocios familiares' using errcode='42501';
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists guard_family_state_changes on public.app_states;
create trigger guard_family_state_changes before insert or update on public.app_states for each row execute function public.guard_family_state_changes();
create or replace function public.update_household_member_role(target_household_id uuid,target_user_id uuid,new_role text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or public.commercial_effective_plan(auth.uid())<>'family' or not exists(
    select 1 from public.household_members where household_id=target_household_id and user_id=auth.uid() and role='owner')
    then raise exception 'Paid family owner required' using errcode='42501'; end if;
  if new_role is null or new_role not in ('admin','editor','viewer') or target_user_id=auth.uid() then raise exception 'Invalid role'; end if;
  update public.household_members set role=new_role where household_id=target_household_id and user_id=target_user_id and role<>'owner';
  if not found then raise exception 'Protected or missing member'; end if;
end;
$$;

create table if not exists public.commercial_notifications(
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check(plan in ('pro','family')),created_at timestamptz not null default now()
);
alter table public.commercial_notifications enable row level security;
revoke all on public.commercial_notifications from public,anon,authenticated;
create or replace function public.notify_commercial_upgrade()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.plan not in ('pro','family') or public.commercial_effective_plan(new.user_id)<>new.plan then return new; end if;
  if tg_table_name='commercial_subscriptions' then
    if new.status<>'active' or new.paid_until<=now() or new.paid_until is null then return new; end if;
    if tg_op='UPDATE' then
      if old.plan=new.plan and old.status='active' and old.paid_until>now() then return new; end if;
    end if;
  else
    if tg_op='UPDATE' then
      if old.plan=new.plan and (old.valid_until is null or old.valid_until>now()) then return new; end if;
    end if;
  end if;
  insert into public.commercial_notifications(user_id,plan) values(new.user_id,new.plan);
  return new;
end;
$$;
drop trigger if exists commercial_upgrade_notice on public.commercial_subscriptions;
create trigger commercial_upgrade_notice after insert or update on public.commercial_subscriptions for each row execute function public.notify_commercial_upgrade();
drop trigger if exists commercial_override_notice on public.commercial_access_overrides;
create trigger commercial_override_notice after insert or update on public.commercial_access_overrides for each row execute function public.notify_commercial_upgrade();
create or replace function public.my_commercial_notifications()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(n) from (select id,plan,created_at from public.commercial_notifications where user_id=auth.uid() order by created_at desc limit 50)n),'[]'::jsonb);
end;
$$;

create or replace function public.my_commercial_access()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.commercial_subscriptions; personal text; effective text; families jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into s from public.commercial_subscriptions where user_id=auth.uid();
  personal:=public.commercial_effective_plan(auth.uid()); effective:=personal;
  select coalesce(jsonb_agg(m.household_id),'[]'::jsonb) into families from public.household_members m
    where m.user_id=auth.uid() and public.paid_family_active(m.household_id);
  if jsonb_array_length(families)>0 then effective:='family'; end if;
  return jsonb_build_object('plan',effective,'personalPlan',personal,'subscriptionPlan',coalesce(s.plan,'free'),
    'status',coalesce(s.status,'free'),'trialEndsAt',s.trial_ends_at,'paidUntil',s.paid_until,
    'familySponsored',personal<>'family' and effective='family','familyHouseholdIds',families,
    'familyEnforcementActive',true,'enforcementActive',false,
    'limits',public.commercial_plan_catalog()->effective,'catalog',public.commercial_plan_catalog(),
    'isAdmin',exists(select 1 from public.commercial_admins where user_id=auth.uid()));
end;
$$;

-- Defense in depth against races and unreviewed financial FK cascades.
create or replace function public.protect_financial_user_deletion()
returns trigger language plpgsql security definer set search_path='' as $$
declare ref record; linked boolean;
begin
  if exists(select 1 from public.commercial_admins where user_id=old.id) then raise exception 'Administrator deletion blocked'; end if;
  perform h.id from public.households h where exists(select 1 from public.household_members m
    where m.household_id=h.id and m.user_id=old.id and m.role='owner') order by h.id for update;
  if exists(select 1 from public.household_members own where own.user_id=old.id and own.role='owner'
    and exists(select 1 from public.household_members other where other.household_id=own.household_id and other.user_id<>old.id)) then
    raise exception 'Transfer shared workspace ownership before deletion';
  end if;
  -- Auth DELETE and private-workspace cleanup share one database transaction.
  -- Any FK/storage/guard failure rolls back the entire operation.
  delete from public.households h where exists(select 1 from public.household_members m
    where m.household_id=h.id and m.user_id=old.id and m.role='owner');
  for ref in select c.conrelid::regclass as relation,a.attname as column_name from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid=c.conrelid join pg_catalog.pg_namespace n on n.oid=t.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey)
    where c.contype='f' and c.confrelid='auth.users'::regclass and n.nspname='public'
    and t.relname not in ('household_members','commercial_subscriptions','commercial_access_overrides','commercial_audit','commercial_notifications')
  loop
    execute format('select exists(select 1 from %s where %I=$1)',ref.relation,ref.column_name) into linked using old.id;
    if linked then raise exception 'Linked data requires a reviewed retention/deletion process'; end if;
  end loop;
  return old;
end;
$$;
drop trigger if exists protect_financial_user_deletion on auth.users;
create trigger protect_financial_user_deletion before delete on auth.users for each row execute function public.protect_financial_user_deletion();

create or replace function public.commercial_admin_authorize_delete(target_user uuid,confirmation_email text,change_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare event_id uuid:=gen_random_uuid(); actual_email text;
begin
  perform public.require_commercial_admin();
  if target_user=auth.uid() or exists(select 1 from public.commercial_admins where user_id=target_user) then raise exception 'Administrator deletion blocked' using errcode='42501'; end if;
  select email into actual_email from auth.users where id=target_user for update;
  if actual_email is null or confirmation_email is distinct from actual_email then raise exception 'Confirmation mismatch'; end if;
  if change_reason is null or length(trim(change_reason)) not between 5 and 500 then raise exception 'Reason required'; end if;
  if exists(select 1 from public.household_members own where own.user_id=target_user and own.role='owner'
    and exists(select 1 from public.household_members other where other.household_id=own.household_id and other.user_id<>target_user))
    then raise exception 'Transfer shared household ownership before deletion'; end if;
  insert into public.commercial_audit(user_id,actor_id,event_key,event_type,reason,plan,status)
    values(target_user,auth.uid(),'delete:'||event_id,'account_deletion_requested',trim(change_reason),public.commercial_effective_plan(target_user),'requested');
  return event_id;
end;
$$;

revoke all on function public.paid_family_active(uuid),public.paid_family_invite(uuid),public.configure_paid_family(uuid,text),
  public.join_household_by_code(text),public.is_household_member(uuid),public.is_household_writer(uuid),
  public.update_household_member_role(uuid,uuid,text),public.notify_commercial_upgrade(),public.my_commercial_notifications(),
  public.commercial_admin_authorize_delete(uuid,text,text) from public,anon,authenticated;
revoke all on function public.protect_financial_user_deletion() from public,anon,authenticated;
revoke all on function public.guard_family_state_changes() from public,anon,authenticated;
revoke all on function public.ensure_default_household(text) from public,anon,authenticated;
grant execute on function public.ensure_default_household(text) to authenticated;
grant execute on function public.paid_family_invite(uuid),public.configure_paid_family(uuid,text),public.join_household_by_code(text),
  public.is_household_member(uuid),public.is_household_writer(uuid),public.update_household_member_role(uuid,uuid,text),
  public.my_commercial_notifications(),public.commercial_admin_authorize_delete(uuid,text,text) to authenticated;
grant select,update on public.commercial_audit to service_role;
commit;
