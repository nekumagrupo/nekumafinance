-- Preserve existing records when plan triggers validate a state update.
begin;

create or replace function public.save_app_state(target_household_id uuid, app_state jsonb)
returns timestamptz language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  saved_at timestamptz := now();
  actor uuid := auth.uid();
  payload jsonb := coalesce(app_state, '{}'::jsonb);
begin
  if actor is null then raise exception 'not authenticated'; end if;
  if not public.is_household_writer(target_household_id) then
    raise exception 'usuario sem permissao para editar esta familia';
  end if;
  if pg_column_size(payload) > 8388608 then
    raise exception 'estado financeiro excede o limite permitido';
  end if;

  -- An upsert fires BEFORE INSERT even for an existing row, without OLD.state.
  update public.app_states set state = payload, updated_by = actor, updated_at = saved_at
    where household_id = target_household_id;
  if found then return saved_at; end if;

  -- First save only. Handle another first save winning the race.
  insert into public.app_states (household_id, state, updated_by, updated_at)
  values (target_household_id, payload, actor, saved_at)
  on conflict (household_id) do update
    set state = excluded.state, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  return saved_at;
end;
$$;

revoke all on function public.save_app_state(uuid, jsonb) from public, anon;
grant execute on function public.save_app_state(uuid, jsonb) to authenticated;
commit;
