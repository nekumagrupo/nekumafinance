-- Live guard checks use ONLY a temporary table. No real app state is modified.
begin;
create temporary table plan_layout_guard_check(household_id uuid,state jsonb);
create trigger plan_layout_guard_check before insert or update on plan_layout_guard_check
for each row execute function public.guard_commercial_plan_state();
do $$
declare target uuid; household uuid; denied boolean;
begin
 select m.user_id,m.household_id into target,household
 from public.household_members m
 where m.role='owner' and public.commercial_user_plan(m.user_id)='free'
 limit 1;
 if target is null then raise exception 'No Free owner available for isolated guard test'; end if;
 perform set_config('request.jwt.claim.sub',target::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',target,'role','authenticated','aal','aal1')::text,true);
 if not (public.my_commercial_access()#>'{limits,features}' ? 'cards') then raise exception 'RPC does not expose Free cards'; end if;
 insert into plan_layout_guard_check values(household,'{}');
 update plan_layout_guard_check set state='{"creditCards":[{"id":"test-card","nickname":"First"}]}';
 update plan_layout_guard_check set state=jsonb_set(state,'{creditCards,0,nickname}','"Edited"');
 denied:=false;
 begin
  update plan_layout_guard_check set state=jsonb_set(state,'{creditCards}',state->'creditCards'||'[{"id":"second"}]'::jsonb);
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Second Free card was accepted'; end if;
 denied:=false;
 begin
  update plan_layout_guard_check set state=state||'{"ui":{"dashboardLayouts":{"mobile":["crypto-panel"]}}}'::jsonb;
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Free layout customization was accepted'; end if;
 -- Seed legacy paid records in the TEMP table as trusted maintenance only.
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 update plan_layout_guard_check set state=state||'{"creditCards":[{"id":"test-card"},{"id":"legacy"}],"debts":[{"id":"preserved-debt"}],"ui":{"dashboardLayouts":{"mobile":["crypto-panel"]}}}'::jsonb;
 perform set_config('request.jwt.claim.sub',target::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',target,'role','authenticated','aal','aal1')::text,true);
 update plan_layout_guard_check set state=jsonb_set(state,'{ui,selectedMonth}','"2026-11"');
 denied:=false;
 begin
  update plan_layout_guard_check set state=jsonb_set(state,'{creditCards,1,nickname}','"Locked"');
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Legacy second card edit was accepted'; end if;
 if not (public.commercial_plan_catalog()#>'{free,features}' ? 'cards') then raise exception 'Missing Free card feature'; end if;
 if public.commercial_plan_catalog()#>>'{free,creditCards}'<>'1' then raise exception 'Incorrect Free quota'; end if;
end $$;
select 'PASS: one Free card, quota, fixed layout and downgrade sync; only temporary data used' as validation;
rollback;
