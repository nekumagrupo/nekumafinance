-- Run ONLY after supabase-commercial-v1.sql, in a disposable staging database.
-- All fixtures and their dependent rows are rolled back.
begin;
insert into auth.users(id,created_at) values
 ('00000000-0000-4000-8000-000000000268',now()),
 ('00000000-0000-4000-8000-000000000269',now()-interval '10 days');
insert into public.commercial_admins(user_id) values ('00000000-0000-4000-8000-000000000268');
do $$
declare access jsonb; applied boolean;
begin
  if has_table_privilege('authenticated','public.commercial_subscriptions','UPDATE') then raise exception 'FAIL browser can modify subscriptions'; end if;
  if has_function_privilege('authenticated','public.apply_commercial_event(uuid,text,text,text,timestamptz)','EXECUTE') then raise exception 'FAIL browser can apply payment event'; end if;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000269","role":"authenticated","aal":"aal1"}',true);
  access:=public.my_commercial_access();
  if access->>'plan'<>'free' then raise exception 'FAIL expired trial'; end if;
  begin
    perform public.commercial_admin_overview();
    raise exception 'FAIL ordinary user reached admin';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000268","role":"authenticated","aal":"aal1"}',true);
  access:=public.my_commercial_access();
  if access->>'plan'<>'pro' then raise exception 'FAIL new trial'; end if;
  begin
    perform public.commercial_admin_overview();
    raise exception 'FAIL admin without MFA';
  exception when insufficient_privilege then null; end;
  begin
    perform public.apply_commercial_event('00000000-0000-4000-8000-000000000268','staging:forbidden','family','active',now()+interval '1 month');
    raise exception 'FAIL forged event';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000268","role":"authenticated","aal":"aal2"}',true);
  perform public.commercial_admin_overview();
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  applied:=public.apply_commercial_event('00000000-0000-4000-8000-000000000268','staging:paid','pro','active',now()+interval '1 month');
  if not applied then raise exception 'FAIL first event'; end if;
  applied:=public.apply_commercial_event('00000000-0000-4000-8000-000000000268','staging:paid','family','active',now()+interval '1 month');
  if applied then raise exception 'FAIL duplicate event'; end if;
  if public.commercial_effective_plan('00000000-0000-4000-8000-000000000268')<>'pro' then raise exception 'FAIL paid plan'; end if;
  perform public.apply_commercial_event('00000000-0000-4000-8000-000000000268','staging:canceled','pro','canceled',now()+interval '1 day');
  if public.commercial_effective_plan('00000000-0000-4000-8000-000000000268')<>'pro' then raise exception 'FAIL cancel removed paid access'; end if;
  perform public.apply_commercial_event('00000000-0000-4000-8000-000000000268','staging:expired','pro','canceled',now()-interval '1 second');
  if public.commercial_effective_plan('00000000-0000-4000-8000-000000000268')<>'free' then raise exception 'FAIL expired paid access'; end if;
end;
$$;
rollback;
