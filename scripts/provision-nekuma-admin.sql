-- Run only after commercial v1 and admin-management v2 are validated/applied.
-- This grants ADMIN access; review the exact account before executing.
-- Does not create or overwrite a password. Invite/create the Auth user first.
begin;
do $$
declare target uuid; matches integer;
begin
  select count(*) into matches from auth.users where lower(email)='nekumagrupo@gmail.com';
  if matches<>1 then raise exception 'Create/verify exactly one Auth account for nekumagrupo@gmail.com first. No access granted.'; end if;
  select id into target from auth.users where lower(email)='nekumagrupo@gmail.com' and email_confirmed_at is not null;
  if target is null then raise exception 'Confirm the account email first. No access granted.'; end if;
  insert into public.commercial_admins(user_id) values(target) on conflict do nothing;
  if found then
    insert into public.commercial_audit(user_id,event_key,event_type,plan,status,reason)
      values(target,'admin-bootstrap:'||target::text,'admin_granted',public.commercial_effective_plan(target),'granted','Initial admin explicitly requested: nekumagrupo@gmail.com') on conflict(event_key) do nothing;
  end if;
end;
$$;
commit;
