-- Read-only deployment check. Does not create, archive or charge any checkout.
select
 to_regprocedure('public.paypal_sandbox_restart(uuid,uuid,text)') is not null as restart_ready,
 not has_function_privilege('authenticated','public.paypal_sandbox_restart(uuid,uuid,text)','execute') as browser_denied,
 has_function_privilege('service_role','public.paypal_sandbox_restart(uuid,uuid,text)','execute') as server_allowed,
 exists(select 1 from pg_indexes where schemaname='public' and indexname='paypal_sandbox_current_checkout_key' and indexdef ilike '%WHERE (archived_at IS NULL)%') as current_checkout_unique,
 (select count(*) from public.paypal_sandbox_checkouts) as history_preserved,
 (select count(*) from public.paypal_sandbox_checkouts where archived_at is not null) as archived_checkouts;
