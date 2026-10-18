-- Read-only customer status, always selected by the authenticated server UUID.
begin;
create or replace function public.paypal_sandbox_customer_status(target_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  return (
    select to_jsonb(c) || jsonb_build_object(
      'confirmed_receipts', (select count(distinct e.payment_id) from public.paypal_sandbox_events e where e.checkout_id=c.id and e.event_kind='PAYMENT.SALE.COMPLETED'),
      'last_confirmed_at', (select max(e.received_at) from public.paypal_sandbox_events e where e.checkout_id=c.id and e.payment_id is not null and e.event_kind='PAYMENT.SALE.COMPLETED'),
      'last_event_at', (select max(e.received_at) from public.paypal_sandbox_events e where e.checkout_id=c.id)
    ) from public.paypal_sandbox_checkouts c where c.user_id=target_user
  );
end $$;
revoke all on function public.paypal_sandbox_customer_status(uuid) from public, anon, authenticated;
grant execute on function public.paypal_sandbox_customer_status(uuid) to service_role;
commit;
