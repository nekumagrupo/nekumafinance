-- Requires v1-v4. Preserves existing records; no automatic deletions/downgrades.
begin;
create or replace function public.commercial_user_plan(target_user uuid)
returns text language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from public.household_members m where m.user_id=target_user and public.paid_family_active(m.household_id))
 then 'family' else public.commercial_effective_plan(target_user) end;
$$;
create or replace function public.commercial_resource_rows(document jsonb,resource text)
returns setof jsonb language plpgsql immutable set search_path='' as $$
declare rows jsonb:=coalesce(document->resource,'[]'::jsonb);
begin
 if jsonb_typeof(rows)<>'array' then raise exception 'Invalid resource array: %',resource using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(rows) e where jsonb_typeof(e)<>'object' or jsonb_typeof(e->'id') is distinct from 'string' or length(e->>'id') not between 1 and 200)
 or (select count(*) from jsonb_array_elements(rows))<>(select count(distinct e->>'id') from jsonb_array_elements(rows)e)
 then raise exception 'Invalid or duplicate resource IDs: %',resource using errcode='22023'; end if;
 return query select * from jsonb_array_elements(rows);
end; $$;

create or replace function public.guard_commercial_plan_state()
returns trigger language plpgsql security definer set search_path='' as $$
declare previous jsonb:='{}'; plan text; resource text; feature text; cap integer; total integer; other_total integer;
 item jsonb; period text;
begin
 if auth.uid() is null then return new; end if; -- Trusted maintenance/imports only.
 if not public.commercial_account_active() or not public.is_household_writer(new.household_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
 if tg_op='UPDATE' then previous:=old.state; end if;
 if jsonb_typeof(new.state)<>'object' then raise exception 'Invalid app state'; end if;
 -- Across workspaces: concurrent writes by the same user cannot exceed a quota.
 perform 1 from auth.users where id=auth.uid() for update;
 plan:=public.commercial_user_plan(auth.uid());
 foreach resource in array array['bankAccounts','incomeSources','financialGoals','categoryBudgets'] loop
   if (new.state->resource) is not distinct from (previous->resource) then continue; end if;
   perform public.commercial_resource_rows(new.state,resource);
   if plan<>'free' then continue; end if;
   cap:=case when resource='categoryBudgets' then 2 else 1 end;
   for item in select * from public.commercial_resource_rows(new.state,resource) loop
     -- Only goals have a plan quota based on active rather than registered rows.
     if resource='financialGoals' and item->'active'='false'::jsonb then continue; end if;
     if resource='categoryBudgets' and coalesce(item->>'month','')!~'^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid budget month'; end if;
     if exists(select 1 from public.commercial_resource_rows(previous,resource) e where e->>'id'=item->>'id'
       and (resource<>'financialGoals' or e->'active' is distinct from 'false'::jsonb)
       and (resource<>'categoryBudgets' or e->>'month'=item->>'month')) then continue; end if;
     period:=item->>'month';
     select count(*) into total from public.commercial_resource_rows(new.state,resource)e
       where (resource<>'financialGoals' or e->'active' is distinct from 'false'::jsonb)
       and (resource<>'categoryBudgets' or e->>'month'=period);
     select count(*) into other_total from public.app_states st
       join public.household_members m on m.household_id=st.household_id and m.user_id=auth.uid() and m.role='owner'
       cross join lateral public.commercial_resource_rows(st.state,resource)e
       where st.household_id<>new.household_id
       and (resource<>'financialGoals' or e->'active' is distinct from 'false'::jsonb)
       and (resource<>'categoryBudgets' or e->>'month'=period);
     if total+other_total>cap then raise exception 'PLAN_LIMIT: % (limite %)',resource,cap using errcode='42501'; end if;
   end loop;
 end loop;
 if plan='free' then
   -- Legacy premium records remain readable/exportable/deletable, but not editable.
   foreach resource in array array['creditCards','cardPurchases','investments','debts','nubankBoxes','nubankBoxContributions','categorizationRules','projectionScenarios','receipts'] loop
     if (new.state->resource) is not distinct from (previous->resource) then continue; end if;
     for item in select * from public.commercial_resource_rows(new.state,resource) loop
       if not exists(select 1 from public.commercial_resource_rows(previous,resource)e where e=item) then
         raise exception 'PLAN_FEATURE: % requer PRO',resource using errcode='42501';
       end if;
     end loop;
   end loop;
   if nullif(new.state#>>'{web3Wallet,address}','') is not null or jsonb_array_length(coalesce(new.state#>'{web3Wallet,wallets}','[]'))>0 then
     if new.state->'web3Wallet' is distinct from previous->'web3Wallet' then raise exception 'PLAN_FEATURE: metamask requer PRO' using errcode='42501'; end if;
   end if;
 end if;
 return new;
end; $$;
drop trigger if exists guard_commercial_plan_state on public.app_states;
create trigger guard_commercial_plan_state before insert or update on public.app_states for each row execute function public.guard_commercial_plan_state();

create table if not exists public.commercial_monthly_usage(
 pool_id uuid not null references auth.users(id) on delete cascade,
 period date not null,feature text not null check(feature='receipt_scan'),used integer not null default 0 check(used>=0),
 primary key(pool_id,period,feature)
);
alter table public.commercial_monthly_usage enable row level security;
revoke all on public.commercial_monthly_usage from public,anon,authenticated;
create or replace function public.commercial_scan_pool()
returns uuid language sql stable security definer set search_path='' as $$
 select coalesce((select own.user_id from public.household_members m join public.household_members own
 on own.household_id=m.household_id and own.role='owner' where m.user_id=auth.uid()
 and public.paid_family_active(m.household_id) and public.commercial_effective_plan(own.user_id)='family'
 order by own.created_at,own.user_id limit 1),auth.uid());
$$;
create or replace function public.reserve_commercial_scan(target_household uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare plan text; cap integer; pool uuid; period_start date:=date_trunc('month',now() at time zone 'Asia/Tokyo')::date; count_used integer;
begin
 if not public.commercial_account_active() then raise exception 'Acesso negado' using errcode='42501'; end if;
 plan:=public.commercial_user_plan(auth.uid());
 cap:=(public.commercial_plan_catalog()->plan->>'scansMonthly')::integer;
 if cap<=0 then raise exception 'PLAN_FEATURE: receipt_scan requer PRO' using errcode='42501'; end if;
 if target_household is not null and not public.is_household_writer(target_household) then raise exception 'Sem permissao nesta familia' using errcode='42501'; end if;
 pool:=public.commercial_scan_pool();
 insert into public.commercial_monthly_usage(pool_id,period,feature) values(pool,period_start,'receipt_scan') on conflict do nothing;
 update public.commercial_monthly_usage set used=used+1 where pool_id=pool and period=period_start and feature='receipt_scan' and used<cap returning used into count_used;
 if count_used is null then raise exception 'SCAN_LIMIT: limite mensal atingido' using errcode='P0001'; end if;
 return jsonb_build_object('used',count_used,'limit',cap,'period',period_start,'shared',plan='family');
end; $$;
create or replace function public.my_commercial_access()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare access jsonb; scans integer;
begin
 if not public.commercial_account_active() then return jsonb_build_object('blocked',true); end if;
 access:=public.commercial_access_v3();
 select used into scans from public.commercial_monthly_usage where pool_id=public.commercial_scan_pool()
 and period=date_trunc('month',now() at time zone 'Asia/Tokyo')::date and feature='receipt_scan';
 return access||jsonb_build_object('blocked',false,'enforcementActive',true,'scansUsed',coalesce(scans,0),'usageTimezone','Asia/Tokyo');
end; $$;
-- Remove usage lifecycle rows before the existing conservative financial FK guard.
create or replace function public.cleanup_commercial_usage()
returns trigger language plpgsql security definer set search_path='' as $$
begin delete from public.commercial_monthly_usage where pool_id=old.id; return old; end; $$;
drop trigger if exists aaa_cleanup_commercial_usage on auth.users;
create trigger aaa_cleanup_commercial_usage before delete on auth.users for each row execute function public.cleanup_commercial_usage();
revoke all on function public.commercial_user_plan(uuid),public.commercial_resource_rows(jsonb,text),public.guard_commercial_plan_state(),
 public.commercial_scan_pool(),public.reserve_commercial_scan(uuid),public.cleanup_commercial_usage() from public,anon,authenticated;
grant execute on function public.reserve_commercial_scan(uuid) to authenticated;
commit;
