-- Requires commercial v1-v16. Disabled until live billing reconciliation is ready.
begin;
create table if not exists public.referral_settings (
 id boolean primary key default true check(id), enabled boolean not null default false
);
insert into public.referral_settings(id) values(true) on conflict do nothing;
create table if not exists public.referral_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 code text not null unique default upper(replace(gen_random_uuid()::text,'-','')),
 created_at timestamptz not null default now()
);
create table if not exists public.referral_attributions (
 invitee uuid primary key references auth.users(id) on delete cascade,
 referrer uuid not null references public.referral_members(user_id) on delete cascade,
 created_at timestamptz not null default now(), check(invitee<>referrer)
);
create table if not exists public.referral_redemptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 starts_at timestamptz not null default now(), ends_at timestamptz not null default(now()+interval '30 days'),
 revoked_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.referral_credits (
 invitee uuid primary key references public.referral_attributions(invitee) on delete cascade,
 referrer uuid not null references public.referral_members(user_id) on delete cascade,
 invoice_id text not null unique, charge_id text not null unique,
 paid_at timestamptz not null, status text not null check(status in('pending','approved','reversed')),
 verified_at timestamptz not null default now(),
 redemption_id uuid references public.referral_redemptions(id), created_at timestamptz not null default now()
);
create table if not exists public.referral_events (
 event_id text primary key, invitee uuid not null references auth.users(id) on delete cascade,
 kind text not null, created_at timestamptz not null default now()
);
alter table public.referral_settings enable row level security;
alter table public.referral_members enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.referral_redemptions enable row level security;
alter table public.referral_credits enable row level security;
alter table public.referral_events enable row level security;
revoke all on public.referral_settings,public.referral_members,public.referral_attributions,
 public.referral_redemptions,public.referral_credits,public.referral_events from public,anon,authenticated;

create or replace function public.referral_claim(invite_code text)
returns boolean language plpgsql security definer set search_path='' as $$
declare sponsor uuid; me uuid:=auth.uid();
begin
 if me is null or not public.commercial_account_active() then raise exception 'FORBIDDEN'; end if;
 if not(select enabled from public.referral_settings where id) then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(me::text,17));
 if exists(select 1 from public.referral_attributions where invitee=me) then return false; end if;
 if not exists(select 1 from auth.users where id=me and created_at>=now()-interval '24 hours') then return false; end if;
 select user_id into sponsor from public.referral_members where code=upper(trim(invite_code));
 if sponsor is null or sponsor=me then return false; end if;
 if exists(select 1 from auth.users a join auth.users b on lower(trim(a.email))=lower(trim(b.email)) where a.id=me and b.id=sponsor) then return false; end if;
 insert into public.referral_attributions(invitee,referrer) values(me,sponsor) on conflict do nothing;
 return found;
end $$;

-- Called ONLY by a future live, signature-verified payment reconciler. Sandbox
-- never counts. Approval requires a fresh provider check after the hold period.
create or replace function public.referral_record_payment(target_user uuid,target_event text,
 target_invoice text,target_charge text,paid_time timestamptz,live_mode boolean,
 currency_code text,paid_amount integer,first_invoice boolean,payment_state text)
returns boolean language plpgsql security definer set search_path='' as $$
declare sponsor uuid; old_credit public.referral_credits; reward uuid; changed integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if not(select enabled from public.referral_settings where id) then return false; end if;
 if live_mode is distinct from true or first_invoice is distinct from true or currency_code is distinct from 'jpy'
  or paid_amount is distinct from 480 or paid_time is null or paid_time>now()
  or target_event is null or target_event !~ '^(evt_[A-Za-z0-9]+|reconcile:[A-Za-z0-9:_-]{1,160})$'
  or target_invoice is null or target_invoice !~ '^in_[A-Za-z0-9]+$'
  or target_charge is null or target_charge !~ '^ch_[A-Za-z0-9]+$'
  or payment_state is null or payment_state not in('paid','refunded','disputed','reversed') then raise exception 'INVALID_PAYMENT'; end if;
 select referrer into sponsor from public.referral_attributions where invitee=target_user and created_at<=paid_time;
 if sponsor is null then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(sponsor::text,17));
 select * into old_credit from public.referral_credits where invitee=target_user for update;
 if found and(old_credit.invoice_id<>target_invoice or old_credit.charge_id<>target_charge or old_credit.paid_at<>paid_time) then raise exception 'PAYMENT_BINDING_CONFLICT'; end if;
 insert into public.referral_events(event_id,invitee,kind) values(target_event,target_user,payment_state) on conflict do nothing;
 get diagnostics changed=row_count;
 if changed=0 then return false; end if;
 insert into public.referral_credits(invitee,referrer,invoice_id,charge_id,paid_at,status)
 values(target_user,sponsor,target_invoice,target_charge,paid_time,
  case when payment_state<>'paid' then 'reversed' when paid_time<=now()-interval '14 days' then 'approved' else 'pending' end)
 on conflict(invitee) do update set status=case
  when public.referral_credits.status='reversed' or payment_state<>'paid' then 'reversed'
  when paid_time<=now()-interval '14 days' then 'approved' else 'pending' end,verified_at=now();
 if payment_state<>'paid' then
  reward:=old_credit.redemption_id;
  if reward is not null then
   update public.referral_redemptions set revoked_at=coalesce(revoked_at,now()) where id=reward;
   update public.referral_credits set redemption_id=null where redemption_id=reward;
  end if;
 end if;
 return true;
end $$;

create or replace function public.my_referral_dashboard()
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); personal_code text;
begin
 if me is null or not public.commercial_account_active() then raise exception 'FORBIDDEN'; end if;
 if not(select enabled from public.referral_settings where id) then return jsonb_build_object('enabled',false); end if;
 insert into public.referral_members(user_id) values(me) on conflict do nothing;
 select code into personal_code from public.referral_members where user_id=me;
 return jsonb_build_object('enabled',true,'code',personal_code,'pointsPerReferral',100,'redemptionCost',300,'rewardDays',30,'validationDays',14,
  'points',(select count(*)*100 from public.referral_credits where referrer=me and status='approved' and redemption_id is null),
  'pending',(select count(*) from public.referral_attributions a where a.referrer=me and not exists(select 1 from public.referral_credits c where c.invitee=a.invitee and c.status in('approved','reversed'))),
  'approved',(select count(*) from public.referral_credits where referrer=me and status='approved'),
  'history',coalesce((select jsonb_agg(jsonb_build_object('createdAt',a.created_at,'status',coalesce(c.status,'registered')) order by a.created_at desc)
   from public.referral_attributions a left join public.referral_credits c on c.invitee=a.invitee where a.referrer=me),'[]'::jsonb),
  'rewards',coalesce((select jsonb_agg(jsonb_build_object('startsAt',r.starts_at,'endsAt',r.ends_at,'revoked',r.revoked_at is not null) order by r.created_at desc)
   from public.referral_redemptions r where r.user_id=me),'[]'::jsonb));
end $$;

create or replace function public.redeem_referral_pro()
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); reward uuid; chosen uuid[];
begin
 if me is null or not public.commercial_account_active() then raise exception 'FORBIDDEN'; end if;
 if not(select enabled from public.referral_settings where id) then raise exception 'PROGRAM_DISABLED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(me::text,17));
 if public.commercial_effective_plan(me)<>'free' or exists(select 1 from public.commercial_subscriptions s where s.user_id=me
  and s.status in('active','past_due','canceled') and s.paid_until>now()) then raise exception 'ACTIVE_PLAN'; end if;
 select array_agg(c.invitee) into chosen from (select invitee from public.referral_credits
  where referrer=me and status='approved' and redemption_id is null and verified_at>=now()-interval '5 minutes'
  order by paid_at,invitee limit 3 for update) c;
 if coalesce(array_length(chosen,1),0)<3 then raise exception 'POINTS_OR_VERIFICATION_REQUIRED'; end if;
 insert into public.referral_redemptions(user_id) values(me) returning id into reward;
 update public.referral_credits set redemption_id=reward where invitee=any(chosen);
 insert into public.commercial_notifications(user_id,plan) values(me,'pro');
 return public.my_referral_dashboard();
end $$;

do $$ begin
 if to_regprocedure('public.commercial_effective_plan_before_referrals_v17(uuid)') is null then
  alter function public.commercial_effective_plan(uuid) rename to commercial_effective_plan_before_referrals_v17;
 end if;
end $$;
create or replace function public.commercial_effective_plan(target_user uuid)
returns text language plpgsql stable security definer set search_path='' as $$
declare base text:=public.commercial_effective_plan_before_referrals_v17(target_user);
begin
 if base<>'free' or exists(select 1 from public.commercial_access_overrides o where o.user_id=target_user and(o.valid_until is null or o.valid_until>now())) then return base; end if;
 if (select enabled from public.referral_settings where id) and exists(select 1 from public.referral_redemptions r
  where r.user_id=target_user and r.revoked_at is null and r.starts_at<=now() and r.ends_at>now()) then return 'pro'; end if;
 return base;
end $$;
revoke all on function public.referral_claim(text),public.my_referral_dashboard(),public.redeem_referral_pro(),
 public.referral_record_payment(uuid,text,text,text,timestamptz,boolean,text,integer,boolean,text),public.commercial_effective_plan_before_referrals_v17(uuid) from public,anon,authenticated;
grant execute on function public.referral_claim(text),public.my_referral_dashboard(),public.redeem_referral_pro() to authenticated;
grant execute on function public.referral_record_payment(uuid,text,text,text,timestamptz,boolean,text,integer,boolean,text) to service_role;
commit;
