"use client";

import { useActionState } from "react";

import {
  changePasswordAction,
  loginAction,
  type ChangePasswordState,
  type LoginActionState,
} from "@/app/c/[slug]/partidos/actions";
import { getLoginCopy, getLoginEmailPlaceholder } from "@/lib/corporate/copy";
import type { CompanyRecord, CompanyUserRecord } from "@/lib/corporate/types";
import styles from "./corporate-shell.module.css";

const LOGIN_INITIAL_STATE: LoginActionState = {};
const CHANGE_INITIAL_STATE: ChangePasswordState = {};

export function LoginForm({ client }: { client: CompanyRecord }) {
  const [state, formAction, isPending] = useActionState(loginAction, LOGIN_INITIAL_STATE);

  return (
    <form action={formAction} className={styles.formCard}>
      <input type="hidden" name="slug" value={client.slug} />

      <div className={styles.formTitleBlock}>
        <span className={styles.formEyebrow}>Ingreso privado</span>
        <h2 className={styles.formTitle}>Entra con tu acceso temporal</h2>
      </div>

      <p className={styles.formHint}>{getLoginCopy(client)}</p>

      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            placeholder={getLoginEmailPlaceholder(client)}
            autoComplete="email"
            required
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="login-password">Contrasena temporal</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
      </div>

      {state.error ? <p className={styles.formError}>{state.error}</p> : null}

      <button type="submit" className={styles.formSubmit} disabled={isPending}>
        {isPending ? "Ingresando..." : "Entrar"}
      </button>
    </form>
  );
}

export function ChangePasswordForm({
  client,
  participant,
}: {
  client: CompanyRecord;
  participant: CompanyUserRecord;
}) {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    CHANGE_INITIAL_STATE,
  );

  return (
    <form action={formAction} className={styles.formCard}>
      <input type="hidden" name="slug" value={client.slug} />
      <input type="hidden" name="companyId" value={client.id} />
      <input type="hidden" name="userId" value={participant.id} />

      <div className={styles.formTitleBlock}>
        <span className={styles.formEyebrow}>Primer ingreso</span>
        <h2 className={styles.formTitle}>Elige tu contrasena definitiva</h2>
      </div>

      <p className={styles.formHint}>
        Hola, {participant.firstName}. Antes de seguir, cambia la contrasena temporal
        por una propia.
      </p>

      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label htmlFor="new-password">Nueva contrasena</label>
          <input
            id="new-password"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="confirm-password">Repetir contrasena</label>
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      {state.error ? <p className={styles.formError}>{state.error}</p> : null}

      <button type="submit" className={styles.formSubmit} disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar contrasena"}
      </button>
    </form>
  );
}
