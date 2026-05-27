/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "@/components/corporate/corporate-shell.module.css";
import { SimpleModeGuide } from "@/components/corporate/simple-mode-guide";
import { getCorporateClient } from "@/lib/corporate/clients";
import {
  getAccessCopy,
  getGameModeCopy,
  getLandingHeroCopy,
  getLandingHeroTitle,
  getRankingCopy,
} from "@/lib/corporate/copy";

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

  const accessCopy = getAccessCopy(client);
  const modeCopy = getGameModeCopy(client);
  const rankingCopy = getRankingCopy(client);
  const heroTitle = getLandingHeroTitle(client);
  const heroCopy = getLandingHeroCopy(client);
  const heroBadge = client.gameMode === "simple" ? "Modo simple" : "Modo interactivo";
  const heroSupport =
    client.gameMode === "simple"
      ? "Acceso privado, una sola carga antes del Mundial y ranking interno para la comunidad."
      : "Acceso privado, seguimiento partido a partido y ranking interno durante todo el torneo.";

  return (
    <>
      <section className={styles.landingHero}>
        <div className={styles.landingHeroInner}>
          <div className={styles.landingHeroContent}>
            <div className={styles.landingMetaRow}>
              <span className={styles.landingEyebrow}>{client.tagline}</span>
              <span className={styles.landingMetaBadge}>{heroBadge}</span>
            </div>

            <h1 className={styles.landingTitle}>{heroTitle}</h1>
            <p className={styles.landingCopy}>{heroCopy}</p>

            <div className={styles.landingCtaRow}>
              <Link
                href={`/c/${client.slug}/partidos`}
                prefetch={true}
                className={styles.landingCta}
              >
                Entrar a la plataforma
              </Link>
              <Link
                href={`/c/${client.slug}/liga`}
                className={styles.landingSecondaryCta}
              >
                Ver ranking
              </Link>
            </div>

            <p className={styles.landingSupportCopy}>{heroSupport}</p>
          </div>

          <div className={styles.landingHeroArt} aria-hidden="true">
            {client.branding.logoUrl ? (
              <div className={styles.landingHeroLogoFrame}>
                <img
                  src={client.branding.logoUrl}
                  alt=""
                  className={styles.landingHeroLogo}
                />
              </div>
            ) : (
              <div className={styles.landingHeroTextMark}>
                {client.branding.logoText?.trim() || client.shortName}
              </div>
            )}

            <div className={styles.landingHeroStat}>
              <strong>{client.shortName}</strong>
              <span>
                {client.gameMode === "simple"
                  ? "Prode privado para alumnos, staff y comunidad."
                  : "Seguimiento privado para la comunidad durante todo el torneo."}
              </span>
            </div>
          </div>
        </div>

        {client.branding.logoUrl ? (
          <img
            src={client.branding.logoUrl}
            alt=""
            className={styles.landingWatermarkImage}
            aria-hidden="true"
          />
        ) : (
          <span className={styles.landingWatermarkText} aria-hidden="true">
            {client.branding.logoText?.trim() || client.shortName}
          </span>
        )}
      </section>

      <section className={styles.featureGrid}>
        <article className={styles.featureCard}>
          <span className={styles.featureNumber}>1</span>
          <h2 className={styles.featureTitle}>Acceso privado</h2>
          <p className={styles.featureCopy}>{accessCopy}</p>
        </article>

        <article className={styles.featureCard}>
          <span className={styles.featureNumber}>2</span>
          <h2 className={styles.featureTitle}>
            {client.gameMode === "simple" ? "Modo simple" : "Modo interactivo"}
          </h2>
          <p className={styles.featureCopy}>{modeCopy}</p>
        </article>

        <article className={styles.featureCard}>
          <span className={styles.featureNumber}>3</span>
          <h2 className={styles.featureTitle}>Ranking interno</h2>
          <p className={styles.featureCopy}>{rankingCopy}</p>
        </article>
      </section>

      {client.gameMode === "simple" ? <SimpleModeGuide client={client} /> : null}
    </>
  );
}
