"use client";

import { useState } from "react";
import Link from "next/link";
import {
  groups,
  knockoutSlots,
  stageLabels,
  teamMap,
} from "@/data/world-cup-2026";
import type { ParticipantRef, StageId } from "@/lib/world-cup-types";
import styles from "./calendar-page.module.css";

type Filter = "all" | "groups" | "knockout";

const STAGE_ORDER: StageId[] = [
  "roundOf32",
  "roundOf16",
  "quarterFinal",
  "semiFinal",
  "bronzeFinal",
  "final",
];

function formatParticipant(ref: ParticipantRef): string {
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
  const date = new Date(dateStr + "T12:00:00Z");
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const knockoutByStage = STAGE_ORDER.map((stage) => ({
  stage,
  label: stageLabels[stage],
  matches: knockoutSlots.filter((s) => s.stage === stage),
}));

export function CalendarPage() {
  const [filter, setFilter] = useState<Filter>("all");

  return (
    <main className={styles.shell}>
      <header className={styles.pageHeader}>
        <Link href="/" className={styles.backLink}>
          ← Inicio
        </Link>
        <span className={styles.eyebrow}>Calendario</span>
        <h1 className={styles.pageTitle}>Calendario del Mundial 2026</h1>
        <p className={styles.pageSubtitle}>
          Consultá grupos, cruces, fechas, sedes y partidos del torneo.
        </p>
      </header>

      <div className={styles.filterRow} role="tablist" aria-label="Filtro de fase">
        {(
          [
            ["all", "Todos"],
            ["groups", "Grupos"],
            ["knockout", "Eliminación"],
          ] as [Filter, string][]
        ).map(([f, label]) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ""}`}
            onClick={() => setFilter(f)}
          >
            {label}
          </button>
        ))}
      </div>

      {(filter === "all" || filter === "groups") && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionEyebrow}>Fase de grupos</span>
            <h2 className={styles.sectionTitle}>12 grupos · 48 selecciones</h2>
          </div>
          <div className={styles.groupsGrid}>
            {groups.map((group) => (
              <article
                key={group.id}
                className={styles.groupCard}
                style={
                  { "--group-color": group.color } as React.CSSProperties
                }
              >
                <h3 className={styles.groupCardTitle}>{group.label}</h3>
                <ul className={styles.groupTeamList}>
                  {group.teams.map((teamId) => {
                    const team = teamMap[teamId];
                    const isTextFlag = /^[A-Z]+$/.test(team.flag);
                    return (
                      <li key={teamId} className={styles.groupTeamItem}>
                        <span className={styles.teamFlag}>
                          {isTextFlag ? team.code : team.flag}
                        </span>
                        <span>{team.shortName}</span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {(filter === "all" || filter === "knockout") && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionEyebrow}>Eliminación directa</span>
            <h2 className={styles.sectionTitle}>32 partidos hasta la final</h2>
          </div>
          <div className={styles.knockoutSections}>
            {knockoutByStage.map(({ stage, label, matches }) => (
              <div key={stage} className={styles.stageBlock}>
                <div className={styles.stageHead}>
                  <h3 className={styles.stageTitle}>{label}</h3>
                  <span className={styles.stageCount}>
                    {matches.length} {matches.length === 1 ? "partido" : "partidos"}
                  </span>
                </div>
                <div className={styles.matchGrid}>
                  {matches.map((slot) => (
                    <article key={slot.matchId} className={styles.matchCard}>
                      <div className={styles.matchHead}>
                        <span className={styles.matchId}>{slot.matchId}</span>
                        <span className={styles.matchDate}>
                          {formatDate(slot.meta.date)}
                        </span>
                      </div>
                      <div className={styles.matchTeams}>
                        <span className={styles.matchTeam}>
                          {formatParticipant(slot.sideA)}
                        </span>
                        <span className={styles.matchVs}>vs</span>
                        <span className={styles.matchTeam}>
                          {formatParticipant(slot.sideB)}
                        </span>
                      </div>
                      <div className={styles.matchVenue}>
                        <span className={styles.venueIcon} aria-hidden="true">
                          ◆
                        </span>
                        <span>{slot.meta.city}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
