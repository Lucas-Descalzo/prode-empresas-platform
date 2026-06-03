"use client";

import { useDeferredValue, useMemo, useState } from "react";

import styles from "@/components/corporate/corporate-shell.module.css";
import type { LeaderboardRow } from "@/lib/corporate/db";
import type { CompanyGameMode } from "@/lib/corporate/types";

type LeaderboardClientProps = {
  rows: LeaderboardRow[];
  currentParticipantId: string;
  collectsArea: boolean;
  areaLabel: string;
  gameMode: CompanyGameMode;
  scoringSummary: string | null;
};

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function LeaderboardClient({
  rows,
  currentParticipantId,
  collectsArea,
  areaLabel,
  gameMode,
  scoringSummary,
}: LeaderboardClientProps) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalizeSearchValue(deferredQuery);

  const indexedRows = useMemo(
    () => rows.map((row, index) => ({ rank: index + 1, row })),
    [rows],
  );

  const filteredRows = useMemo(
    () =>
      normalizedQuery
        ? indexedRows.filter(({ row }) =>
            normalizeSearchValue(row.fullName).includes(normalizedQuery),
          )
        : indexedRows,
    [indexedRows, normalizedQuery],
  );

  const visibleRows = useMemo(
    () => (normalizedQuery ? filteredRows : filteredRows.slice(0, visibleCount)),
    [filteredRows, normalizedQuery, visibleCount],
  );

  const hasMoreRows = !normalizedQuery && filteredRows.length > visibleRows.length;
  const emptyAreaLabel = `Sin ${areaLabel.toLocaleLowerCase("es-AR")}`;

  return (
    <div className={styles.leaderboardCard}>
      {scoringSummary ? <p className={styles.leaderboardInfo}>{scoringSummary}</p> : null}

      <div className={styles.leaderboardToolbar}>
        <label className={styles.leaderboardSearch}>
          <span className={styles.leaderboardSearchLabel}>Buscar participante</span>
          <input
            type="search"
            inputMode="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o apellido"
            className={styles.leaderboardSearchInput}
          />
        </label>

        <div
          className={styles.leaderboardSearchMeta}
          aria-live="polite"
          aria-atomic="true"
        >
          <strong>{filteredRows.length}</strong>
          <span>
            {normalizedQuery ? `de ${rows.length} visibles` : "participantes en ranking"}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className={styles.leaderboardEmpty}>Todavía no hay participantes dados de alta.</p>
      ) : filteredRows.length === 0 ? (
        <p className={styles.leaderboardEmpty}>
          No encontramos a nadie con ese nombre. Prueba con otro apellido o borra la búsqueda.
        </p>
      ) : (
        <div className={styles.leaderboardList}>
          {visibleRows.map(({ rank, row }) => {
            const isSelf = currentParticipantId === row.id;
            const statusLabel =
              row.predictionCount === 0
                ? "Prode pendiente"
                : row.totalPoints > 0
                  ? "Puntaje actualizado"
                  : "Esperando resultados oficiales";

            return (
              <article
                key={row.id}
                className={`${styles.leaderboardEntry} ${
                  isSelf ? styles.leaderboardSelfCard : ""
                }`}
              >
                <div className={styles.leaderboardEntryRank}>
                  <span className={styles.leaderboardRankValue}>#{rank}</span>
                </div>

                <div className={styles.leaderboardEntryBody}>
                  <div className={styles.leaderboardEntryHeader}>
                    <div className={styles.leaderboardNameCell}>
                      <strong>{row.fullName}</strong>
                      <div className={styles.leaderboardMetaRail}>
                        {collectsArea ? (
                          <span className={styles.leaderboardMetaPill}>
                            <span>{areaLabel}</span>
                            <strong>{row.area ?? emptyAreaLabel}</strong>
                          </span>
                        ) : null}
                        {isSelf ? <span className={styles.leaderboardYouBadge}>Vos</span> : null}
                      </div>
                    </div>

                    <div className={styles.leaderboardPointsPanel}>
                      <strong>{row.totalPoints}</strong>
                      <span>PTS</span>
                    </div>
                  </div>

                  <div className={styles.leaderboardDivider} />

                  <div className={styles.leaderboardStatusRow}>
                    <span className={styles.leaderboardStatusLabel}>{statusLabel}</span>
                    {gameMode === "simple" ? (
                      <span className={styles.leaderboardSubline}>
                        Fase de grupos: {row.preWorldCupPoints} pts · Eliminatoria: {row.knockoutPoints} pts
                      </span>
                    ) : (
                      <span className={styles.leaderboardSubline}>
                        {row.predictionCount}{" "}
                        {row.predictionCount === 1 ? "partido cargado" : "partidos cargados"}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {hasMoreRows ? (
        <div className={styles.leaderboardLoadMoreWrap}>
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={() => setVisibleCount((current) => current + 30)}
          >
            Mostrar 30 más
          </button>
        </div>
      ) : null}
    </div>
  );
}
