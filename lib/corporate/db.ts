import { computeScore } from "./scoring";
import { normalizeDocumentId } from "./document-id";
import { buildSimpleModeOfficialFixtureState } from "./simple-mode-official";
import {
  buildCompanySignupToken,
  generateTemporaryPassword,
  hashCompanySignupToken,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "./security";
import type {
  CompanyAccessMode,
  CompanyFixturePrediction,
  CompanyGameMode,
  CompanyRecord,
  CompanySignupLinkRecord,
  CompanyUserRecord,
  Prediction,
} from "./types";
import {
  asIsoString,
  ensureDatabaseSchema,
  getSql,
  parseJsonColumn,
  type SqlClient,
} from "@/lib/db";
import { scoreFixture } from "@/lib/scoring";
import { isSimpleModePredictionComplete } from "@/lib/simple-mode-rules";
import type { FixtureState, TeamId } from "@/lib/world-cup-types";

type CompanyRow = {
  id: string;
  slug: string;
  display_name: string;
  short_name: string;
  tagline: string;
  game_mode: CompanyGameMode;
  access_mode: CompanyAccessMode;
  allowed_email_domain: string | null;
  collects_area: boolean;
  area_label: string;
  status: "draft" | "active" | "paused";
  highlighted_team_ids: unknown;
};

type CompanyBrandingRow = {
  company_id: string;
  primary_color: string;
  primary_dark_color: string;
  primary_hover_color: string;
  background_color: string;
  foreground_color: string;
  muted_color: string;
  line_color: string;
  contrast_on_primary: string;
  logo_text: string | null;
  logo_url: string | null;
};

type CompanyDomainRow = {
  company_id: string;
  domain: string;
  is_primary: boolean;
};

type CompanyUserRow = {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  document_id: string | null;
  area: string | null;
  role: "participant" | "operator";
  status: "invited" | "active" | "disabled";
  must_change_password: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  last_login_at: string | Date | null;
};

type CompanySignupLinkRow = {
  company_id: string;
  token_hash: string;
  status: "active" | "inactive";
  created_at: string | Date;
  updated_at: string | Date;
};

type CompanyCredentialRow = {
  user_id: string;
  password_hash: string;
  password_salt: string;
};

type OfficialResultRowRaw = {
  company_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  advancing_team_id: TeamId | null;
  saved_at: string | Date;
};

const DEFAULT_PREDICTION_RULES: CompanyRecord["predictionRules"] = {
  groups: "1X2",
  roundOf32: "score",
  roundOf16: "score",
  quarterFinal: "score",
  semiFinal: "score",
  bronzeFinal: "score",
  final: "score",
};

function mapCompanyUser(row: CompanyUserRow): CompanyUserRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    email: row.email,
    documentId: row.document_id,
    area: row.area,
    role: row.role,
    status: row.status,
    mustChangePassword: row.must_change_password,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    lastLoginAt: asIsoString(row.last_login_at),
  };
}

async function getBrandingForCompany(sql: SqlClient, companyId: string) {
  const rows = (await sql`
    SELECT
      company_id,
      primary_color,
      primary_dark_color,
      primary_hover_color,
      background_color,
      foreground_color,
      muted_color,
      line_color,
      contrast_on_primary,
      logo_text,
      logo_url
    FROM company_branding
    WHERE company_id = ${companyId}
    LIMIT 1
  `) as CompanyBrandingRow[];

  return rows[0] ?? null;
}

async function getDomainsForCompany(sql: SqlClient, companyId: string) {
  const rows = (await sql`
    SELECT company_id, domain, is_primary
    FROM company_domains
    WHERE company_id = ${companyId}
    ORDER BY is_primary DESC, domain ASC
  `) as CompanyDomainRow[];

  return rows;
}

async function hydrateCompany(sql: SqlClient, row: CompanyRow): Promise<CompanyRecord> {
  const [branding, domains] = await Promise.all([
    getBrandingForCompany(sql, row.id),
    getDomainsForCompany(sql, row.id),
  ]);

  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    shortName: row.short_name,
    tagline: row.tagline,
    gameMode: row.game_mode,
    accessMode: row.access_mode,
    allowedEmailDomain: row.allowed_email_domain,
    collectsArea: row.collects_area,
    areaLabel: row.area_label,
    status: row.status,
    highlightedTeamIds: parseJsonColumn<TeamId[]>(row.highlighted_team_ids) ?? [],
    predictionRules: DEFAULT_PREDICTION_RULES,
    branding: {
      primary: branding?.primary_color ?? "#0f4c81",
      primaryDark: branding?.primary_dark_color ?? "#0a3357",
      primaryHover: branding?.primary_hover_color ?? "#145e9c",
      background: branding?.background_color ?? "#f6f3ee",
      foreground: branding?.foreground_color ?? "#161616",
      muted: branding?.muted_color ?? "#5f6771",
      line: branding?.line_color ?? "rgba(15, 76, 129, 0.16)",
      contrastOnPrimary: branding?.contrast_on_primary ?? "#ffffff",
      logoText: branding?.logo_text ?? null,
      logoUrl: branding?.logo_url ?? null,
    },
    domains: domains.map((domain) => domain.domain),
    primaryDomain: domains.find((domain) => domain.is_primary)?.domain ?? null,
  };
}

function buildSignupLinkPath(slug: string, token: string) {
  return `/c/${slug}/registro?token=${encodeURIComponent(token)}`;
}

async function ensureSignupLinkRow(sql: SqlClient, companyId: string) {
  const token = buildCompanySignupToken(companyId);
  const tokenHash = hashCompanySignupToken(token);

  await sql`
    INSERT INTO company_signup_links (company_id, token_hash, status)
    VALUES (${companyId}, ${tokenHash}, 'active')
    ON CONFLICT (company_id)
    DO UPDATE SET
      token_hash = EXCLUDED.token_hash,
      updated_at = NOW()
    WHERE company_signup_links.token_hash <> EXCLUDED.token_hash
  `;

  return { token, tokenHash };
}

function mapSignupLink(
  row: CompanySignupLinkRow,
  slug: string,
): CompanySignupLinkRecord {
  const token = buildCompanySignupToken(row.company_id);

  return {
    companyId: row.company_id,
    status: row.status,
    token,
    path: buildSignupLinkPath(slug, token),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getCompanyBySlug(slug: string): Promise<CompanyRecord | null> {
  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id,
      slug,
      display_name,
      short_name,
      tagline,
      game_mode,
      access_mode,
      allowed_email_domain,
      collects_area,
      area_label,
      status,
      highlighted_team_ids
    FROM companies
    WHERE slug = ${slug.toLowerCase()}
    LIMIT 1
  `) as CompanyRow[];

  const row = rows[0];
  return row ? hydrateCompany(sql, row) : null;
}

export async function listCompanies(): Promise<CompanyRecord[]> {
  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id,
      slug,
      display_name,
      short_name,
      tagline,
      game_mode,
      access_mode,
      allowed_email_domain,
      collects_area,
      area_label,
      status,
      highlighted_team_ids
    FROM companies
    ORDER BY created_at DESC, display_name ASC
  `) as CompanyRow[];

  return Promise.all(rows.map((row) => hydrateCompany(sql, row)));
}

export async function createCompany(input: {
  slug: string;
  displayName: string;
  shortName: string;
  tagline: string;
  gameMode: CompanyGameMode;
  accessMode: CompanyAccessMode;
  allowedEmailDomain?: string | null;
  collectsArea?: boolean;
  areaLabel?: string;
  primaryDomain?: string | null;
  branding: CompanyRecord["branding"];
}): Promise<CompanyRecord> {
  await ensureDatabaseSchema();
  const sql = getSql();
  const normalizedSlug = input.slug.trim().toLowerCase();
  const domain = input.primaryDomain?.trim().toLowerCase() || `${normalizedSlug}.prode-empresas.com`;
  const highlightedTeamIds = JSON.stringify(["arg"]);

  const companyRows = (await sql`
    INSERT INTO companies (
      slug,
      display_name,
      short_name,
      tagline,
      game_mode,
      access_mode,
      allowed_email_domain,
      collects_area,
      area_label,
      highlighted_team_ids
    )
    VALUES (
      ${normalizedSlug},
      ${input.displayName.trim()},
      ${input.shortName.trim()},
      ${input.tagline.trim()},
      ${input.gameMode},
      ${input.accessMode},
      ${input.allowedEmailDomain?.trim().toLowerCase() || null},
      ${input.collectsArea ?? true},
      ${input.areaLabel?.trim() || "Area"},
      ${highlightedTeamIds}::jsonb
    )
    RETURNING
      id,
      slug,
      display_name,
      short_name,
      tagline,
      game_mode,
      access_mode,
      allowed_email_domain,
      collects_area,
      area_label,
      status,
      highlighted_team_ids
  `) as CompanyRow[];

  const company = companyRows[0];

  await sql`
    INSERT INTO company_branding (
      company_id,
      primary_color,
      primary_dark_color,
      primary_hover_color,
      background_color,
      foreground_color,
      muted_color,
      line_color,
      contrast_on_primary,
      logo_text,
      logo_url
    )
    VALUES (
      ${company.id},
      ${input.branding.primary},
      ${input.branding.primaryDark},
      ${input.branding.primaryHover},
      ${input.branding.background},
      ${input.branding.foreground},
      ${input.branding.muted},
      ${input.branding.line},
      ${input.branding.contrastOnPrimary},
      ${input.branding.logoText ?? null},
      ${input.branding.logoUrl ?? null}
    )
  `;

  await sql`
    INSERT INTO company_domains (company_id, domain, is_primary)
    VALUES (${company.id}, ${domain}, true)
  `;

  if (input.accessMode === "signup_link") {
    await ensureSignupLinkRow(sql, company.id);
  }

  return hydrateCompany(sql, company);
}

export async function updateCompanySettings(input: {
  companyId: string;
  displayName: string;
  shortName: string;
  tagline: string;
  accessMode: CompanyAccessMode;
  allowedEmailDomain: string | null;
  collectsArea: boolean;
  areaLabel: string;
  branding: CompanyRecord["branding"];
}) {
  await ensureDatabaseSchema();
  const sql = getSql();

  await sql`
    UPDATE companies
    SET
      display_name = ${input.displayName.trim()},
      short_name = ${input.shortName.trim()},
      tagline = ${input.tagline.trim()},
      access_mode = ${input.accessMode},
      allowed_email_domain = ${input.allowedEmailDomain?.trim().toLowerCase() || null},
      collects_area = ${input.collectsArea},
      area_label = ${input.areaLabel.trim()},
      updated_at = NOW()
    WHERE id = ${input.companyId}
  `;

  await sql`
    UPDATE company_branding
    SET
      primary_color = ${input.branding.primary},
      primary_dark_color = ${input.branding.primaryDark},
      primary_hover_color = ${input.branding.primaryHover},
      background_color = ${input.branding.background},
      foreground_color = ${input.branding.foreground},
      muted_color = ${input.branding.muted},
      line_color = ${input.branding.line},
      contrast_on_primary = ${input.branding.contrastOnPrimary},
      logo_text = ${input.branding.logoText ?? null},
      logo_url = ${input.branding.logoUrl ?? null},
      updated_at = NOW()
    WHERE company_id = ${input.companyId}
  `;

  if (input.accessMode === "signup_link") {
    await ensureSignupLinkRow(sql, input.companyId);
  }
}

export async function listUsersForCompany(companyId: string): Promise<CompanyUserRecord[]> {
  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id,
      company_id,
      first_name,
      last_name,
      full_name,
      email,
      document_id,
      area,
      role,
      status,
      must_change_password,
      created_at,
      updated_at,
      last_login_at
    FROM company_users
    WHERE company_id = ${companyId}
    ORDER BY created_at ASC
  `) as CompanyUserRow[];

  return rows.map(mapCompanyUser);
}

export async function getCompanySignupLink(
  companyId: string,
  slug: string,
): Promise<CompanySignupLinkRecord | null> {
  await ensureDatabaseSchema();
  const sql = getSql();
  await ensureSignupLinkRow(sql, companyId);

  const rows = (await sql`
    SELECT company_id, token_hash, status, created_at, updated_at
    FROM company_signup_links
    WHERE company_id = ${companyId}
    LIMIT 1
  `) as CompanySignupLinkRow[];

  return rows[0] ? mapSignupLink(rows[0], slug) : null;
}

export async function updateCompanySignupLinkStatus(input: {
  companyId: string;
  status: "active" | "inactive";
}) {
  await ensureDatabaseSchema();
  const sql = getSql();
  await ensureSignupLinkRow(sql, input.companyId);

  await sql`
    UPDATE company_signup_links
    SET
      status = ${input.status},
      updated_at = NOW()
    WHERE company_id = ${input.companyId}
  `;
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? "";
  return {
    firstName,
    lastName: parts.join(" ") || firstName,
  };
}

export interface ImportedUserResult {
  user: CompanyUserRecord;
  temporaryPassword: string;
}

export async function importCompanyUsers(
  companyId: string,
  entries: Array<{ fullName: string; email: string; area?: string | null }>,
): Promise<ImportedUserResult[]> {
  await ensureDatabaseSchema();
  const sql = getSql();
  const imported: ImportedUserResult[] = [];

  for (const entry of entries) {
    const fullName = entry.fullName.trim();
    const email = normalizeEmail(entry.email);
    const area = entry.area?.trim() || null;
    const { firstName, lastName } = splitFullName(fullName);

    const existingRows = (await sql`
      SELECT
        id,
        company_id,
        first_name,
        last_name,
        full_name,
        email,
        document_id,
        area,
        role,
        status,
        must_change_password,
        created_at,
        updated_at,
        last_login_at
      FROM company_users
      WHERE company_id = ${companyId}
        AND email = ${email}
      LIMIT 1
    `) as CompanyUserRow[];

    const temporaryPassword = generateTemporaryPassword();
    const password = hashPassword(temporaryPassword);

    if (existingRows[0]) {
      const existing = existingRows[0];

      const updatedRows = (await sql`
        UPDATE company_users
        SET
          first_name = ${firstName},
          last_name = ${lastName},
          full_name = ${fullName},
          area = ${area},
          status = 'invited',
          must_change_password = true,
          updated_at = NOW()
        WHERE id = ${existing.id}
        RETURNING
          id,
          company_id,
          first_name,
          last_name,
          full_name,
          email,
          document_id,
          area,
          role,
          status,
          must_change_password,
          created_at,
          updated_at,
          last_login_at
      `) as CompanyUserRow[];

      await sql`
        INSERT INTO company_user_credentials (user_id, password_hash, password_salt)
        VALUES (${existing.id}, ${password.hash}, ${password.salt})
        ON CONFLICT (user_id)
        DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          password_salt = EXCLUDED.password_salt,
          updated_at = NOW()
      `;

      imported.push({
        user: mapCompanyUser(updatedRows[0]),
        temporaryPassword,
      });

      continue;
    }

    const insertedRows = (await sql`
      INSERT INTO company_users (
        company_id,
          first_name,
          last_name,
          full_name,
          email,
          document_id,
          area,
        status,
        must_change_password
      )
      VALUES (
        ${companyId},
        ${firstName},
        ${lastName},
        ${fullName},
        ${email},
        ${null},
        ${area},
        'invited',
        true
      )
      RETURNING
        id,
        company_id,
        first_name,
        last_name,
        full_name,
        email,
        document_id,
        area,
        role,
        status,
        must_change_password,
        created_at,
        updated_at,
        last_login_at
    `) as CompanyUserRow[];

    const user = insertedRows[0];

    await sql`
      INSERT INTO company_user_credentials (user_id, password_hash, password_salt)
      VALUES (${user.id}, ${password.hash}, ${password.salt})
    `;

    imported.push({
      user: mapCompanyUser(user),
      temporaryPassword,
    });
  }

  return imported;
}

export async function resetCompanyUserPassword(input: {
  companyId: string;
  userId: string;
}) {
  await ensureDatabaseSchema();
  const sql = getSql();
  const temporaryPassword = generateTemporaryPassword();
  const password = hashPassword(temporaryPassword);

  await sql`
    UPDATE company_users
    SET
      must_change_password = true,
      status = 'invited',
      updated_at = NOW()
    WHERE id = ${input.userId}
      AND company_id = ${input.companyId}
  `;

  await sql`
    INSERT INTO company_user_credentials (user_id, password_hash, password_salt)
    VALUES (${input.userId}, ${password.hash}, ${password.salt})
    ON CONFLICT (user_id)
    DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      password_salt = EXCLUDED.password_salt,
      updated_at = NOW()
  `;

  return temporaryPassword;
}

export async function setCompanyUserStatus(input: {
  companyId: string;
  userId: string;
  status: "active" | "disabled";
}) {
  await ensureDatabaseSchema();
  const sql = getSql();
  const statusRows =
    input.status === "disabled"
      ? []
      : (await sql`
          SELECT CASE
            WHEN must_change_password THEN 'invited'
            ELSE 'active'
          END AS next_status
          FROM company_users
          WHERE id = ${input.userId}
            AND company_id = ${input.companyId}
          LIMIT 1
        `) as Array<{ next_status: "active" | "invited" }>;
  const nextStatus =
    input.status === "disabled" ? "disabled" : statusRows[0]?.next_status ?? "active";

  const rows = (await sql`
    UPDATE company_users
    SET
      status = ${nextStatus},
      updated_at = NOW()
    WHERE id = ${input.userId}
      AND company_id = ${input.companyId}
    RETURNING
      id,
      company_id,
      first_name,
      last_name,
      full_name,
      email,
      document_id,
      area,
      role,
      status,
      must_change_password,
      created_at,
      updated_at,
      last_login_at
  `) as CompanyUserRow[];

  return rows[0] ? mapCompanyUser(rows[0]) : null;
}

export type SignupParticipantResult =
  | { kind: "created"; user: CompanyUserRecord }
  | { kind: "existing"; user: CompanyUserRecord };

export async function createSignupLinkParticipant(input: {
  companyId: string;
  firstName: string;
  lastName: string;
  area: string | null;
  documentId: string;
  password: string;
}): Promise<SignupParticipantResult> {
  await ensureDatabaseSchema();
  const sql = getSql();
  const documentId = normalizeDocumentId(input.documentId);

  if (!documentId) {
    throw new Error("DNI invalido.");
  }

  const existingRows = (await sql`
    SELECT
      id,
      company_id,
      first_name,
      last_name,
      full_name,
      email,
      document_id,
      area,
      role,
      status,
      must_change_password,
      created_at,
      updated_at,
      last_login_at
    FROM company_users
    WHERE company_id = ${input.companyId}
      AND document_id = ${documentId}
    LIMIT 1
  `) as CompanyUserRow[];

  if (existingRows[0]) {
    return {
      kind: "existing",
      user: mapCompanyUser(existingRows[0]),
    };
  }

  const password = hashPassword(input.password);
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const insertedRows = (await sql`
    INSERT INTO company_users (
      company_id,
      first_name,
      last_name,
      full_name,
      email,
      document_id,
      area,
      status,
      must_change_password
    )
    VALUES (
      ${input.companyId},
      ${input.firstName.trim()},
      ${input.lastName.trim()},
      ${fullName},
      ${null},
      ${documentId},
      ${input.area?.trim() || null},
      'active',
      false
    )
    RETURNING
      id,
      company_id,
      first_name,
      last_name,
      full_name,
      email,
      document_id,
      area,
      role,
      status,
      must_change_password,
      created_at,
      updated_at,
      last_login_at
  `) as CompanyUserRow[];

  const user = insertedRows[0];

  await sql`
    INSERT INTO company_user_credentials (user_id, password_hash, password_salt)
    VALUES (${user.id}, ${password.hash}, ${password.salt})
  `;

  return {
    kind: "created",
    user: mapCompanyUser(user),
  };
}

async function getUserCredential(sql: SqlClient, userId: string) {
  const rows = (await sql`
    SELECT user_id, password_hash, password_salt
    FROM company_user_credentials
    WHERE user_id = ${userId}
    LIMIT 1
  `) as CompanyCredentialRow[];

  return rows[0] ?? null;
}

export async function isSignupLinkTokenValid(input: {
  companyId: string;
  token: string;
}) {
  await ensureDatabaseSchema();
  const sql = getSql();
  await ensureSignupLinkRow(sql, input.companyId);

  const rows = (await sql`
    SELECT company_id, token_hash, status, created_at, updated_at
    FROM company_signup_links
    WHERE company_id = ${input.companyId}
    LIMIT 1
  `) as CompanySignupLinkRow[];

  const link = rows[0];
  if (!link || link.status !== "active") {
    return false;
  }

  const expectedToken = buildCompanySignupToken(input.companyId);
  if (input.token !== expectedToken) {
    return false;
  }

  return hashCompanySignupToken(input.token) === link.token_hash;
}

export async function authenticateCompanyUser(input: {
  companyId: string;
  accessMode: CompanyAccessMode;
  identifier: string;
  password: string;
}) {
  await ensureDatabaseSchema();
  const sql = getSql();
  let userRows: CompanyUserRow[] = [];

  if (input.accessMode === "signup_link") {
    const documentId = normalizeDocumentId(input.identifier);
    if (!documentId) {
      return null;
    }

    userRows = (await sql`
      SELECT
        id,
        company_id,
        first_name,
        last_name,
        full_name,
        email,
        document_id,
        area,
        role,
        status,
        must_change_password,
        created_at,
        updated_at,
        last_login_at
      FROM company_users
      WHERE company_id = ${input.companyId}
        AND document_id = ${documentId}
      LIMIT 1
    `) as CompanyUserRow[];
  } else {
    const email = normalizeEmail(input.identifier);
    userRows = (await sql`
      SELECT
        id,
        company_id,
        first_name,
        last_name,
        full_name,
        email,
        document_id,
        area,
        role,
        status,
        must_change_password,
        created_at,
        updated_at,
        last_login_at
      FROM company_users
      WHERE company_id = ${input.companyId}
        AND email = ${email}
      LIMIT 1
    `) as CompanyUserRow[];
  }

  const user = userRows[0];
  if (!user || user.status === "disabled") {
    return null;
  }

  const credential = await getUserCredential(sql, user.id);
  if (!credential) {
    return null;
  }

  const valid = verifyPassword(
    input.password,
    credential.password_salt,
    credential.password_hash,
  );

  if (!valid) {
    return null;
  }

  await sql`
    UPDATE company_users
    SET
      status = 'active',
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = ${user.id}
  `;

  return mapCompanyUser({
    ...user,
    status: "active",
    last_login_at: new Date(),
  });
}

export async function changeCompanyUserPassword(input: {
  companyId: string;
  userId: string;
  password: string;
}) {
  await ensureDatabaseSchema();
  const sql = getSql();
  const password = hashPassword(input.password);

  await sql`
    UPDATE company_users
    SET
      must_change_password = false,
      status = 'active',
      updated_at = NOW()
    WHERE id = ${input.userId}
      AND company_id = ${input.companyId}
  `;

  await sql`
    INSERT INTO company_user_credentials (user_id, password_hash, password_salt)
    VALUES (${input.userId}, ${password.hash}, ${password.salt})
    ON CONFLICT (user_id)
    DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      password_salt = EXCLUDED.password_salt,
      updated_at = NOW()
  `;
}

export async function getCompanyUserById(
  companyId: string,
  userId: string,
): Promise<CompanyUserRecord | null> {
  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id,
      company_id,
      first_name,
      last_name,
      full_name,
      email,
      document_id,
      area,
      role,
      status,
      must_change_password,
      created_at,
      updated_at,
      last_login_at
    FROM company_users
    WHERE id = ${userId}
      AND company_id = ${companyId}
      AND status <> 'disabled'
    LIMIT 1
  `) as CompanyUserRow[];

  return rows[0] ? mapCompanyUser(rows[0]) : null;
}

export async function getInteractivePredictionsForUser(
  companyId: string,
  userId: string,
): Promise<Record<string, Prediction>> {
  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      scope_key,
      prediction_json
    FROM company_predictions
    WHERE company_id = ${companyId}
      AND user_id = ${userId}
      AND game_mode = 'interactive'
  `) as Array<{ scope_key: string; prediction_json: unknown }>;

  return Object.fromEntries(
    rows.map((row) => [row.scope_key, parseJsonColumn<Prediction>(row.prediction_json)]),
  );
}

export async function upsertInteractivePrediction(input: {
  companyId: string;
  userId: string;
  matchId: string;
  prediction: Prediction;
}) {
  await ensureDatabaseSchema();
  const sql = getSql();
  const json = JSON.stringify(input.prediction);

  await sql`
    INSERT INTO company_predictions (
      company_id,
      user_id,
      game_mode,
      scope_key,
      prediction_json
    )
    VALUES (
      ${input.companyId},
      ${input.userId},
      'interactive',
      ${input.matchId},
      ${json}::jsonb
    )
    ON CONFLICT (company_id, user_id, game_mode, scope_key)
    DO UPDATE SET
      prediction_json = EXCLUDED.prediction_json,
      updated_at = NOW()
  `;
}

export async function getFixturePredictionForUser(
  companyId: string,
  userId: string,
): Promise<CompanyFixturePrediction | null> {
  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      prediction_json,
      updated_at
    FROM company_predictions
    WHERE company_id = ${companyId}
      AND user_id = ${userId}
      AND game_mode = 'simple'
      AND scope_key = 'full-fixture'
    LIMIT 1
  `) as Array<{ prediction_json: unknown; updated_at: string | Date }>;

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    fixtureState: parseJsonColumn<FixtureState>(row.prediction_json),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function upsertFixturePrediction(input: {
  companyId: string;
  userId: string;
  fixtureState: FixtureState;
}) {
  await ensureDatabaseSchema();
  const sql = getSql();
  const json = JSON.stringify(input.fixtureState);

  await sql`
    INSERT INTO company_predictions (
      company_id,
      user_id,
      game_mode,
      scope_key,
      prediction_json
    )
    VALUES (
      ${input.companyId},
      ${input.userId},
      'simple',
      'full-fixture',
      ${json}::jsonb
    )
    ON CONFLICT (company_id, user_id, game_mode, scope_key)
    DO UPDATE SET
      prediction_json = EXCLUDED.prediction_json,
      updated_at = NOW()
  `;
}

export interface OfficialResultRow {
  companyId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  advancingTeamId: TeamId | null;
  savedAt: string;
}

export async function getOfficialResultsForCompany(
  companyId: string,
): Promise<Record<string, OfficialResultRow>> {
  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT company_id, match_id, home_score, away_score, advancing_team_id, saved_at
    FROM company_official_results
    WHERE company_id = ${companyId}
  `) as OfficialResultRowRaw[];

  return Object.fromEntries(
    rows.map((row) => [
      row.match_id,
      {
        companyId: row.company_id,
        matchId: row.match_id,
        homeScore: row.home_score,
        awayScore: row.away_score,
        advancingTeamId: row.advancing_team_id,
        savedAt: new Date(row.saved_at).toISOString(),
      },
    ]),
  );
}

async function recalculateInteractiveMatchPoints(input: {
  sql: SqlClient;
  companyId: string;
  matchId: string;
  home: number;
  away: number;
}) {
  const rows = (await input.sql`
    SELECT id, prediction_json
    FROM company_predictions
    WHERE company_id = ${input.companyId}
      AND game_mode = 'interactive'
      AND scope_key = ${input.matchId}
  `) as Array<{ id: string; prediction_json: unknown }>;

  for (const row of rows) {
    const prediction = parseJsonColumn<Prediction>(row.prediction_json);
    const points = computeScore(prediction, {
      home: input.home,
      away: input.away,
    });

    await input.sql`
      UPDATE company_predictions
      SET points = ${points}
      WHERE id = ${row.id}
    `;
  }
}

export async function saveOfficialResult(input: {
  companyId: string;
  matchId: string;
  home: number;
  away: number;
  advancingTeamId?: TeamId | null;
}) {
  await ensureDatabaseSchema();
  const sql = getSql();

  await sql`
    INSERT INTO company_official_results (
      company_id,
      match_id,
      home_score,
      away_score,
      advancing_team_id
    )
    VALUES (
      ${input.companyId},
      ${input.matchId},
      ${input.home},
      ${input.away},
      ${input.advancingTeamId ?? null}
    )
    ON CONFLICT (company_id, match_id)
    DO UPDATE SET
      home_score = EXCLUDED.home_score,
      away_score = EXCLUDED.away_score,
      advancing_team_id = EXCLUDED.advancing_team_id,
      saved_at = NOW()
  `;

  await recalculateInteractiveMatchPoints({
    sql,
    companyId: input.companyId,
    matchId: input.matchId,
    home: input.home,
    away: input.away,
  });
}

export async function deleteOfficialResult(input: {
  companyId: string;
  matchId: string;
}) {
  await ensureDatabaseSchema();
  const sql = getSql();

  await sql`
    DELETE FROM company_official_results
    WHERE company_id = ${input.companyId}
      AND match_id = ${input.matchId}
  `;

  await sql`
    UPDATE company_predictions
    SET points = 0
    WHERE company_id = ${input.companyId}
      AND game_mode = 'interactive'
      AND scope_key = ${input.matchId}
  `;
}

export interface LeaderboardRow {
  id: string;
  fullName: string;
  area: string | null;
  totalPoints: number;
  preWorldCupPoints: number;
  knockoutPoints: number;
  predictionCount: number;
  mustChangePassword: boolean;
}

async function getInteractiveLeaderboardForCompany(companyId: string) {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      u.id,
      u.full_name,
      u.area,
      u.must_change_password,
      COALESCE(SUM(p.points), 0)::int AS total_points,
      COUNT(p.id)::int AS prediction_count
    FROM company_users u
    LEFT JOIN company_predictions p
      ON p.user_id = u.id
      AND p.company_id = u.company_id
    WHERE u.company_id = ${companyId}
      AND u.role = 'participant'
      AND u.status <> 'disabled'
    GROUP BY u.id, u.full_name, u.area, u.must_change_password
    ORDER BY total_points DESC, u.full_name ASC
  `) as Array<{
    id: string;
    full_name: string;
    area: string | null;
    must_change_password: boolean;
    total_points: number;
    prediction_count: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    area: row.area,
    totalPoints: row.total_points,
    preWorldCupPoints: 0,
    knockoutPoints: row.total_points,
    predictionCount: row.prediction_count,
    mustChangePassword: row.must_change_password,
  }));
}

async function getSimpleLeaderboardForCompany(companyId: string) {
  const sql = getSql();
  const [users, predictions, officialResults] = await Promise.all([
    sql`
      SELECT id, full_name, area, must_change_password
      FROM company_users
      WHERE company_id = ${companyId}
        AND role = 'participant'
        AND status <> 'disabled'
      ORDER BY full_name ASC
    ` as Promise<
      Array<{
        id: string;
        full_name: string;
        area: string | null;
        must_change_password: boolean;
      }>
    >,
    sql`
      SELECT user_id, prediction_json
      FROM company_predictions
      WHERE company_id = ${companyId}
        AND game_mode = 'simple'
        AND scope_key = 'full-fixture'
    ` as Promise<Array<{ user_id: string; prediction_json: unknown }>>,
    getOfficialResultsForCompany(companyId),
  ]);

  const officialState = buildSimpleModeOfficialFixtureState(officialResults);
  const predictionsByUserId = new Map(
    predictions.map((row) => [
      row.user_id,
      parseJsonColumn<FixtureState>(row.prediction_json),
    ]),
  );

  return users
    .map((user) => {
      const fixtureState = predictionsByUserId.get(user.id);
      const isComplete = fixtureState ? isSimpleModePredictionComplete(fixtureState) : false;
      const score =
        fixtureState && isComplete ? scoreFixture(fixtureState, officialState) : null;

      return {
        id: user.id,
        fullName: user.full_name,
        area: user.area,
        totalPoints: score?.total ?? 0,
        preWorldCupPoints: score?.preWorldCupPoints ?? 0,
        knockoutPoints: score?.knockoutPoints ?? 0,
        predictionCount: isComplete ? 1 : 0,
        mustChangePassword: user.must_change_password,
      };
    })
    .sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }

      if (right.preWorldCupPoints !== left.preWorldCupPoints) {
        return right.preWorldCupPoints - left.preWorldCupPoints;
      }

      return left.fullName.localeCompare(right.fullName, "es-AR");
    });
}

export async function getLeaderboardForCompany(
  companyId: string,
  gameMode: CompanyGameMode,
): Promise<LeaderboardRow[]> {
  await ensureDatabaseSchema();

  if (gameMode === "simple") {
    return getSimpleLeaderboardForCompany(companyId);
  }

  return getInteractiveLeaderboardForCompany(companyId);
}
