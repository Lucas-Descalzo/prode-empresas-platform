import { notFound } from "next/navigation";

import styles from "@/components/corporate/corporate-shell.module.css";
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

  const [currentParticipant, rows, officialResults] = await Promise.all([
    getCurrentParticipant(client.id),
    getLeaderboardForCompany(client.id, client.gameMode),
    getOfficialResultsForCompany(client.id),
  ]);

  const totalResults = Object.keys(officialResults).length;
  const participantsWithPredictions = rows.filter(
    (row) => row.predictionCount > 0,
  ).length;

  return (
    <>
      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Ranking interno</span>
            <h2 className={styles.sectionTitle}>{client.shortName} · Mundial 2026</h2>
          </div>
          <p className={styles.sectionHint}>
            {rows.length} {rows.length === 1 ? "participante" : "participantes"} ·{" "}
            {participantsWithPredictions} con prode completo · {totalResults}{" "}
            {totalResults === 1 ? "resultado oficial" : "resultados oficiales"} cargados.
          </p>
        </div>
      </section>

      <div className={styles.leaderboardCard}>
        {client.gameMode === "simple" ? (
          <p className={styles.leaderboardInfo}>
            {SIMPLE_MODE_PRE_WORLD_CUP_MAX_POINTS} pts pre-Mundial +{" "}
            {SIMPLE_MODE_KNOCKOUT_MAX_POINTS} pts eliminatoria. Si empatan en el total,
            desempata quien tenga mas puntos del pre-Mundial.
          </p>
        ) : null}
        {rows.length === 0 ? (
          <p className={styles.leaderboardEmpty}>
            Todavia no hay participantes dados de alta.
          </p>
        ) : (
          <table className={styles.leaderboardTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                {client.collectsArea ? <th>{client.areaLabel}</th> : null}
                <th>Predicciones</th>
                <th>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isSelf = currentParticipant?.id === row.id;
                return (
                  <tr key={row.id} className={isSelf ? styles.leaderboardSelf : ""}>
                    <td className={styles.leaderboardRank}>{index + 1}</td>
                    <td>
                      {row.fullName}
                      {isSelf ? " (vos)" : ""}
                      {client.gameMode === "simple" ? (
                        <div className={styles.leaderboardSubline}>
                          {row.preWorldCupPoints} pre-Mundial · {row.knockoutPoints} eliminatoria
                        </div>
                      ) : null}
                    </td>
                    {client.collectsArea ? <td>{row.area ?? "—"}</td> : null}
                    <td>{row.predictionCount}</td>
                    <td className={styles.leaderboardPoints}>{row.totalPoints}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
