begin;
insert into auth.users(id,email,created_at) values
 ('00000000-0000-4000-8000-000000000291','free-v5@example.invalid',now()-interval '10 days'),
 ('00000000-0000-4000-8000-000000000292','family-v5@example.invalid',now()-interval '10 days'),
 ('00000000-0000-4000-8000-000000000293','member-v5@example.invalid',now()-interval '10 days');
insert into public.households(id) values('10000000-0000-4000-8000-000000000291'),('10000000-0000-4000-8000-000000000292');
insert into public.household_members(household_id,user_id,role) values
 ('10000000-0000-4000-8000-000000000291','00000000-0000-4000-8000-000000000291','owner'),
 ('10000000-0000-4000-8000-000000000292','00000000-0000-4000-8000-000000000292','owner'),
 ('10000000-0000-4000-8000-000000000292','00000000-0000-4000-8000-000000000293','editor');
-- Existing over-limit data, as present before activation, is not deleted.
insert into public.app_states(household_id,state) values('10000000-0000-4000-8000-000000000291','{"bankAccounts":[{"id":"a"},{"id":"b"}],"creditCards":[{"id":"legacy-card"}]}');
do $$ declare h uuid:='10000000-0000-4000-8000-000000000291'; s jsonb; usage jsonb; begin
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000291","role":"authenticated","aal":"aal1"}',true);
 select state into s from public.app_states where household_id=h;
 update public.app_states set state=jsonb_set(s,'{bankAccounts,0,nickname}','"Renamed legacy"') where household_id=h;
 select state into s from public.app_states where household_id=h;
 begin update public.app_states set state=jsonb_set(s,'{bankAccounts}',(s->'bankAccounts')||'[{"id":"c"}]') where household_id=h; raise exception 'FAIL third account'; exception when insufficient_privilege then null; end;
 begin update public.app_states set state=jsonb_set(s,'{bankAccounts}',(s->'bankAccounts')||'[{"id":"inactive","active":false}]') where household_id=h; raise exception 'FAIL inactive account bypass'; exception when insufficient_privilege then null; end;
 begin update public.app_states set state=jsonb_set(s,'{commercial}','{"plan":"family"}')||'{"bankAccounts":[{"id":"a"},{"id":"b"},{"id":"c"}]}' where household_id=h; raise exception 'FAIL forged local plan'; exception when insufficient_privilege then null; end;
 begin update public.app_states set state=jsonb_set(s,'{creditCards}','[{"id":"legacy-card","name":"changed"}]') where household_id=h; raise exception 'FAIL premium edit'; exception when insufficient_privilege then null; end;
 begin update public.app_states set state=jsonb_set(s,'{bankAccounts}','[{"id":"a"},{"id":"a"}]') where household_id=h; raise exception 'FAIL duplicate IDs'; exception when invalid_parameter_value then null; end;
 begin perform public.reserve_commercial_scan(h); raise exception 'FAIL Free scan'; exception when insufficient_privilege then null; end;
 update public.app_states set state=s||'{"incomeSources":[{"id":"income"}],"financialGoals":[{"id":"goal","active":true}],"categoryBudgets":[{"id":"x","month":"2026-10"},{"id":"y","month":"2026-10"},{"id":"z","month":"2026-11"}]}' where household_id=h;
 begin update public.app_states set state=state||'{"incomeSources":[{"id":"income"},{"id":"income2","active":false}]}' where household_id=h; raise exception 'FAIL second income'; exception when insufficient_privilege then null; end;
 begin update public.app_states set state=state||'{"financialGoals":[{"id":"goal"},{"id":"goal2"}]}' where household_id=h; raise exception 'FAIL second goal'; exception when insufficient_privilege then null; end;
 update public.app_states set state=state||'{"financialGoals":[{"id":"goal","active":true},{"id":"archived","active":false}]}' where household_id=h;
 begin update public.app_states set state=state||'{"financialGoals":[{"id":"goal","active":true},{"id":"archived","active":true}]}' where household_id=h; raise exception 'FAIL reactivation bypass'; exception when insufficient_privilege then null; end;
 begin update public.app_states set state=state||'{"categoryBudgets":[{"id":"x","month":"2026-10"},{"id":"y","month":"2026-10"},{"id":"z","month":"2026-10"}]}' where household_id=h; raise exception 'FAIL third monthly budget'; exception when insufficient_privilege then null; end;
 update public.commercial_subscriptions set plan='pro',status='active',paid_until=now()+interval '1 month' where user_id=auth.uid();
 update public.app_states set state=state||'{"bankAccounts":[{"id":"a"},{"id":"b"},{"id":"c"}],"creditCards":[{"id":"new-card"}]}' where household_id=h;
 for i in 1..30 loop usage:=public.reserve_commercial_scan(h); end loop;
 if (usage->>'used')::integer<>30 then raise exception 'FAIL Pro quota'; end if;
 begin perform public.reserve_commercial_scan(h); raise exception 'FAIL scan 31'; exception when raise_exception then if sqlerrm='FAIL scan 31' then raise; end if; end;
 update public.commercial_subscriptions set paid_until=now()-interval '1 day' where user_id=auth.uid();
 if public.commercial_user_plan(auth.uid())<>'free' then raise exception 'FAIL expiry fallback'; end if;
 begin update public.app_states set state=jsonb_set(state,'{creditCards,0,name}','"No longer allowed"') where household_id=h; raise exception 'FAIL expired premium edit'; exception when insufficient_privilege then null; end;
 update public.app_states set state=jsonb_set(state,'{bankAccounts,0,nickname}','"Still editable"') where household_id=h;
 update public.commercial_subscriptions set plan='family',status='active',paid_until=now()+interval '1 month' where user_id='00000000-0000-4000-8000-000000000292';
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000292","role":"authenticated","aal":"aal1"}',true);
 for i in 1..30 loop perform public.reserve_commercial_scan('10000000-0000-4000-8000-000000000292'); end loop;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000293","role":"authenticated","aal":"aal1"}',true);
 for i in 1..30 loop usage:=public.reserve_commercial_scan('10000000-0000-4000-8000-000000000292'); end loop;
 if (usage->>'used')::integer<>60 then raise exception 'FAIL shared quota'; end if;
 begin perform public.reserve_commercial_scan('10000000-0000-4000-8000-000000000292'); raise exception 'FAIL scan 61'; exception when raise_exception then if sqlerrm='FAIL scan 61' then raise; end if; end;
 if (public.my_commercial_access()->>'scansUsed')::integer<>60 then raise exception 'FAIL usage snapshot'; end if;
 if has_table_privilege('authenticated','public.commercial_monthly_usage','UPDATE') then raise exception 'FAIL quota write'; end if;
end; $$;
rollback;
