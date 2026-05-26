"use client";

import { useMemo, useState, useTransition } from "react";

import { groups, teamMap } from "@/data/world-cup-2026";
import {
  isHighlightedMatch,
  resolvePredictionMode,
} from "@/lib/corporate/prediction-rules";
import type { UnifiedMatch } from "@/lib/corporate/match-registry";
import type { CorporateClient, Prediction } from "@/lib/corporate/types";
import type { GroupId } from "@/lib/world-cup-types";
import { TeamBadge } from "./team-badge";
import styles from "./corporate-shell.module.css";

interface GroupMatchGridProps {
  client: CorporateClient;
  matches: UnifiedMatch[];
  initialPredictions: Record<string, Prediction>;
}

type Filter = "all" | "A-D" | "E-H" | "I-L";

const FILTER_GROUPS: Record<Filter, GroupId[]> = {
  all: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
  "A-D": ["A", "B", "C", "D"],
  "E-H": ["E", "F", "G", "H"],
  "I-L": ["I", "J", "K", "L"],
};

interface SaveState {
  status: "idle" | "saving" | "saved" | "error";
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

export function GroupMatchGrid({
  client,
  matches,
  initialPredictions,
}: GroupMatchGridProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedGroup, setExpandedGroup] = useState<GroupId | null>(null);
  const [predictions, setPredictions] = useState(initialPredictions);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [, startTransition] = useTransition();

  const matchesByGroup = useMemo(() => {
    const map = new Map<GroupId, UnifiedMatch[]>();
    for (const match of matches) {
      if (match.stage !== "groups" || !match.groupId) continue;
      const list = map.get(match.groupId) ?? [];
      list.push(match);
      map.set(match.groupId, list);
    }
    for (const list of map.values()) {
      list.sort((left, right) => left.id.localeCompare(right.id));
    }
    return map;
  }, [matches]);

  const visibleGroupIds = FILTER_GROUPS[filter];

  function predictionsForGroup(groupId: GroupId): number {
    const ids = matchesByGroup.get(groupId) ?? [];
    return ids.filter((match) => predictions[match.id]).length;
  }

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

  return (
    <section className={styles.sectionBlock}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Fase de grupos</span>
          <h2 className={styles.sectionTitle}>Predecí cada partido</h2>
        </div>
        <p className={styles.sectionHint}>
          Tocá un grupo para abrir sus 6 partidos. Argentina pide resultado exacto;
          los demás partidos de grupos elegís ganador o empate.
        </p>
      </div>

      <div className={styles.groupFilterBar}>
        {(["all", "A-D", "E-H", "I-L"] as Filter[]).map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.groupFilterBtn} ${
              filter === option ? styles.groupFilterBtnActive : ""
            }`}
            onClick={() => {
              setFilter(option);
              setExpandedGroup(null);
            }}
          >
            {option === "all" ? "Todos" : option}
          </button>
        ))}
      </div>

      <div className={styles.groupGrid}>
        {groups
          .filter((group) => visibleGroupIds.includes(group.id))
          .map((group) => {
            const groupMatches = matchesByGroup.get(group.id) ?? [];
            const isExpanded = expandedGroup === group.id;
            const done = predictionsForGroup(group.id);
            const total = groupMatches.length;

            return (
              <article
                key={group.id}
                className={`${styles.groupCard} ${
                  isExpanded ? styles.groupCardExpanded : ""
                }`}
                style={{ "--group-color": group.color } as React.CSSProperties}
              >
                <button
                  type="button"
                  className={styles.groupCardHeader}
                  onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                  aria-expanded={isExpanded}
                >
                  <div className={styles.groupLabelBlock}>
                    <span className={styles.groupLabel}>{group.label}</span>
                    <span className={styles.groupSubLabel}>
                      {group.teams.length} equipos · {total} partidos
                    </span>
                  </div>

                  <div className={styles.groupHeaderActions}>
                    <span
                      className={`${styles.groupProgressBadge} ${
                        done === total && total > 0 ? styles.groupProgressBadgeFull : ""
                      }`}
                    >
                      {done}/{total}
                    </span>
                    <span
                      className={`${styles.groupChevron} ${
                        isExpanded ? styles.groupChevronOpen : ""
                      }`}
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </div>
                </button>

                {!isExpanded ? (
                  <div className={styles.groupTeamsRow}>
                    {group.teams.map((teamId) => (
                      <TeamBadge key={teamId} teamId={teamId} small />
                    ))}
                  </div>
                ) : (
                  <div className={styles.groupMatches}>
                    {groupMatches.map((match) => (
                      <GroupMatchRow
                        key={match.id}
                        client={client}
                        match={match}
                        prediction={predictions[match.id]}
                        saveState={saveStates[match.id]}
                        onPredict={savePrediction}
                      />
                    ))}
                  </div>
                )}
              </article>
            );
          })}
      </div>
    </section>
  );
}

interface GroupMatchRowProps {
  client: CorporateClient;
  match: UnifiedMatch;
  prediction: Prediction | undefined;
  saveState: SaveState | undefined;
  onPredict: (matchId: string, prediction: Prediction) => void;
}

function GroupMatchRow({
  client,
  match,
  prediction,
  saveState,
  onPredict,
}: GroupMatchRowProps) {
  const mode = resolvePredictionMode({
    client,
    stage: "groups",
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  });
  const highlighted = isHighlightedMatch(client, match.homeTeamId, match.awayTeamId);
  const locked = new Date() >= match.lockedAt;

  return (
    <div
      className={`${styles.groupMatchRow} ${
        highlighted ? styles.groupMatchRowHighlight : ""
      }`}
    >
      <div className={styles.groupMatchHead}>
        <span className={styles.groupMatchMeta}>
          {match.id} · {formatDate(match.date)}
        </span>
        {highlighted ? (
          <span className={styles.groupMatchHighlightBadge}>Resultado exacto</span>
        ) : null}
      </div>

      <div className={styles.groupMatchTeams}>
        <span className={styles.groupMatchSide}>
          {match.homeTeamId ? (
            <>
              <TeamBadge teamId={match.homeTeamId} small showCode={false} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {teamShort(match.homeTeamId)}
              </span>
            </>
          ) : (
            <span>—</span>
          )}
        </span>
        <span className={styles.groupMatchVs}>vs</span>
        <span className={`${styles.groupMatchSide} ${styles.groupMatchSideRight}`}>
          {match.awayTeamId ? (
            <>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {teamShort(match.awayTeamId)}
              </span>
              <TeamBadge teamId={match.awayTeamId} small showCode={false} />
            </>
          ) : (
            <span>—</span>
          )}
        </span>
      </div>

      {locked ? (
        <p className={`${styles.predictionStatus} ${styles.predictionStatusLocked}`}>
          Bloqueado
        </p>
      ) : mode === "1X2" ? (
        <Predictor1X2
          home={match.homeTeamId ? teamShort(match.homeTeamId) : "Local"}
          away={match.awayTeamId ? teamShort(match.awayTeamId) : "Visitante"}
          prediction={prediction?.kind === "1X2" ? prediction : null}
          onChange={(outcome) => onPredict(match.id, { kind: "1X2", outcome })}
        />
      ) : (
        <PredictorScore
          prediction={prediction?.kind === "score" ? prediction : null}
          onChange={(home, away) => onPredict(match.id, { kind: "score", home, away })}
        />
      )}

      {saveState && !locked ? (
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
    </div>
  );
}

function Predictor1X2({
  home,
  away,
  prediction,
  onChange,
}: {
  home: string;
  away: string;
  prediction: { kind: "1X2"; outcome: "home" | "draw" | "away" } | null;
  onChange: (outcome: "home" | "draw" | "away") => void;
}) {
  return (
    <div className={styles.predict1X2}>
      <button
        type="button"
        className={prediction?.outcome === "home" ? styles.predict1X2Active : ""}
        onClick={() => onChange("home")}
      >
        {home}
      </button>
      <button
        type="button"
        className={prediction?.outcome === "draw" ? styles.predict1X2Active : ""}
        onClick={() => onChange("draw")}
      >
        Empate
      </button>
      <button
        type="button"
        className={prediction?.outcome === "away" ? styles.predict1X2Active : ""}
        onClick={() => onChange("away")}
      >
        {away}
      </button>
    </div>
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
