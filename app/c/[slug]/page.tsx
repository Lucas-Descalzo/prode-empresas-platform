import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "@/components/corporate/corporate-shell.module.css";
import { SimpleModeGuide } from "@/components/corporate/simple-mode-guide";
import { getCorporateClient } from "@/lib/corporate/clients";
import {
  getFixturePredictionForUser,
  getInteractivePredictionsForUser,
  getLeaderboardForCompany,
} from "@/lib/corporate/db";
import { allMatches } from "@/lib/corporate/match-registry";
import { getCurrentParticipant } from "@/lib/corporate/session";
import {
  formatSimpleModeCutoffLabel,
  isSimpleModePredictionComplete,
} from "@/lib/simple-mode-rules";

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLockedAt(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(value);
}

function getNextUnlockedMatch() {
  const currentTimestamp = Date.now();

  return allMatches
    .filter((match) => match.lockedAt.getTime() > currentTimestamp)
    .sort((left, right) => left.lockedAt.getTime() - right.lockedAt.getTime())[0];
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
  const primaryCtaLabel = participant ? "Ir a mi prode" : "Entrar para jugar";

  let personalState:
    | {
        progressLabel: string;
        progressDetail: string;
        deadlineLabel: string;
        nextAction: string;
        lastSavedLabel: string;
      }
    | null = null;
  let rankingState:
    | {
        rank: number;
        totalParticipants: number;
        totalPoints: number;
        gapValue: string;
        gapLabel: string;
      }
    | null = null;

  if (participant) {
    const rows = await getLeaderboardForCompany(client.id, client.gameMode);
    const currentRowIndex = rows.findIndex((row) => row.id === participant.id);
    const currentRow = currentRowIndex >= 0 ? rows[currentRowIndex] : null;
    const rowAbove = currentRowIndex > 0 ? rows[currentRowIndex - 1] : null;

    if (currentRow) {
      const gap = rowAbove ? rowAbove.totalPoints - currentRow.totalPoints : 0;

      rankingState = {
        rank: currentRowIndex + 1,
        totalParticipants: rows.length,
        totalPoints: currentRow.totalPoints,
        gapValue: rowAbove ? `${gap} pts` : "1ro",
        gapLabel: rowAbove
          ? gap === 0
            ? "Empatás con el puesto superior."
            : `Te faltan ${gap} pts para subir una posición.`
          : "Vas primero en el ranking.",
      };
    }

    if (client.gameMode === "simple") {
      const fixturePrediction = await getFixturePredictionForUser(client.id, participant.id);
      const isComplete = fixturePrediction
        ? isSimpleModePredictionComplete(fixturePrediction.fixtureState)
        : false;

      personalState = {
        progressLabel: isComplete ? "Prode completo" : "Prode pendiente",
        progressDetail: isComplete
          ? "Tu prode ya está cargado y entra en competencia."
          : "Todavía te faltan selecciones antes del cierre.",
        deadlineLabel: formatSimpleModeCutoffLabel(client.slug),
        nextAction: participant.mustChangePassword
          ? "Cambiá tu clave temporal para seguir."
          : isComplete
            ? "Revisá el ranking o volvé a editar antes del cierre."
            : "Entrá en Mi Prode para completar grupos, terceros y cuadro final.",
        lastSavedLabel: fixturePrediction
          ? `Último guardado ${formatDateTime(fixturePrediction.updatedAt)}`
          : "Aún no guardaste una versión completa.",
      };
    } else {
      const predictions = await getInteractivePredictionsForUser(client.id, participant.id);
      const predictedMatches = Object.keys(predictions).length;
      const totalMatches = allMatches.length;
      const nextUnlockedMatch = getNextUnlockedMatch();

      personalState = {
        progressLabel:
          predictedMatches === totalMatches ? "Prode completo" : "Prode en progreso",
        progressDetail: `${predictedMatches}/${totalMatches} partidos cargados.`,
        deadlineLabel: nextUnlockedMatch
          ? `Próximo cierre ${formatLockedAt(nextUnlockedMatch.lockedAt)}`
          : "Ya no quedan partidos abiertos.",
        nextAction: participant.mustChangePassword
          ? "Cambiá tu clave temporal para seguir."
          : predictedMatches === totalMatches
            ? "Revisá el ranking o ajustá las selecciones abiertas."
            : "Vuelve a Mi Prode para cargar los partidos que faltan.",
        lastSavedLabel:
          predictedMatches > 0
            ? "Tus cambios se guardan a medida que avanzas."
            : "Todavía no cargaste ningún partido.",
      };
    }
  }

  return (
    <>
      <section className={styles.dashboardHero}>
        <div className={styles.dashboardHeroCopy}>
          <h1 className={styles.dashboardHeroTitle}>{client.shortName} · Mundial 2026</h1>
          <p className={styles.dashboardHeroText}>
            Revisá tu prode, seguí tu posición en el ranking de {client.shortName} y volvé
            rápido a lo importante.
          </p>

          <div className={styles.dashboardHeroActions}>
            <Link
              href={`/c/${client.slug}/partidos`}
              prefetch={true}
              className={styles.landingCta}
            >
              {primaryCtaLabel}
            </Link>
            <Link href={`/c/${client.slug}/liga`} className={styles.landingSecondaryCta}>
              Ver ranking
            </Link>
          </div>
        </div>
      </section>

      {participant && personalState ? (
        <section className={styles.dashboardStack}>
          <div className={styles.dashboardGrid}>
            <article className={`${styles.dashboardCard} ${styles.dashboardCardPrimary}`}>
              <div className={styles.dashboardHeader}>
                <div>
                  <span className={styles.sectionEyebrow}>Estado personal</span>
                  <h2 className={styles.dashboardTitle}>{personalState.progressLabel}</h2>
                </div>
                <span className={styles.dashboardPill}>{participant.firstName}</span>
              </div>

              <div className={styles.dashboardStatusRow}>
                <div className={styles.dashboardStatusBlock}>
                  <span>Situación</span>
                  <strong>{personalState.progressLabel}</strong>
                  <p>{personalState.progressDetail}</p>
                </div>
                <div className={styles.dashboardStatusBlock}>
                  <span>Fecha límite</span>
                  <strong>{personalState.deadlineLabel}</strong>
                  <p>{personalState.nextAction}</p>
                </div>
              </div>

              <p className={styles.dashboardSupportText}>{personalState.lastSavedLabel}</p>
            </article>

            {rankingState ? (
              <article className={`${styles.dashboardCard} ${styles.dashboardCardSecondary}`}>
                <div className={styles.dashboardHeader}>
                  <div>
                    <span className={styles.sectionEyebrow}>Resumen de ranking</span>
                    <h2 className={styles.dashboardTitle}>
                      Puesto {rankingState.rank} de {rankingState.totalParticipants}
                    </h2>
                  </div>
                  <span className={styles.dashboardScorePill}>
                    {rankingState.totalPoints} pts
                  </span>
                </div>

                <div className={styles.dashboardMetricGrid}>
                  <div className={styles.dashboardMetric}>
                    <span>Posición</span>
                    <strong>#{rankingState.rank}</strong>
                    <p>Tu lugar actual en la tabla general.</p>
                  </div>
                  <div className={styles.dashboardMetric}>
                    <span>Participantes</span>
                    <strong>{rankingState.totalParticipants}</strong>
                    <p>Personas activas en competencia.</p>
                  </div>
                  <div className={styles.dashboardMetric}>
                    <span>Diferencia</span>
                    <strong>{rankingState.gapValue}</strong>
                    <p>{rankingState.gapLabel}</p>
                  </div>
                </div>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      {client.gameMode === "simple" ? <SimpleModeGuide client={client} /> : null}
    </>
  );
}
