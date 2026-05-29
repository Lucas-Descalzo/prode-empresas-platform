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
            ? "Empatas con el puesto superior."
            : `Te faltan ${gap} pts para subir una posicion.`
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
          ? "Tu prode ya esta cargado y entra en competencia."
          : "Todavia te faltan selecciones antes del cierre.",
        deadlineLabel: formatSimpleModeCutoffLabel(),
        nextAction: participant.mustChangePassword
          ? "Cambia tu clave temporal para seguir."
          : isComplete
            ? "Revisa el ranking o vuelve a editar antes del cierre."
            : "Entra en Mi Prode para completar grupos, terceros y cuadro final.",
        lastSavedLabel: fixturePrediction
          ? `Ultimo guardado ${formatDateTime(fixturePrediction.updatedAt)}`
          : "Aun no guardaste una version completa.",
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
          ? `Proximo cierre ${formatLockedAt(nextUnlockedMatch.lockedAt)}`
          : "Ya no quedan partidos abiertos.",
        nextAction: participant.mustChangePassword
          ? "Cambia tu clave temporal para seguir."
          : predictedMatches === totalMatches
            ? "Revisa el ranking o ajusta las selecciones abiertas."
            : "Vuelve a Mi Prode para cargar los partidos que faltan.",
        lastSavedLabel:
          predictedMatches > 0
            ? "Tus cambios se guardan a medida que avanzas."
            : "Todavia no cargaste ningun partido.",
      };
    }
  }

  return (
    <>
      <section className={styles.dashboardHero}>
        <div className={styles.dashboardHeroCopy}>
          <h1 className={styles.dashboardHeroTitle}>Tu tablero del Mundial 2026</h1>
          <p className={styles.dashboardHeroText}>
            Revisa tu prode, sigue tu posicion y vuelve rapido a lo importante.
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
                  <span>Situacion</span>
                  <strong>{personalState.progressLabel}</strong>
                  <p>{personalState.progressDetail}</p>
                </div>
                <div className={styles.dashboardStatusBlock}>
                  <span>Fecha limite</span>
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
                    <span>Posicion</span>
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

          <article className={`${styles.dashboardCard} ${styles.dashboardQuickCard}`}>
            <div className={styles.dashboardHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Accesos rapidos</span>
                <h2 className={styles.dashboardTitle}>Sigue desde aqui</h2>
              </div>
            </div>

            <div className={styles.dashboardActionGrid}>
              <Link href={`/c/${client.slug}/partidos`} className={styles.dashboardActionTile}>
                <span>Mi Prode</span>
                <strong>Completar o revisar tu carga</strong>
              </Link>
              <Link href={`/c/${client.slug}/liga`} className={styles.dashboardActionTile}>
                <span>Ranking</span>
                <strong>Ver posiciones y puntos del torneo</strong>
              </Link>
            </div>
          </article>
        </section>
      ) : null}

      {client.gameMode === "simple" ? <SimpleModeGuide client={client} /> : null}
    </>
  );
}
