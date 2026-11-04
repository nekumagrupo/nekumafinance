-- Preserve history; allow a fresh checkout only after confirmed terminal state.
begin;
create or replace function public.stripe_live_finish(target_checkout uuid,target_subscription text,target_status text)
returns boolean language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if target_status not in('canceled','incomplete_expired') then raise exception 'NOT_TERMINAL'; end if;
 select user_id into owner_id from public.stripe_live_checkouts where id=target_checkout and subscription_id=target_subscription;
 if owner_id is null then raise exception 'BINDING_CONFLICT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text,18));
 perform 1 from public.stripe_live_checkouts where id=target_checkout for update;
 if exists(select 1 from public.stripe_live_periods p where p.checkout_id=target_checkout and p.paid_until>now()
  and not exists(select 1 from public.stripe_live_holds h where h.charge_id=p.charge_id)) then return false; end if;
 update public.stripe_live_checkouts set closed=true,state=target_status where id=target_checkout;
 return true;
end $$;
revoke all on function public.stripe_live_finish(uuid,text,text) from public,anon,authenticated;
grant execute on function public.stripe_live_finish(uuid,text,text) to service_role;
commit;
