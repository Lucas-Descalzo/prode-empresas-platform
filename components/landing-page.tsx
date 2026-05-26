"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./world-cup-app.module.css";

const STANDALONE_DRAFT_KEY = "fwc26-fixture-state";

export function LandingPage() {
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setHasDraft(Boolean(window.localStorage.getItem(STANDALONE_DRAFT_KEY)));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return (
    <main className={styles.pageShell}>
      <section className={styles.landingHero}>
        <div className={styles.landingHeroCopy}>
          <div className={styles.brandRow}>
            <Image
              src="/official/wc26-logo.png"
              alt="World Cup 26"
              width={70}
              height={105}
              className={styles.wcLogo}
              priority
            />
            <Image
              src="/official/fifa-logo-white.png"
              alt="FIFA"
              width={150}
              height={49}
              className={styles.fifaLogo}
            />
          </div>

          <p className={styles.eyebrow}>Fixture Mundial 2026</p>
          <h1 className={styles.heroTitle}>Armá tu fixture del Mundial 2026</h1>
          <p className={styles.heroCopy}>
            Armá tu predicción del Mundial, compartila como imagen o usala
            para competir en ligas.
          </p>

          <div className={styles.heroActions}>
            <Link href="/mi-prediccion" className={styles.primaryAction}>
              Armar mi predicción
            </Link>
            {hasDraft ? (
              <Link href="/mi-prediccion" className={styles.secondaryAction}>
                Continuar mi predicción
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className={styles.landingSocialGrid} aria-label="Acciones secundarias">
        <article className={styles.groupLaunchCard}>
          <p className={styles.sectionEyebrow}>Ranking público</p>
          <h2>Competí en la Liga general</h2>
          <p>
            Guardá tu predicción individual y comparala con otros usuarios cuando
            se carguen los resultados reales.
          </p>
          <Link href="/ligas/general" className={styles.secondaryAction}>
            Ir a Liga general
          </Link>
        </article>

        <article className={styles.groupLaunchCard}>
          <p className={styles.sectionEyebrow}>Amigos</p>
          <h2>Creá una liga</h2>
          <p>
            Compartí un link, definí una fecha límite y que cada participante use
            su predicción sin crear cuenta.
          </p>
          <Link href="/ligas/crear" className={styles.secondaryAction}>
            Crear liga
          </Link>
        </article>
      </section>

      <nav className={styles.landingSecondaryNav} aria-label="Páginas adicionales">
        <Link href="/calendario">Calendario</Link>
        <Link href="/ayuda">Ayuda</Link>
      </nav>
    </main>
  );
}
