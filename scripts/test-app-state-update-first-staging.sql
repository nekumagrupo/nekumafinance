-- Run only in a disposable database after v22.
begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000324','single-save@example.invalid'),
 ('00000000-0000-4000-8000-000000000325','outside-save@example.invalid');
insert into public.households(id,name) values
 ('10000000-0000-4000-8000-000000000324','Existing Single'),
 ('10000000-0000-4000-8000-000000000325','First save');
insert into public.household_members(household_id,user_id,role) values
 ('10000000-0000-4000-8000-000000000324','00000000-0000-4000-8000-000000000324','owner'),
 ('10000000-0000-4000-8000-000000000325','00000000-0000-4000-8000-000000000325','owner');
insert into public.app_states(household_id,state) values
 ('10000000-0000-4000-8000-000000000324',
  '{"settings":{"baseCurrency":"JPY"},"bankAccounts":[{"id":"jp-bank","currency":"JPY"},{"id":"br-bank","currency":"BRL"}],"transactions":[{"id":"br-old","currency":"BRL","bankAccountId":"br-bank","amount":650}]}');

do $$
declare h uuid := '10000000-0000-4000-8000-000000000324';
        empty_h uuid := '10000000-0000-4000-8000-000000000325';
        before_save jsonb; next_state jsonb;
begin
  select state into before_save from public.app_states where household_id=h;
  next_state := jsonb_set(before_save,'{transactions}',before_save->'transactions'||
    '[{"id":"jp-new","currency":"JPY","bankAccountId":"jp-bank","amount":800}]'::jsonb);
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000324","role":"authenticated"}',true);
  if public.commercial_user_plan(auth.uid()) <> 'free' then raise exception 'Expected Single'; end if;
  begin
    insert into public.app_states(household_id,state) values(h,next_state)
      on conflict(household_id) do update set state=excluded.state;
    raise exception 'Legacy upsert should reject the valid expense';
  exception when insufficient_privilege then
    if sqlerrm not like 'PLAN_LIMIT:%' and sqlerrm not like 'PLAN_CURRENCY:%' then raise; end if;
  end;

  perform public.save_app_state(h,next_state);
  if not exists (select 1 from public.app_states where household_id=h and state=next_state and updated_by=auth.uid()) then
    raise exception 'Save did not preserve both accounts and expenses';
  end if;
  begin
    perform public.save_app_state(h,jsonb_set(next_state,'{transactions}',next_state->'transactions'||
      '[{"id":"br-new","currency":"BRL"}]'::jsonb));
    raise exception 'New foreign expense should still be rejected';
  exception when insufficient_privilege then if sqlerrm not like 'PLAN_CURRENCY:%' then raise; end if; end;

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000325","role":"authenticated"}',true);
  begin
    perform public.save_app_state(h,before_save);
    raise exception 'Nonmember write should be rejected';
  exception when raise_exception then if sqlerrm not like 'usuario sem permissao%' then raise; end if; end;
  perform public.save_app_state(empty_h,'{"settings":{"baseCurrency":"JPY"}}');
  if not exists (select 1 from public.app_states where household_id=empty_h and updated_by=auth.uid()) then
    raise exception 'First save did not insert a row';
  end if;
end;
$$;
rollback;
