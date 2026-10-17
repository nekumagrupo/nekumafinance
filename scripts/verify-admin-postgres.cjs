// Disposable PostgreSQL/WASM harness, no production credentials or network calls.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {PGlite}=require(path.resolve(process.env.PGLITE_MODULE || 'tmp/commercial-qa/node_modules/@electric-sql/pglite'));
(async()=>{
  const db=new PGlite();
  try{
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;
      create table auth.users(id uuid primary key,email text,encrypted_password text default '',created_at timestamptz default now(),updated_at timestamptz,last_sign_in_at timestamptz,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
      create table public.households(id uuid primary key default gen_random_uuid(),name text default 'Familia',invite_code text not null unique default upper(replace(gen_random_uuid()::text,'-','')));
      create table public.household_members(household_id uuid references public.households(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,role text,created_at timestamptz default now(),primary key(household_id,user_id));
      create table public.app_states(household_id uuid primary key references public.households(id) on delete cascade,state jsonb);
    `);
    await db.exec(fs.readFileSync('outputs/finance-pwa/supabase-commercial-v1.sql','utf8'));
    await db.exec(fs.readFileSync('outputs/finance-pwa/supabase-admin-management-v2.sql','utf8'));
    // Applying both a second time must preserve data and definitions.
    await db.exec(fs.readFileSync('outputs/finance-pwa/supabase-commercial-v1.sql','utf8'));
    await db.exec(fs.readFileSync('outputs/finance-pwa/supabase-admin-management-v2.sql','utf8'));
    await db.exec(fs.readFileSync('scripts/test-commercial-staging.sql','utf8'));
    await db.exec(fs.readFileSync('scripts/test-admin-staging.sql','utf8'));
    await db.exec(fs.readFileSync('outputs/finance-pwa/supabase-family-commercial-v3.sql','utf8'));
    await db.exec(fs.readFileSync('outputs/finance-pwa/supabase-family-commercial-v3.sql','utf8'));
    await db.exec(fs.readFileSync('scripts/test-family-staging.sql','utf8'));
    await db.exec(`alter table public.app_states enable row level security;
      create policy staging_state_access on public.app_states for all to authenticated using(public.is_household_member(household_id)) with check(public.is_household_member(household_id));
      grant select on public.app_states to authenticated;`);
    await db.exec(fs.readFileSync('outputs/finance-pwa/supabase-admin-operations-v4.sql','utf8'));
    await db.exec(fs.readFileSync('outputs/finance-pwa/supabase-admin-operations-v4.sql','utf8'));
    await db.exec(fs.readFileSync('scripts/test-admin-operations-staging.sql','utf8'));
    await db.exec(fs.readFileSync('outputs/finance-pwa/supabase-plan-enforcement-v5.sql','utf8'));
    await db.exec(fs.readFileSync('outputs/finance-pwa/supabase-plan-enforcement-v5.sql','utf8'));
    await db.exec(fs.readFileSync('scripts/test-plan-enforcement-staging.sql','utf8'));
    assert.equal((await db.query('select count(*)::integer as count from auth.users')).rows[0].count,0);
    await db.exec("insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000272','nekumagrupo@gmail.com',now());");
    await db.exec(fs.readFileSync('scripts/provision-nekuma-admin.sql','utf8'));
    await db.exec(fs.readFileSync('scripts/provision-nekuma-admin.sql','utf8'));
    assert.equal((await db.query('select count(*)::integer as count from public.commercial_admins')).rows[0].count,1);
    console.log('PASS: PostgreSQL migrations, repeat application, expired trials, admin/MFA denial, manual grants, stale edits, audit, recovery target and exact-email bootstrap. Disposable auth schema only; real Supabase Auth/email integration still needs staging.');
  }finally{await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
