select
 (select enabled from public.stripe_live_settings where id) as live_sales_enabled,
 (select count(*) from public.stripe_live_checkouts) as live_checkouts,
 (select count(*) from public.stripe_live_periods) as paid_periods,
 (select count(*) from public.stripe_live_holds) as payment_holds,
 not exists(select 1 from pg_tables where schemaname='public' and tablename in
  ('stripe_live_settings','stripe_live_checkouts','stripe_live_events','stripe_live_periods','stripe_live_holds') and not rowsecurity) as all_rls_enabled,
 has_function_privilege('authenticated','public.stripe_live_record(uuid,text,text,text,jsonb)','EXECUTE') as browser_can_grant_pro,
 has_table_privilege('authenticated','public.stripe_live_periods','SELECT') as browser_can_read_payment_rows;
