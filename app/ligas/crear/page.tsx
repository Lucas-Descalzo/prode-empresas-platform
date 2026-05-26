import Link from "next/link";

import { isDatabaseConfigured } from "@/lib/db";

import { GroupCreateForm } from "@/components/group-create-form";
import styles from "@/components/group-page.module.css";

export default function CreateLeaguePage() {
  const databaseConfigured = isDatabaseConfigured();

  return (
    <main className={styles.pageShell}>
      {databaseConfigured ? (
        <GroupCreateForm />
      ) : (
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <p className={styles.eyebrow}>Base de datos pendiente</p>
            <h1>Conectá Neon para habilitar ligas</h1>
            <p>
              El código ya está listo, pero este entorno todavía no tiene
              `DATABASE_URL`. Instalá Neon desde Vercel Marketplace, creá las tablas de
              `db/groups-schema.sql` y luego vas a poder crear ligas.
            </p>
          </div>

          <div className={styles.formActions}>
            <Link href="/mi-prediccion" className={styles.secondaryButton}>
              Volver a Mi predicción
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
