-- Apply after the commercial, enforcement and Stripe LIVE migrations. No backfill.
begin;

alter table public.commercial_subscriptions
  add column if not exists trial_offer_available boolean not null default false;

create or replace function public.commercial_new_account()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.commercial_subscriptions(user_id, trial_offer_available)
  values (new.id, true) on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.my_pro_trial_offer()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.commercial_account_active()
    and exists (select 1 from public.commercial_subscriptions sub where sub.user_id = auth.uid()
      and sub.trial_offer_available and sub.plan = 'free' and sub.status = 'free'
      and sub.trial_ends_at is null and sub.paid_until is null)
    and public.my_commercial_access()->>'plan' = 'free'
    and not exists (select 1 from public.commercial_access_overrides o where o.user_id = auth.uid()
      and (o.valid_until is null or o.valid_until > now()))
    and exists (
      select 1 from public.household_members m
      join public.app_states a on a.household_id = m.household_id
      cross join lateral jsonb_array_elements(case when jsonb_typeof(a.state->'bankAccounts') = 'array'
        then a.state->'bankAccounts' else '[]'::jsonb end) as bank(item)
      cross join lateral jsonb_array_elements(case when jsonb_typeof(a.state->'incomeSources') = 'array'
        then a.state->'incomeSources' else '[]'::jsonb end) as source(item)
      where m.user_id = auth.uid() and m.role = 'owner' and bank.item->>'active' is distinct from 'false'
        and nullif(bank.item->>'id', '') = source.item->>'bankAccountId'
        and source.item->>'ownerId' = auth.uid()::text
    );
$$;

create or replace function public.activate_my_pro_trial()
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); ends_at timestamptz;
begin
  if me is null or not public.commercial_account_active() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform 1 from public.commercial_subscriptions where user_id = me for update;
  if public.my_pro_trial_offer() is not true then
    raise exception 'PRO_TRIAL_UNAVAILABLE' using errcode = 'P0001';
  end if;
  update public.commercial_subscriptions set plan = 'pro', status = 'trialing',
    trial_offer_available = false, trial_ends_at = now() + interval '72 hours', updated_at = now()
    where user_id = me and trial_offer_available returning trial_ends_at into ends_at;
  if ends_at is null then raise exception 'PRO_TRIAL_UNAVAILABLE' using errcode = 'P0001'; end if;
  return ends_at;
end;
$$;

revoke all on function public.commercial_new_account(), public.my_pro_trial_offer(), public.activate_my_pro_trial()
  from public, anon, authenticated;
grant execute on function public.my_pro_trial_offer(), public.activate_my_pro_trial() to authenticated;
commit;
