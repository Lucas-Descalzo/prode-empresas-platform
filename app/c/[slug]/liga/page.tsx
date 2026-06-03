import { notFound } from "next/navigation";

import styles from "@/components/corporate/corporate-shell.module.css";
import { LeaderboardClient } from "@/components/corporate/leaderboard-client";
import {
  ChangePasswordForm,
  LoginForm,
} from "@/components/corporate/login-form";
import { getCorporateClient } from "@/lib/corporate/clients";
import {
  getLeaderboardForCompany,
  getOfficialResultsForCompany,
} from "@/lib/corporate/db";
import { getCurrentParticipant } from "@/lib/corporate/session";
import {
  SIMPLE_MODE_KNOCKOUT_MAX_POINTS,
  SIMPLE_MODE_PRE_WORLD_CUP_MAX_POINTS,
} from "@/lib/simple-mode-rules";

export const dynamic = "force-dynamic";

export default async function LigaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await getCorporateClient(slug);
  if (!client) {
    notFound();
  }

  const [currentParticipant, officialResults] = await Promise.all([
    getCurrentParticipant(client.id),
    getOfficialResultsForCompany(client.id),
  ]);

  if (!currentParticipant) {
    return <LoginForm client={client} />;
  }
  if (currentParticipant.mustChangePassword) {
    return <ChangePasswordForm client={client} participant={currentParticipant} />;
  }

  const rows = await getLeaderboardForCompany(client.id, client.gameMode, officialResults);

  const totalResults = Object.keys(officialResults).length;
  const participantsWithPredictions = rows.filter(
    (row) => row.predictionCount > 0,
  ).length;

  return (
    <>
      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Ranking</span>
            <h2 className={styles.sectionTitle}>Posiciones de {client.shortName}</h2>
          </div>
          <p className={styles.sectionHint}>
            {rows.length} {rows.length === 1 ? "participante" : "participantes"} ·{" "}
            {participantsWithPredictions} con prode completo · {totalResults}{" "}
            {totalResults === 1 ? "resultado oficial" : "resultados oficiales"} cargados.
          </p>
        </div>
      </section>

      <LeaderboardClient
        rows={rows}
        currentParticipantId={currentParticipant.id}
        collectsArea={client.collectsArea}
        areaLabel={client.areaLabel}
        gameMode={client.gameMode}
        scoringSummary={
          client.gameMode === "simple"
            ? `${SIMPLE_MODE_PRE_WORLD_CUP_MAX_POINTS} pts fase de grupos + ${SIMPLE_MODE_KNOCKOUT_MAX_POINTS} pts eliminatoria. Si empatan en el total, desempata quien tenga más puntos en fase de grupos.`
            : null
        }
      />
    </>
  );
}
