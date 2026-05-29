import { notFound } from "next/navigation";

import styles from "@/components/corporate/corporate-shell.module.css";
import {
  ChangePasswordForm,
  LoginForm,
} from "@/components/corporate/login-form";
import { SimpleModeApp } from "@/components/corporate/simple-mode-app";
import { GroupMatchGrid } from "@/components/corporate/group-match-grid";
import { KnockoutMatchSection } from "@/components/corporate/knockout-match-section";
import { getCorporateClient } from "@/lib/corporate/clients";
import {
  getFixturePredictionForUser,
  getInteractivePredictionsForUser,
} from "@/lib/corporate/db";
import { allMatches } from "@/lib/corporate/match-registry";
import { getCurrentParticipant } from "@/lib/corporate/session";

export const dynamic = "force-dynamic";

export default async function PartidosPage({
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
  if (!participant) {
    return <LoginForm client={client} />;
  }

  if (participant.mustChangePassword) {
    return <ChangePasswordForm client={client} participant={participant} />;
  }

  if (client.gameMode === "simple") {
    const fixturePrediction = await getFixturePredictionForUser(client.id, participant.id);
    return (
      <SimpleModeApp
        client={client}
        initialFixtureState={fixturePrediction?.fixtureState ?? null}
      />
    );
  }

  const predictions = await getInteractivePredictionsForUser(client.id, participant.id);
  const groupMatches = allMatches.filter((match) => match.stage === "groups");
  const knockoutMatches = allMatches.filter((match) => match.stage !== "groups");
  const predictedGroupMatches = groupMatches.filter((match) => predictions[match.id]).length;
  const predictedKnockoutMatches = knockoutMatches.filter((match) => predictions[match.id]).length;

  return (
    <>
      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Mi Prode</span>
            <h2 className={styles.sectionTitle}>Completa tu prode paso a paso</h2>
          </div>
          <p className={styles.sectionHint}>
            Empieza por los grupos, sigue con el cuadro y vuelve cuando quieras. Tus
            cambios se guardan a medida que avanzas.
          </p>
        </div>

        <div className={styles.journeyGrid}>
          <article className={styles.journeyCard}>
            <span className={styles.sectionEyebrow}>Ahora</span>
            <h3 className={styles.journeyTitle}>Grupos</h3>
            <p className={styles.journeyCopy}>
              Carga ganador o empate en cada partido. Argentina pide resultado exacto.
            </p>
            <p className={styles.journeyMeta}>
              {predictedGroupMatches}/{groupMatches.length} partidos cargados
            </p>
          </article>

          <article className={styles.journeyCard}>
            <span className={styles.sectionEyebrow}>Sigue</span>
            <h3 className={styles.journeyTitle}>Cuadro final</h3>
            <p className={styles.journeyCopy}>
              Define los cruces de eliminación directa con resultado exacto hasta la final.
            </p>
            <p className={styles.journeyMeta}>
              {predictedKnockoutMatches}/{knockoutMatches.length} cruces cargados
            </p>
          </article>

          <article className={styles.journeyCard}>
            <span className={styles.sectionEyebrow}>Después</span>
            <h3 className={styles.journeyTitle}>Ranking</h3>
            <p className={styles.journeyCopy}>
              Cuando el gimnasio cargue resultados oficiales, podrás seguir tu posición en el ranking.
            </p>
            <p className={styles.journeyMeta}>Se actualiza con resultados oficiales</p>
          </article>
        </div>
      </section>

      <GroupMatchGrid
        client={client}
        matches={allMatches}
        initialPredictions={predictions}
      />
      <KnockoutMatchSection
        client={client}
        matches={allMatches}
        initialPredictions={predictions}
      />
    </>
  );
}
