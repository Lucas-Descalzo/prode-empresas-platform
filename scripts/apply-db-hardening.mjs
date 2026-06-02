import fs from "node:fs/promises";

import postgres from "postgres";

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    ""
  );
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("POSTGRES_URL is not configured.");
  }

  const sqlText = await fs.readFile(new URL("../db/supabase-hardening.sql", import.meta.url), "utf8");
  const sql = postgres(databaseUrl, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 20,
  });

  try {
    await sql.unsafe(sqlText);

    const rows = await sql`
      SELECT schemaname, tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'groups',
          'entries',
          'app_settings',
          'companies',
          'company_branding',
          'company_domains',
          'company_users',
          'company_user_credentials',
          'company_predictions',
          'company_official_results',
          'company_signup_links',
          'auth_rate_limits'
        )
      ORDER BY tablename
    `;

    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
