"use client";

import { useMemo, useState, useTransition } from "react";

import { teamMap } from "@/data/world-cup-2026";
import type { UnifiedMatch } from "@/lib/corporate/match-registry";
import type { CorporateClient, Prediction } from "@/lib/corporate/types";
import type { ParticipantRef } from "@/lib/world-cup-types";
import { TeamBadge } from "./team-badge";
import styles from "./corporate-shell.module.css";

interface KnockoutSectionProps {
  client: CorporateClient;
  matches: UnifiedMatch[];
  initialPredictions: Record<string, Prediction>;
}

interface SaveState {
  status: "idle" | "saving" | "saved" | "error";
}

const STAGE_LABELS: Record<string, string> = {
  roundOf32: "16avos de final",
  roundOf16: "Octavos de final",
  quarterFinal: "Cuartos de final",
  semiFinal: "Semifinales",
  bronzeFinal: "Tercer puesto",
  final: "Final",
};

const STAGE_ORDER = [
  "roundOf32",
  "roundOf16",
  "quarterFinal",
  "semiFinal",
  "bronzeFinal",
  "final",
] as const;

function refLabel(ref: ParticipantRef): string {
  switch (ref.kind) {
    case "placement":
      return `${ref.place}.º Grupo ${ref.group}`;
    case "third":
      return "Mejor 3.º";
    case "winner":
      return `Gan. ${ref.matchId}`;
    case "loser":
      return `Perd. ${ref.matchId}`;
  }
}

function teamShort(teamId: string): string {
  return teamMap[teamId]?.shortName ?? "—";
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function KnockoutMatchSection({
  client,
  matches,
  initialPredictions,
}: KnockoutSectionProps) {
  const [predictions, setPredictions] = useState(initialPredictions);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const map = new Map<string, UnifiedMatch[]>();
    for (const match of matches) {
      if (match.stage === "groups") continue;
      const list = map.get(match.stage) ?? [];
      list.push(match);
      map.set(match.stage, list);
    }
    return map;
  }, [matches]);

  async function savePrediction(matchId: string, prediction: Prediction) {
    setPredictions((prev) => ({ ...prev, [matchId]: prediction }));
    setSaveStates((prev) => ({ ...prev, [matchId]: { status: "saving" } }));

    startTransition(async () => {
      try {
        const response = await fetch(`/c/${client.slug}/api/predictions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId, prediction }),
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }

        setSaveStates((prev) => ({ ...prev, [matchId]: { status: "saved" } }));
        window.setTimeout(() => {
          setSaveStates((prev) => {
            if (prev[matchId]?.status !== "saved") return prev;
            const next = { ...prev };
            delete next[matchId];
            return next;
          });
        }, 1600);
      } catch {
        setSaveStates((prev) => ({ ...prev, [matchId]: { status: "error" } }));
      }
    });
  }

  const totalKnockout = STAGE_ORDER.reduce(
    (sum, stage) => sum + (grouped.get(stage)?.length ?? 0),
    0,
  );
  const totalPredicted = STAGE_ORDER.reduce((sum, stage) => {
    const stageMatches = grouped.get(stage) ?? [];
    return sum + stageMatches.filter((match) => predictions[match.id]).length;
  }, 0);

  return (
    <section className={styles.sectionBlock}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Eliminación directa</span>
          <h2 className={styles.sectionTitle}>32 partidos hasta la final</h2>
        </div>
        <p className={styles.sectionHint}>
          Resultado exacto en todas las eliminatorias ({totalPredicted}/
          {totalKnockout} predichos). Los partidos sin equipos definidos se
          desbloquean al cargar resultados de fases anteriores.
        </p>
      </div>

      {STAGE_ORDER.map((stage) => {
        const stageMatches = grouped.get(stage);
        if (!stageMatches || stageMatches.length === 0) return null;

        return (
          <div key={stage} style={{ display: "grid", gap: "0.55rem" }}>
            <header
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                paddingBottom: "0.4rem",
                borderBottom: "1px solid var(--client-line)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-heading), sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--client-fg)",
                }}
              >
                {STAGE_LABELS[stage]}
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--client-muted)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {stageMatches.length} partidos
              </span>
            </header>

            <div className={styles.matchGrid}>
              {stageMatches.map((match) => {
                const slotUndefined = !match.homeTeamId || !match.awayTeamId;
                const locked = new Date() >= match.lockedAt;
                const prediction = predictions[match.id];
                const saveState = saveStates[match.id];

                return (
                  <article
                    key={match.id}
                    className={`${styles.matchCard} ${
                      locked || slotUndefined ? styles.matchCardLocked : ""
                    }`}
                  >
                    <div className={styles.matchHead}>
                      <span className={styles.matchId}>{match.id}</span>
                      <span className={styles.matchDate}>{formatDate(match.date)}</span>
                    </div>

                    <div className={styles.matchTeams}>
                      <span className={styles.matchTeam}>
                        {match.homeTeamId ? (
                          <>
                            <TeamBadge teamId={match.homeTeamId} small showCode={false} />
                            <span className={styles.matchTeamName}>
                              {teamShort(match.homeTeamId)}
                            </span>
                          </>
                        ) : (
                          <span className={styles.matchTeamName}>
                            {match.homeRef ? refLabel(match.homeRef) : "—"}
                          </span>
                        )}
                      </span>
                      <span className={styles.matchVs}>vs</span>
                      <span className={`${styles.matchTeam} ${styles.matchTeamRight}`}>
                        {match.awayTeamId ? (
                          <>
                            <span className={styles.matchTeamName}>
                              {teamShort(match.awayTeamId)}
                            </span>
                            <TeamBadge teamId={match.awayTeamId} small showCode={false} />
                          </>
                        ) : (
                          <span className={styles.matchTeamName}>
                            {match.awayRef ? refLabel(match.awayRef) : "—"}
                          </span>
                        )}
                      </span>
                    </div>

                    {slotUndefined ? (
                      <p className={styles.predictionStatus}>
                        Se desbloquea al avanzar la fase anterior
                      </p>
                    ) : locked ? (
                      <p className={`${styles.predictionStatus} ${styles.predictionStatusLocked}`}>
                        Bloqueado
                      </p>
                    ) : (
                      <PredictorScore
                        prediction={prediction?.kind === "score" ? prediction : null}
                        onChange={(home, away) =>
                          savePrediction(match.id, { kind: "score", home, away })
                        }
                      />
                    )}

                    {saveState && !slotUndefined && !locked ? (
                      <p
                        className={`${styles.predictionStatus} ${
                          saveState.status === "saved" ? styles.predictionStatusSaved : ""
                        }`}
                      >
                        {saveState.status === "saving"
                          ? "Guardando..."
                          : saveState.status === "saved"
                            ? "Guardado ✓"
                            : "Error al guardar"}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function PredictorScore({
  prediction,
  onChange,
}: {
  prediction: { kind: "score"; home: number; away: number } | null;
  onChange: (home: number, away: number) => void;
}) {
  const home = prediction?.home ?? "";
  const away = prediction?.away ?? "";

  return (
    <div className={styles.predictScore}>
      <input
        type="number"
        min={0}
        max={20}
        inputMode="numeric"
        className={styles.scoreInput}
        value={home}
        placeholder="0"
        onChange={(event) => {
          const value = Math.max(0, Math.min(20, Number(event.target.value) || 0));
          onChange(value, prediction?.away ?? 0);
        }}
        aria-label="Goles local"
      />
      <span className={styles.scoreSep}>:</span>
      <input
        type="number"
        min={0}
        max={20}
        inputMode="numeric"
        className={styles.scoreInput}
        value={away}
        placeholder="0"
        onChange={(event) => {
          const value = Math.max(0, Math.min(20, Number(event.target.value) || 0));
          onChange(prediction?.home ?? 0, value);
        }}
        aria-label="Goles visitante"
      />
    </div>
  );
}
