-- Staging only. Requires v1 + v2. All fixtures are rolled back.
begin;
insert into auth.users(id,email,created_at,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000270','admin-test@example.invalid',now(),'{}'),
 ('00000000-0000-4000-8000-000000000271','user-test@example.invalid',now()-interval '10 days','{"name":"Original","preference":"preserve"}');
insert into public.commercial_admins(user_id) values('00000000-0000-4000-8000-000000000270');
do $$
declare detail jsonb; target uuid:='00000000-0000-4000-8000-000000000271'; username text;
begin
  if has_table_privilege('authenticated','public.commercial_access_overrides','UPDATE') then raise exception 'FAIL direct override write'; end if;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000271","role":"authenticated","aal":"aal2"}',true);
  begin
    perform public.commercial_admin_user_detail(target);raise exception 'FAIL ordinary user';
  exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000270","role":"authenticated","aal":"aal1"}',true);
  begin
    perform public.commercial_admin_recovery_target(target);raise exception 'FAIL recovery without MFA';
  exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000270","role":"authenticated","aal":"aal2"}',true);
  detail:=public.commercial_admin_user_detail(target);
  perform public.commercial_admin_edit_user(target,'New name','manual','pro',now()+interval '30 days','Staging test grant',detail->>'version');
  if public.commercial_effective_plan(target)<>'pro' then raise exception 'FAIL grant';end if;
  if (select status from public.commercial_subscriptions where user_id=target)<>'trialing' then raise exception 'FAIL override rewrote subscription';end if;
  if (select raw_user_meta_data->>'preference' from auth.users where id=target)<>'preserve' then raise exception 'FAIL unrelated metadata changed';end if;
  begin
    perform public.commercial_admin_edit_user(target,'Stale edit','keep','free',null,'Stale version test',detail->>'version');raise exception 'FAIL stale edit accepted';
  exception when serialization_failure then null;end;
  detail:=public.commercial_admin_user_detail(target);
  perform public.commercial_admin_edit_user(target,'New name','automatic','free',null,'Restore automatic access',detail->>'version');
  if public.commercial_effective_plan(target)<>'free' then raise exception 'FAIL expired trial fallback';end if;
  if public.commercial_admin_recovery_target(target)<>'user-test@example.invalid' then raise exception 'FAIL recovery target';end if;
  if not exists(select 1 from public.commercial_audit where user_id=target and actor_id=auth.uid() and event_type='admin_user_edit') then raise exception 'FAIL audit';end if;
end;
$$;
rollback;
