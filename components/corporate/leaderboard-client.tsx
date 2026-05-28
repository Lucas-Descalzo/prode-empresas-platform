"use client";

import { useDeferredValue, useState } from "react";

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
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalizeSearchValue(deferredQuery);

  const indexedRows = rows.map((row, index) => ({
    rank: index + 1,
    row,
  }));

  const filteredRows = normalizedQuery
    ? indexedRows.filter(({ row }) => normalizeSearchValue(row.fullName).includes(normalizedQuery))
    : indexedRows;

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
            placeholder="Escribe nombre o apellido"
            className={styles.leaderboardSearchInput}
          />
        </label>

        <div className={styles.leaderboardSearchMeta}>
          <strong>{filteredRows.length}</strong>
          <span>
            {normalizedQuery ? `de ${rows.length} visibles` : "participantes en ranking"}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className={styles.leaderboardEmpty}>Todavia no hay participantes dados de alta.</p>
      ) : filteredRows.length === 0 ? (
        <p className={styles.leaderboardEmpty}>
          No encontramos a nadie con ese nombre. Prueba con otro apellido o borra la busqueda.
        </p>
      ) : (
        <div className={styles.leaderboardTableWrap}>
          <table className={styles.leaderboardTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                {collectsArea ? <th>{areaLabel}</th> : null}
                <th>Predicciones</th>
                <th>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ rank, row }) => {
                const isSelf = currentParticipantId === row.id;

                return (
                  <tr key={row.id} className={isSelf ? styles.leaderboardSelf : ""}>
                    <td className={styles.leaderboardRank} data-label="Posicion">
                      {rank}
                    </td>
                    <td data-label="Nombre">
                      <div className={styles.leaderboardNameCell}>
                        <strong>
                          {row.fullName}
                          {isSelf ? " (vos)" : ""}
                        </strong>
                        {gameMode === "simple" ? (
                          <div className={styles.leaderboardSubline}>
                            {row.preWorldCupPoints} pre-Mundial · {row.knockoutPoints} eliminatoria
                          </div>
                        ) : null}
                      </div>
                    </td>
                    {collectsArea ? (
                      <td data-label={areaLabel}>{row.area ?? "Sin area"}</td>
                    ) : null}
                    <td data-label="Predicciones">{row.predictionCount}</td>
                    <td className={styles.leaderboardPoints} data-label="Puntos">
                      {row.totalPoints}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
