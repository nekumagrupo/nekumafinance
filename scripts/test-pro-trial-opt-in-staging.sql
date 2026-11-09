-- Run only in a disposable staging database after v20. Fixtures roll back.
begin;
insert into auth.users(id,email,created_at) values
  ('00000000-0000-4000-8000-000000000320','trial-v20@example.invalid',now()-interval '10 days'),
  ('00000000-0000-4000-8000-000000000321','legacy-v20@example.invalid',now()-interval '10 days');
update public.commercial_subscriptions set plan='pro', status='trialing', trial_offer_available=false,
  trial_ends_at=now()-interval '1 day' where user_id='00000000-0000-4000-8000-000000000321';
insert into public.households(id,name) values ('10000000-0000-4000-8000-000000000320','Trial staging');
insert into public.household_members(household_id,user_id,role) values
  ('10000000-0000-4000-8000-000000000320','00000000-0000-4000-8000-000000000320','owner');

do $$
declare me uuid:='00000000-0000-4000-8000-000000000320'; ends_at timestamptz;
begin
  if has_function_privilege('anon','public.activate_my_pro_trial()','EXECUTE') then raise exception 'FAIL anonymous grant'; end if;
  if has_table_privilege('authenticated','public.commercial_subscriptions','UPDATE') then raise exception 'FAIL direct subscription update'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',me,'role','authenticated')::text,true);
  if public.my_commercial_access()->>'plan' <> 'free' then raise exception 'FAIL automatic PRO'; end if;
  if public.my_pro_trial_offer() is true then raise exception 'FAIL offer before prerequisites'; end if;
  begin
    perform public.activate_my_pro_trial();
    raise exception 'FAIL activation before prerequisites';
  exception when raise_exception then if sqlerrm <> 'PRO_TRIAL_UNAVAILABLE' then raise; end if; end;
  insert into public.app_states(household_id,state) values ('10000000-0000-4000-8000-000000000320',
    jsonb_build_object('bankAccounts',jsonb_build_array(jsonb_build_object('id','test-bank','active',true)),
      'incomeSources',jsonb_build_array(jsonb_build_object('id','test-source','bankAccountId','test-bank','ownerId',me))));
  if public.my_pro_trial_offer() is not true then raise exception 'FAIL missing eligible offer'; end if;
  ends_at:=public.activate_my_pro_trial();
  if ends_at is distinct from now()+interval '72 hours' then raise exception 'FAIL trial duration'; end if;
  if public.my_commercial_access()->>'plan' <> 'pro' then raise exception 'FAIL effective PRO'; end if;
  begin
    perform public.activate_my_pro_trial();
    raise exception 'FAIL repeat activation';
  exception when raise_exception then if sqlerrm <> 'PRO_TRIAL_UNAVAILABLE' then raise; end if; end;
  update public.commercial_subscriptions set trial_ends_at=now()-interval '1 second' where user_id=me;
  if public.my_commercial_access()->>'plan' <> 'free' or public.my_pro_trial_offer() is true then raise exception 'FAIL expiry or renewal'; end if;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000321","role":"authenticated"}',true);
  if public.my_pro_trial_offer() is true or public.my_commercial_access()->>'plan' <> 'free' then raise exception 'FAIL legacy expiry'; end if;
end;
$$;
rollback;
