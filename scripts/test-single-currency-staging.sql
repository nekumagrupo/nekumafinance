-- Run only in a disposable staging database after v20 and v21.
begin;
insert into auth.users(id,email,created_at) values
  ('00000000-0000-4000-8000-000000000322','single-v21@example.invalid',now());
insert into public.households(id,name) values ('10000000-0000-4000-8000-000000000322','Single staging');
insert into public.household_members(household_id,user_id,role) values
  ('10000000-0000-4000-8000-000000000322','00000000-0000-4000-8000-000000000322','owner');
insert into public.app_states(household_id,state) values ('10000000-0000-4000-8000-000000000322',
  '{"settings":{"baseCurrency":"BRL"},"transactions":[{"id":"jp-existing","currency":"JPY","amount":500}]}');

do $$
declare h uuid := '10000000-0000-4000-8000-000000000322';
begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000322","role":"authenticated"}',true);
  if public.my_commercial_access()->>'plan' <> 'free' then raise exception 'FAIL test user must be Single'; end if;
  update public.app_states set state=jsonb_set(state,'{transactions}',state->'transactions'||'[{"id":"br-new","currency":"BRL","amount":15}]'::jsonb) where household_id=h;
  if not exists(select 1 from public.app_states where household_id=h and state#>>'{transactions,0,amount}'='500') then raise exception 'FAIL foreign history lost'; end if;
  begin
    update public.app_states set state=jsonb_set(state,'{transactions}',state->'transactions'||'[{"id":"jp-new","currency":"JPY"}]'::jsonb) where household_id=h;
    raise exception 'FAIL foreign insert';
  exception when insufficient_privilege then if sqlerrm not like 'PLAN_CURRENCY:%' then raise; end if; end;
  begin
    update public.app_states set state=jsonb_set(state,'{transactions,0,currency}','"BRL"') where household_id=h;
    raise exception 'FAIL foreign relabel';
  exception when insufficient_privilege then if sqlerrm not like 'PLAN_CURRENCY:%' then raise; end if; end;
  begin
    update public.app_states set state=state||'{"housingCards":[{"id":"home","currency":"BRL","items":[{"currency":"JPY"}]}]}'::jsonb where household_id=h;
    raise exception 'FAIL mixed housing';
  exception when insufficient_privilege then if sqlerrm not like 'PLAN_CURRENCY:%' then raise; end if; end;
  update public.commercial_subscriptions set plan='pro',status='active',paid_until=now()+interval '1 day' where user_id=auth.uid();
  update public.app_states set state=jsonb_set(state,'{transactions}',state->'transactions'||'[{"id":"jp-pro","currency":"JPY"}]'::jsonb) where household_id=h;
end;
$$;
rollback;
