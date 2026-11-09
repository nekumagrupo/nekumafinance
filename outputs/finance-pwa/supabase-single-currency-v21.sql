-- Apply after v20, only after validating the matching client in staging.
begin;

create or replace function public.single_record_uses_other_currency(resource text, item jsonb, primary_code text)
returns boolean language sql immutable set search_path = '' as $$
  select case
    when resource in ('vehicles', 'vehicleMaintenance') then primary_code <> 'JPY'
    when resource = 'cryptoAssets' then
      coalesce(nullif(item->>'costCurrency', ''), primary_code) <> primary_code or
      coalesce(nullif(item->>'feeCurrency', ''), nullif(item->>'costCurrency', ''), primary_code) <> primary_code
    when resource = 'housingCards' then
      coalesce(nullif(item->>'currency', ''), primary_code) <> primary_code or exists (
        select 1 from jsonb_array_elements(case when jsonb_typeof(item->'items') = 'array'
          then item->'items' else '[]'::jsonb end) child
        where coalesce(nullif(child->>'currency', ''), nullif(item->>'currency', ''), primary_code) <> primary_code
      )
    else coalesce(nullif(item->>'currency', ''), case item->>'country' when 'brasil' then 'BRL'
      when 'japao' then 'JPY' else primary_code end) <> primary_code
  end;
$$;

create or replace function public.guard_single_currency_state()
returns trigger language plpgsql security definer set search_path = '' as $$
declare previous jsonb := '{}'; primary_code text; resource text; prior_rows jsonb; next_rows jsonb;
begin
  if auth.uid() is null or public.commercial_user_plan(auth.uid()) is distinct from 'free' then return new; end if;
  if tg_op = 'UPDATE' then previous := old.state; end if;
  primary_code := coalesce(nullif(new.state#>>'{settings,baseCurrency}', ''), 'JPY');
  if primary_code not in ('JPY', 'BRL', 'USD', 'EUR') then
    raise exception 'PLAN_CURRENCY: invalid primary currency' using errcode = '42501';
  end if;
  if coalesce(new.state->'transfers', '[]'::jsonb) is distinct from coalesce(previous->'transfers', '[]'::jsonb) then
    raise exception 'PLAN_CURRENCY: transfers require multiple currencies' using errcode = '42501';
  end if;
  foreach resource in array array['bankAccounts','incomeSources','workIncomes','transactions','commitments',
    'creditCards','cardPurchases','subscriptions','housingCards','cryptoAssets','vehicles','vehicleMaintenance','shoppingLists'] loop
    if new.state->resource is not distinct from previous->resource then continue; end if;
    if new.state ? resource and jsonb_typeof(new.state->resource) <> 'array' then
      raise exception 'PLAN_CURRENCY: invalid collection %', resource using errcode = '42501';
    end if;
    prior_rows := case when jsonb_typeof(previous->resource) = 'array' then previous->resource else '[]'::jsonb end;
    next_rows := coalesce(new.state->resource, '[]'::jsonb);
    if exists (
      select 1 from jsonb_array_elements(next_rows) item
      where not exists (select 1 from jsonb_array_elements(prior_rows) prior where prior = item)
        and (public.single_record_uses_other_currency(resource, item, primary_code) or exists (
          select 1 from jsonb_array_elements(prior_rows) prior
          where prior->>'id' = item->>'id' and public.single_record_uses_other_currency(resource, prior, primary_code)
        ))
    ) then
      raise exception 'PLAN_CURRENCY: % must use %', resource, primary_code using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists guard_single_currency_state on public.app_states;
create trigger guard_single_currency_state before insert or update on public.app_states
for each row execute function public.guard_single_currency_state();
revoke all on function public.single_record_uses_other_currency(text, jsonb, text), public.guard_single_currency_state()
  from public, anon, authenticated;
commit;
