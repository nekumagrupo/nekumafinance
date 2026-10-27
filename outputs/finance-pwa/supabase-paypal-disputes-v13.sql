-- Sandbox only. Resolution requires review; it never clears a refund hold.
begin;
alter table public.paypal_sandbox_payment_holds
  drop constraint if exists paypal_sandbox_payment_holds_reason_check;
alter table public.paypal_sandbox_payment_holds
  add constraint paypal_sandbox_payment_holds_reason_check
  check (reason in ('PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED','CUSTOMER.DISPUTE.CREATED'));
commit;
