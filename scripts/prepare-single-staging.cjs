const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const files = [
  "supabase-schema.sql",
  "supabase-members-update.sql",
  "supabase-reset-guard.sql",
  "supabase-commercial-v1.sql",
  "supabase-admin-management-v2.sql",
  "supabase-family-commercial-v3.sql",
  "supabase-admin-operations-v4.sql",
  "supabase-plan-enforcement-v5.sql",
  "supabase-plan-layout-v11.sql",
  "supabase-pro-trial-opt-in-v20.sql",
  "supabase-single-currency-v21.sql"
];

const sql = [
  "-- NEKUMA FINANCE STAGING ONLY. No billing integrations or production data.\nbegin;",
  `do $$ begin
    if to_regclass('public.app_states') is not null or exists (select 1 from auth.users) then
      raise exception 'Staging bootstrap requires an empty project; no changes applied.';
    end if;
  end; $$;`,
  ...files.map(file => {
    const source = fs.readFileSync(path.join(root, "outputs", "finance-pwa", file), "utf8");
    return `-- ${file}\n${source.replace(/^(?:begin|commit);\r?$/gim, "").trim()}`;
  }),
  "commit;",
  "select 'Nekuma Single staging schema ready' as status;"
].join("\n\n");

const out = path.join(root, "tmp", "nekuma-single-staging.sql");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, sql + "\n");
console.log(out);
