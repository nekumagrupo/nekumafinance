-- Read-only production check after referrals v17. No user identities returned.
select
 (select enabled from public.referral_settings where id) as program_enabled,
 (select count(*) from public.referral_members) as referral_codes,
 (select count(*) from public.referral_credits) as credit_records,
 (select count(*) from public.referral_redemptions) as rewards_granted,
 not exists(select 1 from auth.users u where
  public.commercial_effective_plan(u.id) is distinct from
  public.commercial_effective_plan_before_referrals_v17(u.id)) as existing_plans_preserved,
 has_table_privilege('authenticated','public.referral_credits','INSERT,UPDATE,DELETE') as browser_can_write_points,
 has_function_privilege('authenticated',
  'public.referral_record_payment(uuid,text,text,text,timestamptz,boolean,text,integer,boolean,text)',
  'EXECUTE') as browser_can_record_payments,
 (select bool_and(c.relrowsecurity) from pg_class c where c.oid in
  ('public.referral_settings'::regclass,'public.referral_members'::regclass,
   'public.referral_attributions'::regclass,'public.referral_credits'::regclass,
   'public.referral_redemptions'::regclass,'public.referral_events'::regclass)) as all_tables_have_rls;
