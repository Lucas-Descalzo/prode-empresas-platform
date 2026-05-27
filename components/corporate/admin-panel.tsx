"use client";

import { useActionState as useReactActionState, useMemo, useState } from "react";

import {
  clearResultAction,
  saveResultAction,
  type SaveResultState,
} from "@/app/c/[slug]/admin/actions";
import { teamMap } from "@/data/world-cup-2026";
import type { OfficialResultRow } from "@/lib/corporate/db";
import type { UnifiedMatch } from "@/lib/corporate/match-registry";
import { inferAdvancingTeamFromResult } from "@/lib/corporate/simple-mode-official";
import type { CorporateClient } from "@/lib/corporate/types";
import styles from "./corporate-shell.module.css";

interface AdminPanelProps {
  client: CorporateClient;
  matches: UnifiedMatch[];
  officialResults: Record<string, OfficialResultRow>;
}

type Filter = "pending" | "loaded" | "all";

const STAGE_LABELS: Record<string, string> = {
  groups: "Fase de grupos",
  roundOf32: "16avos",
  roundOf16: "Octavos",
  quarterFinal: "Cuartos",
  semiFinal: "Semifinales",
  bronzeFinal: "Tercer puesto",
  final: "Final",
};

function teamLabel(match: UnifiedMatch, side: "home" | "away"): string {
  const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
  if (teamId) {
    return teamMap[teamId].shortName;
  }

  const ref = side === "home" ? match.homeRef : match.awayRef;
  if (!ref) return "Por definir";

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

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function AdminPanel({ client, matches, officialResults }: AdminPanelProps) {
  const [filter, setFilter] = useState<Filter>("pending");

  const filteredMatches = useMemo(() => {
    if (filter === "all") return matches;
    if (filter === "loaded") {
      return matches.filter((match) => officialResults[match.id]);
    }
    return matches.filter(
      (match) =>
        !officialResults[match.id] &&
        Boolean(match.homeTeamId) &&
        Boolean(match.awayTeamId),
    );
  }, [filter, matches, officialResults]);

  const groupedByStage = useMemo(() => {
    const groups = new Map<string, UnifiedMatch[]>();
    for (const match of filteredMatches) {
      const list = groups.get(match.stage) ?? [];
      list.push(match);
      groups.set(match.stage, list);
    }
    return groups;
  }, [filteredMatches]);

  const stageOrder = [
    "groups",
    "roundOf32",
    "roundOf16",
    "quarterFinal",
    "semiFinal",
    "bronzeFinal",
    "final",
  ];

  const totalLoaded = Object.keys(officialResults).length;
  const totalPlayable = matches.filter(
    (match) => Boolean(match.homeTeamId) && Boolean(match.awayTeamId),
  ).length;

  return (
    <>
      <div className={styles.gameHeader}>
        <span className={styles.gameEyebrow}>Panel operador</span>
        <h1 className={styles.gameTitle}>Resultados oficiales</h1>
        <p className={styles.gameStatus}>
          {totalLoaded} de {totalPlayable} resultados cargados.{" "}
          Cada guardado actualiza el ranking interno. En cruces empatados,
          marcá además quién avanza.
        </p>
      </div>

      <div className={styles.adminCard}>
        <div className={styles.adminTopBar}>
          <div className={styles.adminFilters}>
            <button
              type="button"
              className={`${styles.adminFilterTab} ${
                filter === "pending" ? styles.adminFilterTabActive : ""
              }`}
              onClick={() => setFilter("pending")}
            >
              Pendientes
            </button>
            <button
              type="button"
              className={`${styles.adminFilterTab} ${
                filter === "loaded" ? styles.adminFilterTabActive : ""
              }`}
              onClick={() => setFilter("loaded")}
            >
              Cargados
            </button>
            <button
              type="button"
              className={`${styles.adminFilterTab} ${
                filter === "all" ? styles.adminFilterTabActive : ""
              }`}
              onClick={() => setFilter("all")}
            >
              Todos
            </button>
          </div>
        </div>

        {stageOrder.map((stage) => {
          const stageMatches = groupedByStage.get(stage);
          if (!stageMatches || stageMatches.length === 0) {
            return null;
          }

          return (
            <section key={stage} className={styles.stageGroup}>
              <header className={styles.stageHead}>
                <h2 className={styles.stageHeadLabel}>
                  {STAGE_LABELS[stage] ?? stage}
                </h2>
                <span className={styles.stageHeadCount}>
                  {stageMatches.length} partidos
                </span>
              </header>

              <div style={{ display: "grid", gap: "0.5rem" }}>
                {stageMatches.map((match) => (
                  <ResultRow
                    key={match.id}
                    client={client}
                    match={match}
                    initial={officialResults[match.id] ?? null}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {filteredMatches.length === 0 ? (
          <p className={styles.leaderboardEmpty}>
            {filter === "pending"
              ? "No hay partidos pendientes de carga."
              : filter === "loaded"
                ? "Todavía no cargaste ningún resultado."
                : "No hay partidos disponibles."}
          </p>
        ) : null}
      </div>
    </>
  );
}

const INITIAL_STATE: SaveResultState = {};

function ResultRow({
  client,
  match,
  initial,
}: {
  client: CorporateClient;
  match: UnifiedMatch;
  initial: OfficialResultRow | null;
}) {
  const slotUndefined = !match.homeTeamId || !match.awayTeamId;
  const isKnockout = match.stage !== "groups";
  const initialAdvancingTeamId = inferAdvancingTeamFromResult(
    match.homeTeamId,
    match.awayTeamId,
    initial,
  );

  const [state, formAction, isPending] = useReactActionState(
    saveResultAction,
    INITIAL_STATE,
  );
  const [clearState, clearAction, isClearing] = useReactActionState(
    clearResultAction,
    INITIAL_STATE,
  );

  const showSavedFlag =
    state.matchId === match.id && state.message ? state.message : "";
  const showClearedFlag =
    clearState.matchId === match.id && clearState.message
      ? clearState.message
      : "";

  return (
    <div className={styles.adminMatchRow}>
      <div className={styles.adminMatchInfo}>
        <span className={styles.adminMatchTeams}>
          {teamLabel(match, "home")} <span style={{ opacity: 0.5 }}>vs</span>{" "}
          {teamLabel(match, "away")}
        </span>
        <span className={styles.adminMatchMeta}>
          {match.id} · {formatDate(match.date)}
        </span>
      </div>

      <form action={formAction} className={styles.adminScoreInputs}>
        <input type="hidden" name="slug" value={client.slug} />
        <input type="hidden" name="matchId" value={match.id} />
        <input
          type="number"
          name="home"
          min={0}
          max={20}
          defaultValue={initial?.homeScore ?? ""}
          placeholder="0"
          aria-label="Goles local"
          disabled={slotUndefined}
          required
        />
        <span className={styles.scoreSep}>:</span>
        <input
          type="number"
          name="away"
          min={0}
          max={20}
          defaultValue={initial?.awayScore ?? ""}
          placeholder="0"
          aria-label="Goles visitante"
          disabled={slotUndefined}
          required
        />
        <button
          type="submit"
          className={styles.adminSaveBtn}
          disabled={slotUndefined || isPending}
        >
          {isPending ? "..." : "Guardar"}
        </button>
        {isKnockout && match.homeTeamId && match.awayTeamId ? (
          <select
            name="advancingTeamId"
            defaultValue={initialAdvancingTeamId ?? ""}
            className={styles.adminAdvanceSelect}
            aria-label="Equipo que avanza"
            disabled={slotUndefined || isPending}
          >
            <option value="">Avanza...</option>
            <option value={match.homeTeamId}>{teamMap[match.homeTeamId].shortName}</option>
            <option value={match.awayTeamId}>{teamMap[match.awayTeamId].shortName}</option>
          </select>
        ) : null}
      </form>

      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
        {initial ? (
          <form action={clearAction}>
            <input type="hidden" name="slug" value={client.slug} />
            <input type="hidden" name="matchId" value={match.id} />
            <button
              type="submit"
              className={styles.adminFilterTab}
              disabled={isClearing}
              style={{ minHeight: "2.4rem" }}
            >
              Borrar
            </button>
          </form>
        ) : null}

        {(showSavedFlag || showClearedFlag) && (
          <span className={styles.adminSavedFlag}>
            {showSavedFlag || showClearedFlag}
          </span>
        )}

        {(state.error && state.matchId === match.id) ||
        (clearState.error && clearState.matchId === match.id) ? (
          <span className={styles.adminSavedFlag} style={{ color: "#c8000a" }}>
            {state.error || clearState.error}
          </span>
        ) : null}

        {slotUndefined ? (
          <span className={styles.adminMatchMeta}>Slot indefinido</span>
        ) : null}
      </div>
    </div>
  );
}
