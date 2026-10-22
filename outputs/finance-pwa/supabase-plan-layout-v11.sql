-- Requires v1-v10. Preserve existing records on downgrade; enforce new-card quotas.
begin;
do $$ begin
 if to_regprocedure('public.commercial_plan_catalog_before_v11()') is null then
   alter function public.commercial_plan_catalog() rename to commercial_plan_catalog_before_v11;
 end if;
end $$;
create or replace function public.commercial_plan_catalog()
returns jsonb language sql immutable set search_path='' as $$
 select jsonb_set(jsonb_set(jsonb_set(jsonb_set(public.commercial_plan_catalog_before_v11(),
 '{free,features}', '["manual_transactions","manual_crypto","export","cards"]'),
 '{free,creditCards}', '1'), '{pro,creditCards}', 'null'), '{family,creditCards}', 'null');
$$;

create or replace function public.guard_commercial_plan_state()
returns trigger language plpgsql security definer set search_path='' as $$
declare previous jsonb:='{}'; plan text; resource text; cap integer; total integer; other_total integer;
 item jsonb; period text;
begin
 if auth.uid() is null then return new; end if;
 if not public.commercial_account_active() or not public.is_household_writer(new.household_id) then
   raise exception 'Acesso negado' using errcode='42501';
 end if;
 if tg_op='UPDATE' then previous:=old.state; end if;
 if jsonb_typeof(new.state)<>'object' then raise exception 'Invalid app state'; end if;
 perform 1 from auth.users where id=auth.uid() for update;
 plan:=public.commercial_user_plan(auth.uid());
 foreach resource in array array['bankAccounts','incomeSources','creditCards','financialGoals','categoryBudgets'] loop
   if (new.state->resource) is not distinct from (previous->resource) then continue; end if;
   perform public.commercial_resource_rows(new.state,resource);
   if plan<>'free' then continue; end if;
   cap:=case when resource='categoryBudgets' then 2 else 1 end;
   for item in select * from public.commercial_resource_rows(new.state,resource) loop
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
   if coalesce(new.state#>'{ui,dashboardLayouts}','{}'::jsonb) is distinct from coalesce(previous#>'{ui,dashboardLayouts}','{}'::jsonb) then
     raise exception 'PLAN_FEATURE: organizacao dos cards requer PRO' using errcode='42501';
   end if;
   foreach resource in array array['financialGoals','categoryBudgets','investments','debts','nubankBoxes','nubankBoxContributions','categorizationRules','projectionScenarios','receipts'] loop
     if (new.state->resource) is not distinct from (previous->resource) then continue; end if;
     for item in select * from public.commercial_resource_rows(new.state,resource) loop
       if not exists(select 1 from public.commercial_resource_rows(previous,resource)e where e=item) then
         raise exception 'PLAN_FEATURE: % requer PRO',resource using errcode='42501';
       end if;
     end loop;
   end loop;
   -- Only the first registered card remains writable after a downgrade.
   for item in select * from public.commercial_resource_rows(new.state,'creditCards') loop
     if item->>'id' is distinct from new.state#>>'{creditCards,0,id}' and not exists(
       select 1 from public.commercial_resource_rows(previous,'creditCards')e where e=item) then
       raise exception 'PLAN_LIMIT: cartao adicional requer PRO' using errcode='42501';
     end if;
   end loop;
   for item in select * from public.commercial_resource_rows(new.state,'cardPurchases') loop
     if exists(select 1 from public.commercial_resource_rows(previous,'cardPurchases')e where e=item) then continue; end if;
     if item->>'cardId' is distinct from new.state#>>'{creditCards,0,id}' then
       raise exception 'PLAN_LIMIT: cartao adicional requer PRO' using errcode='42501';
     end if;
   end loop;
   if nullif(new.state#>>'{web3Wallet,address}','') is not null or jsonb_array_length(coalesce(new.state#>'{web3Wallet,wallets}','[]'))>0 then
     if new.state->'web3Wallet' is distinct from previous->'web3Wallet' then raise exception 'PLAN_FEATURE: metamask requer PRO' using errcode='42501'; end if;
   end if;
 end if;
 return new;
end; $$;
revoke all on function public.commercial_plan_catalog_before_v11(),public.guard_commercial_plan_state() from public,anon,authenticated;
commit;
