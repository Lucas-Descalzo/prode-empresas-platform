"use client";

import Link from "next/link";
import { useActionState } from "react";
import type {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
} from "react";

import { signupAction, type SignupActionState } from "@/app/c/[slug]/registro/actions";
import { sanitizeDocumentIdInput } from "@/lib/corporate/document-id";
import type { CompanyRecord } from "@/lib/corporate/types";
import styles from "./corporate-shell.module.css";

const INITIAL_STATE: SignupActionState = {};

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

export function SignupForm({
  client,
  token,
}: {
  client: CompanyRecord;
  token: string;
}) {
  const [state, formAction, isPending] = useActionState(signupAction, INITIAL_STATE);

  return (
    <form action={formAction} className={styles.formCard}>
      <input type="hidden" name="slug" value={client.slug} />
      <input type="hidden" name="token" value={token} />

      <div className={styles.formTitleBlock}>
        <span className={styles.formEyebrow}>Registro privado</span>
        <h2 className={styles.formTitle}>Crea tu usuario para TM Boxing</h2>
      </div>

      <p className={styles.formHint}>
        Completa tus datos para entrar con tu propio DNI y clave. El ranking mostrara
        solo tu nombre y apellido.
      </p>

      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label htmlFor="signup-first-name">Nombre</label>
          <input id="signup-first-name" name="firstName" required />
        </div>

        <div className={styles.formField}>
          <label htmlFor="signup-last-name">Apellido</label>
          <input id="signup-last-name" name="lastName" required />
        </div>

        <div className={styles.formField}>
          <label htmlFor="signup-document-id">DNI</label>
          <input
            id="signup-document-id"
            name="documentId"
            placeholder="12345678"
            inputMode="numeric"
            pattern="[0-9]{7,8}"
            minLength={7}
            maxLength={8}
            autoComplete="off"
            onChange={handleDocumentIdChange}
            onKeyDown={handleDocumentIdKeyDown}
            onPaste={handleDocumentIdPaste}
            required
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="signup-password">Clave</label>
          <input
            id="signup-password"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="signup-confirm-password">Repetir clave</label>
          <input
            id="signup-confirm-password"
            name="confirmPassword"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      {state.error ? <p className={styles.formError}>{state.error}</p> : null}
      {state.info ? <p className={styles.formInfo}>{state.info}</p> : null}

      <button type="submit" className={styles.formSubmit} disabled={isPending}>
        {isPending ? "Creando..." : "Crear usuario"}
      </button>

      <Link href={`/c/${client.slug}/partidos`} className={styles.formSecondaryLink}>
        Ya tengo cuenta
      </Link>
    </form>
  );
}
