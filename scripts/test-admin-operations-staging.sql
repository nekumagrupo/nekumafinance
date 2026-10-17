begin;
insert into auth.users(id,email,created_at) values
 ('00000000-0000-4000-8000-000000000281','admin-v4@example.invalid',now()-interval '10 days'),
 ('00000000-0000-4000-8000-000000000282','user-v4@example.invalid',now()-interval '10 days'),
 ('00000000-0000-4000-8000-000000000283','trial-v4@example.invalid',now());
insert into public.commercial_admins(user_id) values('00000000-0000-4000-8000-000000000281');
do $$ declare result jsonb; workspace uuid; begin
 begin
  insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000284',' USER-v4@EXAMPLE.invalid ');
  raise exception 'FAIL duplicate email';
 exception when unique_violation then null; end;
 if (select count(*) from auth.users)<>3 then raise exception 'FAIL duplicate signup leaked user'; end if;
 begin
  update auth.users set email='ADMIN-v4@example.invalid' where id='00000000-0000-4000-8000-000000000282';
  raise exception 'FAIL duplicate email update';
 exception when unique_violation then null; end;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000282","role":"authenticated","aal":"aal2"}',true);
 workspace:=public.ensure_default_household('Private fixture');
 insert into public.app_states(household_id,state) values(workspace,'{}');
 begin perform public.commercial_admin_set_block(auth.uid(),true,'Unauthorized attempt'); raise exception 'FAIL nonadmin block'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000281","role":"authenticated","aal":"aal2"}',true);
 perform public.commercial_admin_set_block('00000000-0000-4000-8000-000000000282',true,'Test account suspension');
 result:=public.commercial_admin_overview(0);
 if (result->>'blocked')::integer<>1 or (result->>'trials')::integer<>1 or (result->>'expired')::integer<>1 then raise exception 'FAIL counters %',result; end if;
 if result::text like '%encrypted_password%' then raise exception 'FAIL password hash exposed'; end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000282","role":"authenticated","aal":"aal2"}',true);
 if public.commercial_account_active() then raise exception 'FAIL blocked active'; end if;
 if (public.my_commercial_access()->>'blocked')::boolean is not true then raise exception 'FAIL app block'; end if;
 execute 'set local role authenticated';
 if (select count(*) from public.app_states)<>0 then raise exception 'FAIL blocked RLS read'; end if;
 execute 'reset role';
 begin perform public.ensure_default_household('Blocked'); raise exception 'FAIL blocked workspace'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000281","role":"authenticated","aal":"aal2"}',true);
 perform public.commercial_admin_set_block('00000000-0000-4000-8000-000000000282',false,'Restore account access');
 begin perform public.commercial_admin_set_block(auth.uid(),true,'Block administrator'); raise exception 'FAIL self block'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.commercial_account_controls where blocked) then raise exception 'FAIL unblock'; end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000282","role":"authenticated","aal":"aal2"}',true);
 execute 'set local role authenticated';
 if (select count(*) from public.app_states)<>1 then raise exception 'FAIL active RLS read'; end if;
 execute 'reset role';
 delete from auth.users where id='00000000-0000-4000-8000-000000000283';
 if exists(select 1 from public.commercial_email_keys where normalized_email='trial-v4@example.invalid') then raise exception 'FAIL orphan email'; end if;
end; $$;
rollback;
