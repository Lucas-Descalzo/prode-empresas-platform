import Link from "next/link";
import { notFound } from "next/navigation";

import { getCorporateClient } from "@/lib/corporate/clients";
import styles from "@/components/corporate/corporate-shell.module.css";

export default async function CorporateLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await getCorporateClient(slug);

  if (!client) {
    notFound();
  }

  const accessCopy =
    client.accessMode === "corporate_domain_signup"
      ? "Cada empleado entra con su mail corporativo y activa su cuenta."
      : "Ustedes reciben las altas y nosotros enviamos accesos temporales al equipo.";

  const modeCopy =
    client.gameMode === "interactive"
      ? "La eliminación directa se sigue partido a partido durante todo el torneo."
      : "Cada persona completa su predicción una sola vez antes del Mundial.";

  return (
    <>
      <section className={styles.landingHero}>
        <span className={styles.landingEyebrow}>{client.tagline}</span>
        <h1 className={styles.landingTitle}>{client.displayName}</h1>
        <p className={styles.landingCopy}>
          Prode privado para {client.shortName}. {modeCopy}
        </p>
        <Link href={`/c/${client.slug}/partidos`} className={styles.landingCta}>
          Entrar a la plataforma →
        </Link>
      </section>

      <section className={styles.featureGrid}>
        <article className={styles.featureCard}>
          <span className={styles.featureNumber}>1</span>
          <h2 className={styles.featureTitle}>Acceso privado</h2>
          <p className={styles.featureCopy}>{accessCopy}</p>
        </article>

        <article className={styles.featureCard}>
          <span className={styles.featureNumber}>2</span>
          <h2 className={styles.featureTitle}>Modo contratado</h2>
          <p className={styles.featureCopy}>
            {client.gameMode === "interactive" ? "Interactivo" : "Simple"} ·{" "}
            {modeCopy}
          </p>
        </article>

        <article className={styles.featureCard}>
          <span className={styles.featureNumber}>3</span>
          <h2 className={styles.featureTitle}>Ranking interno</h2>
          <p className={styles.featureCopy}>
            Cada participante compite en una tabla propia de la empresa, con su
            nombre y su área.
          </p>
        </article>
      </section>
    </>
  );
}
