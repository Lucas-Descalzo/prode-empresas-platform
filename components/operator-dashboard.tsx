"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  createCompanyAction,
  importUsersAction,
  resetUserPasswordAction,
  updateCompanyAction,
  type CreateCompanyActionState,
  type ImportUsersActionState,
  type ResetUserPasswordState,
  type UpdateCompanyActionState,
} from "@/app/admin/actions";
import type { CompanyRecord, CompanyUserRecord } from "@/lib/corporate/types";
import { AdminLogoutButton } from "./admin-logout-button";
import styles from "./operator-dashboard.module.css";

type CompanyWithUsers = CompanyRecord & { users: CompanyUserRecord[] };

const CREATE_INITIAL_STATE: CreateCompanyActionState = {};
const IMPORT_INITIAL_STATE: ImportUsersActionState = {};
const RESET_INITIAL_STATE: ResetUserPasswordState = {};
const UPDATE_INITIAL_STATE: UpdateCompanyActionState = {};

export function AdminDashboard({ companies }: { companies: CompanyWithUsers[] }) {
  const totalUsers = companies.reduce((sum, company) => sum + company.users.length, 0);
  const activeCompanies = companies.filter((company) => company.status === "active").length;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Panel operador</span>
          <h1>Versión madre B2B lista para alta de empresas y padrón inicial.</h1>
          <p>
            Desde acá ya podés crear cada tenant, definir branding, importar
            participantes y regenerar accesos temporales.
          </p>
        </div>

        <div className={styles.heroActions}>
          <AdminLogoutButton />
        </div>
      </section>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <span>Empresas</span>
          <strong>{companies.length}</strong>
        </article>
        <article className={styles.statCard}>
          <span>Empresas activas</span>
          <strong>{activeCompanies}</strong>
        </article>
        <article className={styles.statCard}>
          <span>Usuarios cargados</span>
          <strong>{totalUsers}</strong>
        </article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Nueva empresa</span>
          <h2>Alta de tenant</h2>
        </div>
        <CreateCompanyForm />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Empresas</span>
          <h2>Operación actual</h2>
        </div>

        <div className={styles.companyGrid}>
          {companies.length === 0 ? (
            <div className={styles.emptyState}>
              Todavía no hay empresas creadas. La primera alta desde este panel ya te
              deja un slug listo para su subdominio futuro.
            </div>
          ) : (
            companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function CreateCompanyForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    createCompanyAction,
    CREATE_INITIAL_STATE,
  );

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    router.refresh();
  }, [router, state.success]);

  return (
    <form action={formAction} className={styles.formCard} ref={formRef}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Nombre visible</span>
          <input name="displayName" placeholder="Acme Mundial 2026" required />
        </label>

        <label className={styles.field}>
          <span>Nombre corto</span>
          <input name="shortName" placeholder="Acme" required />
        </label>

        <label className={styles.field}>
          <span>Slug</span>
          <input name="slug" placeholder="acme" required />
        </label>

        <label className={styles.field}>
          <span>Tagline</span>
          <input
            name="tagline"
            placeholder="Edición interna Mundial 2026"
            required
          />
        </label>

        <label className={styles.field}>
          <span>Modo de juego</span>
          <select name="gameMode" defaultValue="interactive">
            <option value="interactive">Interactivo</option>
            <option value="simple">Simple</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Modo de acceso</span>
          <select name="accessMode" defaultValue="invited_only">
            <option value="invited_only">Invitados</option>
            <option value="corporate_domain_signup">Registro por dominio</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Dominio corporativo</span>
          <input name="allowedEmailDomain" placeholder="empresa.com" />
        </label>

        <label className={styles.field}>
          <span>Etiqueta de área</span>
          <input name="areaLabel" placeholder="Área" defaultValue="Área" />
        </label>

        <label className={styles.field}>
          <span>Color principal</span>
          <input name="primaryColor" type="color" defaultValue="#0f4c81" />
        </label>

        <label className={styles.field}>
          <span>Color de fondo</span>
          <input name="backgroundColor" type="color" defaultValue="#f6f3ee" />
        </label>

        <label className={styles.field}>
          <span>Texto del logo</span>
          <input name="logoText" placeholder="Acme" />
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            name="collectsArea"
            value="true"
            defaultChecked
          />
          <span>Guardar área o sector del participante</span>
        </label>
      </div>

      <button type="submit" className={styles.primaryButton} disabled={isPending}>
        {isPending ? "Creando..." : "Crear empresa"}
      </button>

      {state.error ? <p className={styles.error}>{state.error}</p> : null}
      {state.success ? (
        <p className={styles.success}>
          {state.success} · subdominio sugerido: {state.createdSlug}.prode-empresas.com
        </p>
      ) : null}
    </form>
  );
}

function CompanyCard({ company }: { company: CompanyWithUsers }) {
  const invitedUsers = company.users.filter((user) => user.status === "invited").length;
  const activeUsers = company.users.filter((user) => user.status === "active").length;

  return (
    <article className={styles.companyCard}>
      <header className={styles.companyHeader}>
        <div>
          <span className={styles.companySlug}>{company.slug}</span>
          <h3>{company.displayName}</h3>
          <p>{company.tagline}</p>
        </div>

        <div className={styles.companyMeta}>
          <span>{company.gameMode === "interactive" ? "Interactivo" : "Simple"}</span>
          <span>{company.accessMode === "invited_only" ? "Invitados" : "Dominio"}</span>
          <span>{company.primaryDomain ?? `${company.slug}.prode-empresas.com`}</span>
        </div>
      </header>

      <div className={styles.metrics}>
        <span>{company.users.length} usuarios</span>
        <span>{activeUsers} activos</span>
        <span>{invitedUsers} pendientes</span>
      </div>

      <UpdateCompanyForm company={company} />

      <ImportUsersForm company={company} />

      <div className={styles.userList}>
        {company.users.length === 0 ? (
          <p className={styles.inlineMuted}>Todavía no hay participantes importados.</p>
        ) : (
          company.users.map((user) => <UserRow key={user.id} company={company} user={user} />)
        )}
      </div>
    </article>
  );
}

function UpdateCompanyForm({ company }: { company: CompanyWithUsers }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateCompanyAction,
    UPDATE_INITIAL_STATE,
  );

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
  }, [router, state.success]);

  return (
    <form action={formAction} className={styles.subForm}>
      <input type="hidden" name="companyId" value={company.id} />

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Nombre visible</span>
          <input name="displayName" defaultValue={company.displayName} required />
        </label>

        <label className={styles.field}>
          <span>Nombre corto</span>
          <input name="shortName" defaultValue={company.shortName} required />
        </label>

        <label className={styles.field}>
          <span>Tagline</span>
          <input name="tagline" defaultValue={company.tagline} required />
        </label>

        <label className={styles.field}>
          <span>Etiqueta de área</span>
          <input name="areaLabel" defaultValue={company.areaLabel} />
        </label>

        <label className={styles.field}>
          <span>Color principal</span>
          <input name="primaryColor" type="color" defaultValue={company.branding.primary} />
        </label>

        <label className={styles.field}>
          <span>Color de fondo</span>
          <input
            name="backgroundColor"
            type="color"
            defaultValue={company.branding.background}
          />
        </label>

        <label className={styles.field}>
          <span>Texto del logo</span>
          <input name="logoText" defaultValue={company.branding.logoText ?? ""} />
        </label>

        <label className={styles.field}>
          <span>URL del logo</span>
          <input
            name="logoUrl"
            defaultValue={company.branding.logoUrl ?? ""}
            placeholder="https://..."
          />
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            name="collectsArea"
            value="true"
            defaultChecked={company.collectsArea}
          />
          <span>Guardar área o sector del participante</span>
        </label>
      </div>

      <button type="submit" className={styles.secondaryButton} disabled={isPending}>
        {isPending ? "Actualizando..." : "Actualizar empresa"}
      </button>

      {state.error ? <p className={styles.error}>{state.error}</p> : null}
      {state.success ? <p className={styles.success}>{state.success}</p> : null}
    </form>
  );
}

function ImportUsersForm({ company }: { company: CompanyWithUsers }) {
  const [state, formAction, isPending] = useActionState(
    importUsersAction,
    IMPORT_INITIAL_STATE,
  );

  return (
    <form action={formAction} className={styles.subForm}>
      <input type="hidden" name="companyId" value={company.id} />
      <input type="hidden" name="companyName" value={company.displayName} />

      <label className={styles.field}>
        <span>Importar participantes</span>
        <textarea
          name="rows"
          rows={5}
          placeholder={"Nombre Apellido,email@empresa.com,Comercial\nOtro Nombre,mail@empresa.com,Marketing"}
        />
      </label>

      <button type="submit" className={styles.secondaryButton} disabled={isPending}>
        {isPending ? "Importando..." : "Preparar accesos"}
      </button>

      <p className={styles.inlineMuted}>
        Formato: nombre completo, email y área opcional. Acepta coma, punto y coma
        o tabulación.
      </p>

      {state.error ? <p className={styles.error}>{state.error}</p> : null}
      {state.success ? <p className={styles.success}>{state.success}</p> : null}

      {state.credentials?.length ? (
        <div className={styles.credentialsBox}>
          {state.credentials.map((credential) => (
            <div key={credential.email} className={styles.credentialRow}>
              <strong>{credential.fullName}</strong>
              <span>{credential.email}</span>
              <code>{credential.temporaryPassword}</code>
            </div>
          ))}
        </div>
      ) : null}
    </form>
  );
}

function UserRow({
  company,
  user,
}: {
  company: CompanyWithUsers;
  user: CompanyUserRecord;
}) {
  const [state, formAction, isPending] = useActionState(
    resetUserPasswordAction,
    RESET_INITIAL_STATE,
  );

  return (
    <div className={styles.userRow}>
      <div>
        <strong>{user.fullName}</strong>
        <p>
          {user.email}
          {company.collectsArea && user.area ? ` · ${user.area}` : ""}
        </p>
      </div>

      <div className={styles.userActions}>
        <span className={styles.userStatus}>{user.status}</span>
        <form action={formAction}>
          <input type="hidden" name="companyId" value={company.id} />
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="fullName" value={user.fullName} />
          <button type="submit" className={styles.ghostButton} disabled={isPending}>
            {isPending ? "..." : "Resetear clave"}
          </button>
        </form>
      </div>

      {state.error ? <p className={styles.error}>{state.error}</p> : null}
      {state.temporaryPassword ? (
        <p className={styles.success}>
          {state.success} · temporal: <code>{state.temporaryPassword}</code>
        </p>
      ) : null}
    </div>
  );
}
