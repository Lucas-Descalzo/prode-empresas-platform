"use client";

import { useActionState } from "react";
import type {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
} from "react";

import {
  changePasswordAction,
  loginAction,
  type ChangePasswordState,
  type LoginActionState,
} from "@/app/c/[slug]/partidos/actions";
import { sanitizeDocumentIdInput } from "@/lib/corporate/document-id";
import {
  getLoginCopy,
  getLoginIdentifierLabel,
  getLoginIdentifierPlaceholder,
  getLoginPasswordLabel,
  getLoginTitle,
} from "@/lib/corporate/copy";
import type { CompanyRecord, CompanyUserRecord } from "@/lib/corporate/types";
import styles from "./corporate-shell.module.css";

const LOGIN_INITIAL_STATE: LoginActionState = {};
const CHANGE_INITIAL_STATE: ChangePasswordState = {};

function handleDocumentIdChange(event: ChangeEvent<HTMLInputElement>) {
  const nextValue = sanitizeDocumentIdInput(event.currentTarget.value);
  if (event.currentTarget.value !== nextValue) {
    event.currentTarget.value = nextValue;
  }
}

function handleDocumentIdKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.key.length !== 1
  ) {
    return;
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
  }
}

function handleDocumentIdPaste(event: ClipboardEvent<HTMLInputElement>) {
  const pasted = event.clipboardData.getData("text");
  if (!/^\d+$/.test(pasted)) {
    event.preventDefault();
  }
}

export function LoginForm({ client }: { client: CompanyRecord }) {
  const [state, formAction, isPending] = useActionState(loginAction, LOGIN_INITIAL_STATE);
  const usesDocumentId = client.accessMode === "signup_link";

  return (
    <form action={formAction} className={styles.formCard}>
      <input type="hidden" name="slug" value={client.slug} />

      <div className={styles.formTitleBlock}>
        <span className={styles.formEyebrow}>Ingreso privado</span>
        <h2 className={styles.formTitle}>{getLoginTitle(client)}</h2>
      </div>

      <p className={styles.formHint}>{getLoginCopy(client)}</p>

      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label htmlFor="login-identifier">{getLoginIdentifierLabel(client)}</label>
          <input
            id="login-identifier"
            name="identifier"
            type={usesDocumentId ? "text" : "email"}
            placeholder={getLoginIdentifierPlaceholder(client)}
            autoComplete={usesDocumentId ? "off" : "email"}
            inputMode={usesDocumentId ? "numeric" : undefined}
            pattern={usesDocumentId ? "[0-9]{7,8}" : undefined}
            minLength={usesDocumentId ? 7 : undefined}
            maxLength={usesDocumentId ? 8 : undefined}
            onChange={usesDocumentId ? handleDocumentIdChange : undefined}
            onKeyDown={usesDocumentId ? handleDocumentIdKeyDown : undefined}
            onPaste={usesDocumentId ? handleDocumentIdPaste : undefined}
            required
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="login-password">{getLoginPasswordLabel(client)}</label>
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
