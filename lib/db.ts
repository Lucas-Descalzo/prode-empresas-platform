import postgres from "postgres";

export type SqlClient = postgres.Sql<Record<string, unknown>>;

let sqlClient: SqlClient | null = null;
let schemaReadyPromise: Promise<void> | null = null;
const PUBLIC_TABLES_WITH_RLS = [
  "groups",
  "entries",
  "app_settings",
  "companies",
  "company_branding",
  "company_domains",
  "company_users",
  "company_user_credentials",
  "company_predictions",
  "company_official_results",
  "company_signup_links",
  "auth_rate_limits",
] as const;

function shouldAutoEnsureDatabaseSchema() {
  const override = process.env.RUNTIME_DB_SCHEMA_ENSURE?.trim().toLowerCase();

  if (override === "true") {
    return true;
  }

  if (override === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    ""
  );
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl());
}

export function getSql(): SqlClient {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("POSTGRES_URL is not configured.");
  }

  if (!sqlClient) {
    sqlClient = postgres(databaseUrl, {
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 20,
    });
  }

  return sqlClient;
}

async function ensureLegacySchema(sql: SqlClient) {
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      deadline_at_utc TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS scoring_enabled BOOLEAN NOT NULL DEFAULT false
  `;

  await sql`
    ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS is_public_pool BOOLEAN NOT NULL DEFAULT false
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      full_name_normalized TEXT NOT NULL,
      edit_key_hash TEXT NOT NULL,
      edit_key_salt TEXT NOT NULL,
      fixture_state_json JSONB NOT NULL,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      failed_resume_attempts INTEGER NOT NULL DEFAULT 0,
      resume_locked_until_utc TIMESTAMPTZ,
      CONSTRAINT unique_entry_name_per_group UNIQUE (group_id, full_name_normalized)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS entries_group_name_idx
    ON entries (group_id, full_name_normalized)
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS groups_single_public_pool_idx
    ON groups (is_public_pool)
    WHERE is_public_pool = true
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value_json JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function ensureB2BSchema(sql: SqlClient) {
  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      game_mode TEXT NOT NULL DEFAULT 'interactive',
      access_mode TEXT NOT NULL DEFAULT 'invited_only',
      allowed_email_domain TEXT,
      collects_area BOOLEAN NOT NULL DEFAULT true,
      area_label TEXT NOT NULL DEFAULT 'Area',
      status TEXT NOT NULL DEFAULT 'active',
      highlighted_team_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT companies_game_mode_check CHECK (game_mode IN ('simple', 'interactive')),
      CONSTRAINT companies_access_mode_check CHECK (access_mode IN ('invited_only', 'corporate_domain_signup', 'signup_link')),
      CONSTRAINT companies_status_check CHECK (status IN ('draft', 'active', 'paused'))
    )
  `;

  await sql`
    DO $$
    DECLARE
      existing_definition TEXT;
    BEGIN
      SELECT pg_get_constraintdef(constraint_row.oid)
      INTO existing_definition
      FROM pg_constraint AS constraint_row
      INNER JOIN pg_class AS relation_row
        ON relation_row.oid = constraint_row.conrelid
      WHERE relation_row.relname = 'companies'
        AND constraint_row.conname = 'companies_access_mode_check';

      IF existing_definition IS NULL THEN
        BEGIN
          ALTER TABLE companies
          ADD CONSTRAINT companies_access_mode_check
          CHECK (access_mode IN ('invited_only', 'corporate_domain_signup', 'signup_link'));
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END;
      ELSIF position('signup_link' in existing_definition) = 0 THEN
        ALTER TABLE companies
        DROP CONSTRAINT companies_access_mode_check;

        BEGIN
          ALTER TABLE companies
          ADD CONSTRAINT companies_access_mode_check
          CHECK (access_mode IN ('invited_only', 'corporate_domain_signup', 'signup_link'));
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END;
      END IF;
    END
    $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS company_branding (
      company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
      primary_color TEXT NOT NULL,
      primary_dark_color TEXT NOT NULL,
      primary_hover_color TEXT NOT NULL,
      background_color TEXT NOT NULL,
      foreground_color TEXT NOT NULL,
      muted_color TEXT NOT NULL,
      line_color TEXT NOT NULL,
      contrast_on_primary TEXT NOT NULL,
      logo_text TEXT,
      logo_url TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS company_domains (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      domain TEXT NOT NULL UNIQUE,
      is_primary BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS company_domains_company_idx
    ON company_domains (company_id)
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS company_domains_one_primary_per_company_idx
    ON company_domains (company_id)
    WHERE is_primary = true
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS company_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      document_id TEXT,
      area TEXT,
      role TEXT NOT NULL DEFAULT 'participant',
      status TEXT NOT NULL DEFAULT 'invited',
      must_change_password BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ,
      CONSTRAINT company_users_unique_email UNIQUE (company_id, email),
      CONSTRAINT company_users_role_check CHECK (role IN ('participant', 'operator')),
      CONSTRAINT company_users_status_check CHECK (status IN ('invited', 'active', 'disabled'))
    )
  `;

  await sql`
    ALTER TABLE company_users
    ALTER COLUMN email DROP NOT NULL
  `;

  await sql`
    ALTER TABLE company_users
    ADD COLUMN IF NOT EXISTS document_id TEXT
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS company_users_company_idx
    ON company_users (company_id, status)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS company_users_company_role_status_idx
    ON company_users (company_id, role, status)
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS company_users_unique_document_idx
    ON company_users (company_id, document_id)
    WHERE document_id IS NOT NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS company_user_credentials (
      user_id UUID PRIMARY KEY REFERENCES company_users(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS company_predictions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES company_users(id) ON DELETE CASCADE,
      game_mode TEXT NOT NULL,
      scope_key TEXT NOT NULL,
      prediction_json JSONB NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT company_predictions_game_mode_check CHECK (game_mode IN ('simple', 'interactive')),
      CONSTRAINT company_predictions_unique UNIQUE (company_id, user_id, game_mode, scope_key)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS company_predictions_company_idx
    ON company_predictions (company_id, user_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS company_predictions_lookup_idx
    ON company_predictions (company_id, game_mode, scope_key)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS company_official_results (
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      match_id TEXT NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      advancing_team_id TEXT,
      saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (company_id, match_id)
    )
  `;

  await sql`
    ALTER TABLE company_official_results
    ADD COLUMN IF NOT EXISTS advancing_team_id TEXT
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS company_signup_links (
      company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT company_signup_links_status_check CHECK (status IN ('active', 'inactive'))
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS auth_rate_limits (
      scope TEXT NOT NULL,
      bucket_key TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      locked_until_utc TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (scope, bucket_key)
    )
  `;
}

async function ensureSupabaseHardening(sql: SqlClient) {
  for (const tableName of PUBLIC_TABLES_WITH_RLS) {
    await sql.unsafe(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY`);
    await sql.unsafe(`REVOKE ALL ON public.${tableName} FROM anon, authenticated`);
  }
}

export async function ensureDatabaseSchema() {
  if (!isDatabaseConfigured()) {
    return;
  }

  // Production already runs against a provisioned database, so we keep
  // schema bootstrap off the request path unless it is explicitly re-enabled.
  if (!shouldAutoEnsureDatabaseSchema()) {
    return;
  }

  if (!schemaReadyPromise) {
    const sql = getSql();
    schemaReadyPromise = (async () => {
      await ensureLegacySchema(sql);
      await ensureB2BSchema(sql);
      await ensureSupabaseHardening(sql);
    })();
  }

  await schemaReadyPromise;
}

export function parseJsonColumn<T>(value: unknown): T {
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }

  return value as T;
}

export function asIsoString(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}
