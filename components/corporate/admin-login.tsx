"use client";

import { useActionState } from "react";

import { adminLoginAction, type AdminLoginState } from "@/app/c/[slug]/admin/actions";
import type { CompanyRecord } from "@/lib/corporate/types";
import styles from "./corporate-shell.module.css";

const INITIAL: AdminLoginState = {};

export function AdminLogin({ client }: { client: CompanyRecord }) {
  const [state, formAction, isPending] = useActionState(adminLoginAction, INITIAL);

  return (
    <form action={formAction} className={styles.formCard}>
      <input type="hidden" name="slug" value={client.slug} />

      <div className={styles.formTitleBlock}>
        <span className={styles.formEyebrow}>Panel operador</span>
        <h2 className={styles.formTitle}>Administrar TM Boxing</h2>
      </div>

      <p className={styles.formHint}>
        Este acceso usa la misma clave global del panel operador. Desde aqui puedes
        cargar resultados, gestionar el link de alta y asistir a participantes.
      </p>

      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label htmlFor="admin-pw">Contrasena operador</label>
          <input
            id="admin-pw"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
      </div>

      {state.error ? <p className={styles.formError}>{state.error}</p> : null}

      <button type="submit" className={styles.formSubmit} disabled={isPending}>
        {isPending ? "Ingresando..." : "Entrar al panel"}
      </button>
    </form>
  );
}
