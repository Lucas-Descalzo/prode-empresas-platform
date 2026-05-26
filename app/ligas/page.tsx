import Link from "next/link";

import styles from "@/components/group-page.module.css";

export default function LeaguesPage() {
  return (
    <main className={styles.pageShell}>
      <section className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Ligas</p>
          <h1>Competí con tu predicción</h1>
          <p>
            Primero armás una predicción única del Mundial 2026. Después podés usarla
            en la Liga general o en una liga de amigos.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/mi-prediccion" className={styles.primaryButton}>
            Armar mi predicción
          </Link>
        </div>
      </section>

      <section className={styles.openLayout}>
        <article className={styles.identityCard}>
          <div className={styles.cardHeader}>
            <p className={styles.eyebrow}>Ranking público</p>
            <h2>Liga general</h2>
            <p>
              Guardá tu predicción y comparala contra otros usuarios cuando se carguen
              los resultados reales.
            </p>
          </div>
          <div className={styles.inlineActions}>
            <Link href="/ligas/general" className={styles.secondaryButton}>
              Ir a Liga general
            </Link>
          </div>
        </article>

        <article className={styles.participantsCard}>
          <div className={styles.cardHeader}>
            <p className={styles.eyebrow}>Amigos</p>
            <h2>Ligas de amigos</h2>
            <p>
              Creá una liga privada, compartí el link y que cada participante use su
              predicción para competir.
            </p>
          </div>
          <div className={styles.inlineActions}>
            <Link href="/ligas/crear" className={styles.secondaryButton}>
              Crear liga
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
