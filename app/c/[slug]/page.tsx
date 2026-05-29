/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "@/components/corporate/corporate-shell.module.css";
import { SimpleModeGuide } from "@/components/corporate/simple-mode-guide";
import {
  getCorporateClient,
  listCorporateClients,
} from "@/lib/corporate/clients";
import { getCurrentParticipant } from "@/lib/corporate/session";
import {
  getAccessCopy,
  getGameModeCopy,
  getLandingHeroCopy,
  getLandingHeroTitle,
  getRankingCopy,
} from "@/lib/corporate/copy";
import { isDatabaseConfigured } from "@/lib/db";

export const revalidate = 300;

export async function generateStaticParams() {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const clients = await listCorporateClients();
  return clients.map((client) => ({ slug: client.slug }));
}

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

  const participant = await getCurrentParticipant(client.id);

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
  const primaryCtaLabel = participant ? "Ir a mi prode" : "Entrar para jugar";
  const secondaryCtaLabel = "Ver ranking";
  const welcomeNote = participant
    ? `Tu cuenta ya esta activa. Desde aqui puedes retomar tu prode y revisar como va la tabla.`
    : client.accessMode === "signup_link"
      ? "Si el gimnasio te compartio el link privado, primero crea tu cuenta y despues entra a completar tu prode."
      : "Entra con tu acceso privado para completar tu prode y seguir el ranking interno.";

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
                {primaryCtaLabel}
              </Link>
              <Link
                href={`/c/${client.slug}/liga`}
                className={styles.landingSecondaryCta}
              >
                {secondaryCtaLabel}
              </Link>
            </div>

            <p className={styles.landingSupportCopy}>{heroSupport}</p>
            <p className={styles.landingSupportNote}>{welcomeNote}</p>
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
          <h2 className={styles.featureTitle}>Como entras</h2>
          <p className={styles.featureCopy}>{accessCopy}</p>
        </article>

        <article className={styles.featureCard}>
          <span className={styles.featureNumber}>2</span>
          <h2 className={styles.featureTitle}>Tu prode</h2>
          <p className={styles.featureCopy}>{modeCopy}</p>
        </article>

        <article className={styles.featureCard}>
          <span className={styles.featureNumber}>3</span>
          <h2 className={styles.featureTitle}>Tu posicion</h2>
          <p className={styles.featureCopy}>{rankingCopy}</p>
        </article>
      </section>

      <section className={styles.journeyGrid}>
        <article className={styles.journeyCard}>
          <span className={styles.sectionEyebrow}>Paso 1</span>
          <h2 className={styles.journeyTitle}>Entra o crea tu cuenta</h2>
          <p className={styles.journeyCopy}>
            {client.accessMode === "signup_link"
              ? "El gimnasio comparte el link privado. Con eso creas tu usuario una sola vez y ya quedas listo para jugar."
              : "Usa el acceso privado que te compartieron para entrar a tu espacio y empezar el prode."}
          </p>
        </article>

        <article className={styles.journeyCard}>
          <span className={styles.sectionEyebrow}>Paso 2</span>
          <h2 className={styles.journeyTitle}>Completa tu prode</h2>
          <p className={styles.journeyCopy}>
            Carga grupos, terceros y cuadro final desde Mi Prode. El sistema te va guiando paso a paso.
          </p>
        </article>

        <article className={styles.journeyCard}>
          <span className={styles.sectionEyebrow}>Paso 3</span>
          <h2 className={styles.journeyTitle}>Sigue el ranking</h2>
          <p className={styles.journeyCopy}>
            Mira como quedas frente al resto de la comunidad a medida que el gimnasio carga resultados oficiales.
          </p>
        </article>
      </section>

      {client.gameMode === "simple" ? <SimpleModeGuide client={client} /> : null}
    </>
  );
}
