"use client";

import Image from "next/image";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { groups, teamMap } from "@/data/world-cup-2026";
import {
  createInitialFixtureState,
  deriveMatches,
  getChampion,
  getGroupMatchDefinitions,
  getGroupTableRows,
  getThirdPlaceCandidates,
  normalizeFixtureState,
} from "@/lib/world-cup-fixture";

const DEFAULT_GROUP_ORDERS = createInitialFixtureState().groupOrders;
import { isFixtureComplete } from "@/lib/group-utils";
import { getTeamFlagAsset } from "@/lib/team-flag-assets";
import type {
  DerivedMatch,
  FixtureState,
  GroupMatchId,
  GroupMatchPrediction,
  GroupId,
  MatchId,
  TeamId,
} from "@/lib/world-cup-types";
import { THIRD_PLACE_MATCH_IDS } from "@/lib/world-cup-types";

import { TournamentBracket } from "./tournament-bracket";
import { FixturePoster } from "./fixture-poster";
import styles from "./world-cup-app.module.css";

function formatMatchDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function createEmptyKnockoutMatches(matches: Record<MatchId, DerivedMatch>) {
  return Object.fromEntries(
    Object.entries(matches).map(([matchId, match]) => [
      matchId,
      {
        ...match,
        sideA: null,
        sideB: null,
        sideALabel: "Por definir",
        sideBLabel: "Por definir",
        winnerId: undefined,
        loserId: undefined,
      },
    ]),
  ) as Record<MatchId, DerivedMatch>;
}

export function TeamBadge({
  teamId,
  small = false,
}: {
  teamId: TeamId;
  small?: boolean;
}) {
  const team = teamMap[teamId];
  const flagAsset = getTeamFlagAsset(teamId);

  return (
    <span className={small ? styles.teamBadgeSmall : styles.teamBadge}>
      {flagAsset ? (
        <span className={small ? styles.teamFlagImageSmall : styles.teamFlagImage}>
          <Image
            src={flagAsset}
            alt={`Bandera de ${team.shortName}`}
            fill
            sizes={small ? "20px" : "24px"}
            className={styles.teamFlagAsset}
          />
        </span>
      ) : (
        <span className={styles.teamFlag}>{team.flag}</span>
      )}
      <span className={styles.teamCode}>{team.code}</span>
    </span>
  );
}

interface FixtureBuilderProps {
  fixtureState: FixtureState;
  onFixtureStateChange: (state: FixtureState) => void;
  readOnly?: boolean;
  beforeBuilder?: ReactNode;
  afterChampion?: ReactNode;
  summaryActions?: ReactNode;
  currentStep?: number;
  onStepChange?: (step: number) => void;
  onResetAll?: () => void;
  onFeedback?: (message: string) => void;
}

export function FixtureBuilder({
  fixtureState,
  onFixtureStateChange,
  readOnly = false,
  beforeBuilder,
  afterChampion,
  summaryActions,
  currentStep,
  onStepChange,
  onResetAll,
  onFeedback,
}: FixtureBuilderProps) {
  const [confirmingStepReset, setConfirmingStepReset] = useState<number | null>(null);
  const [confirmingFullReset, setConfirmingFullReset] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [exportFeedback, setExportFeedback] = useState("");
  const exportPosterRef = useRef<HTMLDivElement | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<GroupId | null>(null);
  const [groupFilter, setGroupFilter] = useState<"all" | "A-D" | "E-H" | "I-L">("all");
  const groupGridRef = useRef<HTMLDivElement | null>(null);

  const updateState = (next: Partial<FixtureState>) => {
    startTransition(() => {
      onFixtureStateChange(normalizeFixtureState({ ...fixtureState, ...next }));
    });
  };

  const matches = deriveMatches(fixtureState).matchesById;
  const emptyMatches = createEmptyKnockoutMatches(matches);
  const champion = getChampion(matches);
  const runnerUp = matches.M104.loserId ? teamMap[matches.M104.loserId] : null;
  const thirdPlaceWinner = matches.M103.winnerId ? teamMap[matches.M103.winnerId] : null;
  const thirdCandidates = getThirdPlaceCandidates(fixtureState.groupOrders);
  const thirdAssignmentCount = Object.keys(fixtureState.thirdPlaceAssignments).length;
  const hasEightThirdsSelected = fixtureState.qualifiedThirdPlaces.length === 8;
  const allThirdSlotsReady =
    hasEightThirdsSelected && thirdAssignmentCount === 8;
  const isKnockoutReady = allThirdSlotsReady;
  const isComplete = isFixtureComplete(fixtureState);
  const generatedAtLabel = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

  useEffect(() => {
    if (!exportFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setExportFeedback("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [exportFeedback]);

  useEffect(() => {
    setConfirmingStepReset(null);
    setConfirmingFullReset(false);
  }, [currentStep]);

  const moveTeamInGroup = (groupId: GroupId, index: number, direction: -1 | 1) => {
    if (readOnly) {
      return;
    }

    const currentOrder = [...fixtureState.groupOrders[groupId]];
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= currentOrder.length) {
      return;
    }

    if (fixtureState.groupPredictionModes[groupId] === "matches") {
      const pointsByTeam = Object.fromEntries(
        getGroupTableRows(groupId, fixtureState.groupMatchPredictions).map((row) => [
          row.teamId,
          row.points,
        ]),
      ) as Record<TeamId, number>;
      const currentTeam = currentOrder[index];
      const targetTeam = currentOrder[targetIndex];

      if (pointsByTeam[currentTeam] !== pointsByTeam[targetTeam]) {
        return;
      }
    }

    [currentOrder[index], currentOrder[targetIndex]] = [
      currentOrder[targetIndex],
      currentOrder[index],
    ];

    updateState({
      groupOrders: {
        ...fixtureState.groupOrders,
        [groupId]: currentOrder,
      },
    });
  };

  const setGroupPredictionMode = (
    groupId: GroupId,
    mode: "manual" | "matches",
  ) => {
    if (readOnly) {
      return;
    }

    const nextModes = { ...fixtureState.groupPredictionModes };
    if (mode === "matches") {
      nextModes[groupId] = "matches";
    } else {
      delete nextModes[groupId];
    }

    updateState({
      groupPredictionModes: nextModes,
    });
  };

  const pickGroupMatchPrediction = (
    matchId: GroupMatchId,
    prediction: GroupMatchPrediction,
  ) => {
    if (readOnly) {
      return;
    }

    const currentPrediction = fixtureState.groupMatchPredictions[matchId];
    const nextPredictions = { ...fixtureState.groupMatchPredictions };

    if (currentPrediction === prediction) {
      delete nextPredictions[matchId];
    } else {
      nextPredictions[matchId] = prediction;
    }

    updateState({
      groupMatchPredictions: nextPredictions,
    });
  };

  const addThirdPlaceTeam = (teamId: TeamId) => {
    if (
      readOnly ||
      fixtureState.qualifiedThirdPlaces.includes(teamId) ||
      fixtureState.qualifiedThirdPlaces.length >= 8
    ) {
      return;
    }

    updateState({
      qualifiedThirdPlaces: [...fixtureState.qualifiedThirdPlaces, teamId],
    });
  };

  const removeThirdPlaceTeam = (teamId: TeamId) => {
    if (readOnly) {
      return;
    }

    updateState({
      qualifiedThirdPlaces: fixtureState.qualifiedThirdPlaces.filter(
        (selectedTeamId) => selectedTeamId !== teamId,
      ),
    });
  };

  const resetCurrentStep = (step: number) => {
    if (readOnly) {
      return;
    }

    if (step === 1) {
      const fresh = createInitialFixtureState();
      updateState({
        groupOrders: fresh.groupOrders,
        groupMatchPredictions: {},
        groupPredictionModes: {},
        qualifiedThirdPlaces: [],
        thirdPlaceAssignments: {},
        knockoutWinners: {},
      });
      onFeedback?.("Grupos reiniciados.");
    } else if (step === 2) {
      updateState({
        qualifiedThirdPlaces: [],
        thirdPlaceAssignments: {},
        knockoutWinners: {},
      });
      onFeedback?.("Selección de terceros reiniciada.");
    } else if (step === 3) {
      updateState({ knockoutWinners: {} });
      onFeedback?.("Cuadro reiniciado.");
    }

    setConfirmingStepReset(null);
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const pickMatchWinner = (matchId: MatchId, teamId: TeamId) => {
    if (readOnly) {
      return;
    }

    const currentWinner = fixtureState.knockoutWinners[matchId];
    const nextWinners = { ...fixtureState.knockoutWinners };

    if (currentWinner === teamId) {
      delete nextWinners[matchId];
    } else {
      nextWinners[matchId] = teamId;
    }

    updateState({
      knockoutWinners: nextWinners,
    });
  };

  const exportFixtureImage = async () => {
    const posterElement = exportPosterRef.current;

    if (!isComplete || !posterElement) {
      return;
    }

    setIsExportingImage(true);
    setExportFeedback("");

    try {
      const { toBlob } = await import("html-to-image");

      const blob = await toBlob(posterElement, {
        cacheBust: true,
        backgroundColor: "#08101d",
        pixelRatio: 2,
        width: posterElement.scrollWidth,
        height: posterElement.scrollHeight,
      });

      if (!blob) {
        throw new Error("image-export-failed");
      }

      const fileName = `fixture-mundial-2026-${new Date().toISOString().slice(0, 10)}.png`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
      setExportFeedback("Imagen descargada.");
    } catch (error) {
      console.error(error);
      setExportFeedback("No pude generar la imagen. Probá hacer una captura de pantalla.");
    } finally {
      setIsExportingImage(false);
    }
  };

  const showAll = !currentStep;
  const useAccordion = !!currentStep;

  useEffect(() => {
    if (!useAccordion) return;
    if (typeof window !== "undefined" && window.innerWidth < 760) {
      setGroupFilter("A-D");
    }
  }, [useAccordion]);

  const GROUP_FILTER_RANGES: Record<string, string[]> = {
    "A-D": ["A", "B", "C", "D"],
    "E-H": ["E", "F", "G", "H"],
    "I-L": ["I", "J", "K", "L"],
  };

  const filteredGroups =
    useAccordion && groupFilter !== "all"
      ? groups.filter((g) => GROUP_FILTER_RANGES[groupFilter].includes(g.id))
      : groups;

  const toggleGroup = (groupId: GroupId) => {
    setExpandedGroup((prev) => (prev === groupId ? null : groupId));
  };

  const isGroupEdited = (groupId: GroupId): boolean => {
    const current = fixtureState.groupOrders[groupId];
    const defaultOrder = DEFAULT_GROUP_ORDERS[groupId];
    return (
      fixtureState.groupPredictionModes[groupId] === "matches" ||
      current.some((teamId, i) => teamId !== defaultOrder[i])
    );
  };

  useEffect(() => {
    if (!useAccordion || currentStep !== 1) return;
    const grid = groupGridRef.current;
    if (!grid) return;

    import("animejs").then(({ animate, stagger }) => {
      const cards = Array.from(grid.querySelectorAll("[data-gid]")) as HTMLElement[];
      if (!cards.length) return;
      animate(cards, {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 400,
        delay: stagger(55, { start: 40 }),
        ease: "outQuart",
      });
    });
  }, [currentStep, groupFilter, useAccordion]);

  return (
    <>
      {beforeBuilder}

      {(showAll || currentStep === 1) ? (
      <section id="grupos" className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Paso 1</p>
            <h2>{readOnly ? "Orden final de los grupos" : "Ordená los grupos"}</h2>
          </div>
          <p className={styles.sectionHint}>
            {readOnly
              ? "Tocá un grupo para ver el orden final guardado."
              : `${groups.filter((g) => isGroupEdited(g.id)).length}/${groups.length} grupos editados`}
          </p>
        </div>

        {useAccordion ? (
          <div className={styles.groupFilterBar}>
            {(["all", "A-D", "E-H", "I-L"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`${styles.groupFilterBtn} ${
                  groupFilter === f ? styles.groupFilterBtnActive : ""
                }`}
                onClick={() => {
                  setGroupFilter(f);
                  setExpandedGroup(null);
                }}
              >
                {f === "all" ? "Todos" : f}
              </button>
            ))}
          </div>
        ) : null}

        <div className={styles.groupGrid} ref={groupGridRef}>
          {filteredGroups.map((group) => {
            const isExpanded = !useAccordion || expandedGroup === group.id;
            const edited = isGroupEdited(group.id);
            const isMatchMode = fixtureState.groupPredictionModes[group.id] === "matches";
            const groupMatches = getGroupMatchDefinitions(group.id);
            const groupTableRows = getGroupTableRows(
              group.id,
              fixtureState.groupMatchPredictions,
            );
            const groupPointsByTeam = Object.fromEntries(
              groupTableRows.map((row) => [row.teamId, row.points]),
            ) as Record<TeamId, number>;
            const pendingGroupMatches = groupMatches.filter(
              (match) => !fixtureState.groupMatchPredictions[match.id],
            ).length;
            const hasPointTie = groupTableRows.some(
              (row, index) =>
                groupTableRows.findIndex((other) => other.points === row.points) !== index,
            );
            const hasPendingTieAdjustment = isMatchMode && hasPointTie;

            return (
              <article
                key={group.id}
                data-gid={group.id}
                className={`${styles.groupCard} ${
                  useAccordion && isExpanded ? styles.groupCardExpanded : ""
                }`}
                style={
                  {
                    "--group-color": group.color,
                    "--group-accent": group.accent,
                  } as CSSProperties
                }
              >
                {useAccordion ? (
                  <button
                    type="button"
                    className={styles.groupToggleRow}
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className={styles.groupCompactMeta}>
                      <div className={styles.groupCompactTopRow}>
                        <p className={styles.groupLabel}>{group.label}</p>
                        {edited ? (
                          <span
                            className={`${styles.groupStateBadge} ${
                              hasPendingTieAdjustment
                                ? styles.groupStatePending
                                : styles.groupStateEdited
                            }`}
                          >
                            {hasPendingTieAdjustment ? "Ajuste pendiente" : "Editado"}
                          </span>
                        ) : null}
                      </div>
                      <div className={styles.groupCompactList}>
                        {fixtureState.groupOrders[group.id].map((teamId) => (
                          <TeamBadge key={teamId} teamId={teamId} small />
                        ))}
                      </div>
                    </div>
                    <span className={styles.groupChevron} aria-hidden>
                      ▼
                    </span>
                  </button>
                ) : (
                  <header className={styles.groupHeader}>
                    <div>
                      <p className={styles.groupLabel}>{group.label}</p>
                      <strong>
                        {fixtureState.groupOrders[group.id]
                          .map((teamId) => teamMap[teamId].code)
                          .join(" · ")}
                      </strong>
                    </div>
                  </header>
                )}

                {/* Accordion: always in DOM, animated via grid-template-rows */}
                <div
                  className={`${styles.groupExpandedWrapper} ${
                    isExpanded ? styles.groupExpandedOpen : ""
                  }`}
                >
                  <div className={styles.groupExpandedInner}>
                    <div
                      className={
                        useAccordion ? styles.groupExpandedContent : styles.groupTeams
                      }
                    >
                      {!readOnly ? (
                        <div className={styles.groupModeBar}>
                          <button
                            type="button"
                            className={`${styles.groupModeButton} ${
                              !isMatchMode ? styles.groupModeButtonActive : ""
                            }`}
                            onClick={() => setGroupPredictionMode(group.id, "manual")}
                          >
                            Ordenar manualmente
                          </button>
                          <button
                            type="button"
                            className={`${styles.groupModeButton} ${
                              isMatchMode ? styles.groupModeButtonActive : ""
                            }`}
                            onClick={() => setGroupPredictionMode(group.id, "matches")}
                          >
                            Predecir por partidos
                          </button>
                        </div>
                      ) : null}

                      {isMatchMode ? (
                        <div className={styles.groupMatchPanel}>
                          <div className={styles.groupMatchHeader}>
                            <div>
                              <strong>Partidos del grupo</strong>
                              <span>
                                {pendingGroupMatches > 0
                                  ? `Faltan ${pendingGroupMatches} partidos por predecir`
                                  : "Grupo completo por partidos"}
                              </span>
                            </div>
                            {hasPointTie ? (
                              <div className={styles.groupTieNotice}>
                                <span>Empate en puntos</span>
                                <small>Ajustá el orden final con las flechas.</small>
                              </div>
                            ) : null}
                          </div>

                          <div className={styles.groupMatchList}>
                            {groupMatches.map((match) => {
                              const homeTeam = teamMap[match.homeTeamId];
                              const awayTeam = teamMap[match.awayTeamId];
                              const selected =
                                fixtureState.groupMatchPredictions[match.id];

                              return (
                                <div key={match.id} className={styles.groupMatchRow}>
                                  <div className={styles.groupMatchTeams}>
                                    <TeamBadge teamId={homeTeam.id} small />
                                    <span>vs</span>
                                    <TeamBadge teamId={awayTeam.id} small />
                                  </div>
                                  {!readOnly ? (
                                    <div className={styles.groupMatchButtons}>
                                      {(
                                        [
                                          ["home", homeTeam.code],
                                          ["draw", "Empate"],
                                          ["away", awayTeam.code],
                                        ] as const
                                      ).map(([prediction, label]) => (
                                        <button
                                          key={prediction}
                                          type="button"
                                          className={
                                            selected === prediction
                                              ? styles.groupMatchButtonActive
                                              : ""
                                          }
                                          onClick={() =>
                                            pickGroupMatchPrediction(
                                              match.id,
                                              prediction,
                                            )
                                          }
                                        >
                                          {label}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className={styles.groupMatchReadOnly}>
                                      {selected === "home"
                                        ? `Gana ${homeTeam.code}`
                                        : selected === "away"
                                          ? `Gana ${awayTeam.code}`
                                          : selected === "draw"
                                            ? "Empate"
                                            : "Pendiente"}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className={styles.groupTableMini}>
                            <div className={styles.groupTableHead}>
                              <span>Pos.</span>
                              <span>Selección</span>
                              <span>PJ</span>
                              <span>Pts</span>
                            </div>
                            {fixtureState.groupOrders[group.id].map((teamId, index) => {
                              const row = groupTableRows.find(
                                (entry) => entry.teamId === teamId,
                              );

                              return (
                                <div key={teamId} className={styles.groupTableRow}>
                                  <span>{index + 1}</span>
                                  <TeamBadge teamId={teamId} small />
                                  <span>{row?.played ?? 0}</span>
                                  <strong>{row?.points ?? 0}</strong>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {isMatchMode ? (
                        <div className={styles.groupResultPanel}>
                          <div className={styles.groupResultHeader}>
                            <div>
                              <strong>Orden resultante</strong>
                              <span>
                                {hasPointTie
                                  ? "Usá las flechas solo para resolver equipos empatados."
                                  : "Calculado automáticamente por puntos."}
                              </span>
                            </div>
                          </div>

                          <div className={styles.groupResultList}>
                            {fixtureState.groupOrders[group.id].map((teamId, index) => {
                              const team = teamMap[teamId];
                              const previousTeamId =
                                fixtureState.groupOrders[group.id][index - 1];
                              const nextTeamId =
                                fixtureState.groupOrders[group.id][index + 1];
                              const canMoveUp =
                                index > 0 &&
                                groupPointsByTeam[teamId] ===
                                  groupPointsByTeam[previousTeamId];
                              const canMoveDown =
                                index < 3 &&
                                groupPointsByTeam[teamId] ===
                                  groupPointsByTeam[nextTeamId];

                              return (
                                <div
                                  key={team.id}
                                  className={`${styles.groupTeamRow} ${styles.groupResultRow}`}
                                >
                                  <div className={styles.groupTeamInfo}>
                                    <span className={styles.groupPosition}>
                                      {index + 1}
                                    </span>
                                    <TeamBadge teamId={team.id} />
                                    <div className={styles.groupTeamText}>
                                      <strong>{team.shortName}</strong>
                                      <span>{groupPointsByTeam[teamId] ?? 0} pts</span>
                                    </div>
                                  </div>

                                  {!readOnly ? (
                                    <div className={styles.groupMoveControls}>
                                      <button
                                        type="button"
                                        aria-label={`Subir a ${team.shortName}`}
                                        onClick={() =>
                                          moveTeamInGroup(group.id, index, -1)
                                        }
                                        disabled={!canMoveUp}
                                      >
                                        ↑
                                      </button>
                                      <button
                                        type="button"
                                        aria-label={`Bajar a ${team.shortName}`}
                                        onClick={() =>
                                          moveTeamInGroup(group.id, index, 1)
                                        }
                                        disabled={!canMoveDown}
                                      >
                                        ↓
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                      fixtureState.groupOrders[group.id].map((teamId, index) => {
                        const team = teamMap[teamId];
                        const previousTeamId = fixtureState.groupOrders[group.id][index - 1];
                        const nextTeamId = fixtureState.groupOrders[group.id][index + 1];
                        const canMoveUp =
                          index > 0 &&
                          (!isMatchMode ||
                            groupPointsByTeam[teamId] === groupPointsByTeam[previousTeamId]);
                        const canMoveDown =
                          index < 3 &&
                          (!isMatchMode ||
                            groupPointsByTeam[teamId] === groupPointsByTeam[nextTeamId]);

                        return (
                          <div key={team.id} className={styles.groupTeamRow}>
                            <div className={styles.groupTeamInfo}>
                              <span className={styles.groupPosition}>{index + 1}</span>
                              <TeamBadge teamId={team.id} />
                              <div className={styles.groupTeamText}>
                                <strong>{team.shortName}</strong>
                                <span>{team.code}</span>
                              </div>
                            </div>

                            {!readOnly ? (
                              <div className={styles.groupMoveControls}>
                                <button
                                  type="button"
                                  aria-label={`Subir a ${team.shortName}`}
                                  onClick={() => moveTeamInGroup(group.id, index, -1)}
                                  disabled={!canMoveUp}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Bajar a ${team.shortName}`}
                                  onClick={() => moveTeamInGroup(group.id, index, 1)}
                                  disabled={!canMoveDown}
                                >
                                  ↓
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!readOnly ? (
          <div className={styles.inlineStepActions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() =>
                onStepChange ? onStepChange(2) : scrollToSection("terceros")
              }
            >
              Confirmar grupos →
            </button>
            {confirmingStepReset === 1 ? (
              <div className={styles.confirmResetRow}>
                <button
                  type="button"
                  className={styles.dangerAction}
                  onClick={() => resetCurrentStep(1)}
                >
                  Sí, limpiar grupos
                </button>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => setConfirmingStepReset(null)}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.resetAction}
                onClick={() => setConfirmingStepReset(1)}
              >
                Limpiar grupos
              </button>
            )}
          </div>
        ) : null}
      </section>
      ) : null}

      {(showAll || currentStep === 2) ? (
      <>
      <section id="terceros" className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Paso 2</p>
            <h2>{readOnly ? "Terceros clasificados" : "Elegí los 8 terceros clasificados"}</h2>
          </div>
          <p className={styles.sectionHint}>
            {readOnly
              ? "Se muestran las terceras selecciones que avanzan a 16avos."
              : "Vos elegís qué terceros pasan. El sistema los ubica automáticamente en el cuadro."}
          </p>
        </div>

        <div className={styles.thirdsPickerHeader}>
          <strong>{fixtureState.qualifiedThirdPlaces.length}/8 seleccionados</strong>
          {!readOnly ? (
            confirmingStepReset === 2 ? (
              <div className={styles.confirmResetRow}>
                <button
                  type="button"
                  className={styles.dangerAction}
                  onClick={() => resetCurrentStep(2)}
                >
                  Sí, limpiar
                </button>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => setConfirmingStepReset(null)}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.resetAction}
                onClick={() => setConfirmingStepReset(2)}
                disabled={fixtureState.qualifiedThirdPlaces.length === 0}
              >
                Limpiar selección
              </button>
            )
          ) : null}
        </div>

        <div className={styles.thirdsGrid}>
          {thirdCandidates.map((team) => {
            const isSelected = fixtureState.qualifiedThirdPlaces.includes(team.id);
            const canToggle =
              !readOnly && (isSelected || fixtureState.qualifiedThirdPlaces.length < 8);

            return (
              <button
                key={team.id}
                type="button"
                className={`${styles.thirdSelectableCard} ${
                  isSelected ? styles.thirdSelectableCardSelected : ""
                }`}
                onClick={() =>
                  isSelected ? removeThirdPlaceTeam(team.id) : addThirdPlaceTeam(team.id)
                }
                disabled={!canToggle}
                aria-pressed={isSelected}
              >
                <span className={styles.thirdRank}>{team.group}</span>
                <span className={styles.thirdTeamInfo}>
                  <TeamBadge teamId={team.id} />
                  <span>
                    <strong>{team.shortName}</strong>
                    <small>3° del Grupo {team.group}</small>
                  </span>
                </span>
                <span className={styles.thirdCheck}>{isSelected ? "✓" : "+"}</span>
              </button>
            );
          })}
        </div>

        {!readOnly ? (
          <div className={styles.inlineStepActions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() =>
                onStepChange ? onStepChange(3) : scrollToSection("cuadro")
              }
              disabled={!isKnockoutReady}
            >
              Continuar al cuadro →
            </button>
          </div>
        ) : null}
      </section>

      <details className={styles.assignmentDisclosure}>
        <summary>
          <span>Ubicación de los terceros</span>
          <strong>{thirdAssignmentCount}/8 resueltos</strong>
        </summary>
        <p>
          {fixtureState.qualifiedThirdPlaces.length < 8
            ? "Elegí ocho terceros clasificados para ver cómo caen en el cuadro."
            : allThirdSlotsReady
              ? "La matriz de cruces del torneo ubicó automáticamente a cada tercero."
              : "La combinación seleccionada todavía no pudo resolverse con la matriz de cruces."}
        </p>

        {allThirdSlotsReady ? (
          <div className={styles.assignmentGrid}>
            {THIRD_PLACE_MATCH_IDS.map((matchId) => {
              const assignedTeamId = fixtureState.thirdPlaceAssignments[matchId];
              const assignedTeam = assignedTeamId ? teamMap[assignedTeamId] : null;
              const match = matches[matchId];

              return (
                <article key={matchId} className={styles.assignmentCard}>
                  <div className={styles.assignmentHeader}>
                    <div>
                      <p>{matchId}</p>
                      <strong>{match.sideALabel}</strong>
                    </div>
                    <span className={styles.assignmentDate}>
                      {formatMatchDate(match.meta.date)}
                    </span>
                  </div>

                  <p className={styles.assignmentMeta}>
                    {assignedTeam
                      ? `${assignedTeam.shortName} · Grupo ${assignedTeam.group}`
                      : "Sin tercero asignado"}
                  </p>
                </article>
              );
            })}
          </div>
        ) : null}
      </details>
      </>
      ) : null}

      {(showAll || currentStep === 3) ? (
      <section id="cuadro" className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Paso 3</p>
            <h2>{readOnly ? "Cuadro final guardado" : "Completá el cuadro final"}</h2>
          </div>
          <p className={styles.sectionHint}>
            {readOnly
              ? "Esta vista conserva las selecciones guardadas hasta la final."
              : isKnockoutReady
                ? "Cada partido muestra la fecha. Tocá el botón de info para ver sede y número de partido, y elegí una selección ganadora."
                : "El cuadro se habilita cuando elegís los ocho mejores terceros clasificados."}
          </p>
        </div>

        <div className={styles.championBand}>
          <div>
            <p className={styles.sectionEyebrow}>Campeón proyectado</p>
            <h3>
              {!isKnockoutReady
                ? "Cuadro pendiente"
                : champion
                  ? champion.shortName
                  : "Todavía no elegiste campeón"}
            </h3>
            <p>
              {!isKnockoutReady
                ? "Primero definí los mejores terceros para que aparezcan los cruces."
                : champion
                ? `Tu predicción levanta la copa en ${matches.M104.meta.city}.`
                : "Hace falta completar todos los cruces hasta la final para cerrar la predicción."}
            </p>
          </div>
          {isKnockoutReady && champion ? <TeamBadge teamId={champion.id} /> : null}
        </div>

        {afterChampion}

        <TournamentBracket
          matchesById={isKnockoutReady ? matches : emptyMatches}
          onPickWinner={isKnockoutReady && !readOnly ? pickMatchWinner : undefined}
          readOnly={readOnly || !isKnockoutReady}
        />

        {!readOnly && onStepChange ? (
          <div className={styles.inlineStepActions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => onStepChange(4)}
              disabled={!isKnockoutReady}
            >
              Ver resumen →
            </button>
            {confirmingStepReset === 3 ? (
              <div className={styles.confirmResetRow}>
                <button
                  type="button"
                  className={styles.dangerAction}
                  onClick={() => resetCurrentStep(3)}
                >
                  Sí, limpiar cuadro
                </button>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => setConfirmingStepReset(null)}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.resetAction}
                onClick={() => setConfirmingStepReset(3)}
                disabled={
                  Object.keys(fixtureState.knockoutWinners).length === 0
                }
              >
                Limpiar cuadro
              </button>
            )}
          </div>
        ) : null}
      </section>
      ) : null}

      {(showAll || currentStep === 4) ? (
      <section id="resumen" className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Paso 4</p>
            <h2>Resumen y compartir</h2>
          </div>
          <p className={styles.sectionHint}>
            Cuando termines el cuadro, descargá tu imagen, copiá el link o guardá la
            predicción para competir.
          </p>
        </div>

        <div className={styles.summaryGridCards}>
          <article className={styles.summaryCardGold}>
            <div className={styles.summaryCardTop}>
              <span className={styles.summaryLabel}>Campeón</span>
              <span className={styles.summaryRank}>1.º</span>
            </div>
            <strong>{champion?.shortName ?? "Sin definir"}</strong>
            {champion ? <TeamBadge teamId={champion.id} /> : null}
          </article>
          <article className={styles.summaryCardSilver}>
            <div className={styles.summaryCardTop}>
              <span className={styles.summaryLabel}>Subcampeón</span>
              <span className={styles.summaryRank}>2.º</span>
            </div>
            <strong>{runnerUp?.shortName ?? "Sin definir"}</strong>
            {runnerUp ? <TeamBadge teamId={runnerUp.id} /> : null}
          </article>
          <article className={styles.summaryCardBronze}>
            <div className={styles.summaryCardTop}>
              <span className={styles.summaryLabel}>Tercer puesto</span>
              <span className={styles.summaryRank}>3.º</span>
            </div>
            <strong>{thirdPlaceWinner?.shortName ?? "Sin definir"}</strong>
            {thirdPlaceWinner ? <TeamBadge teamId={thirdPlaceWinner.id} /> : null}
          </article>
        </div>

        <div className={styles.exportPanel}>
          <div className={styles.exportCopy}>
            <p className={styles.sectionEyebrow}>Exportar imagen</p>
            <h3>Guardá tu cuadro final como imagen</h3>
            <p>
              Generá una imagen prolija del cuadro final con fechas y calidad lista para
              descargar.
            </p>
          </div>

          <div className={styles.exportActions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={exportFixtureImage}
              disabled={!isKnockoutReady || !isComplete || isExportingImage}
            >
              {isExportingImage
                ? "Generando imagen..."
                : !isKnockoutReady
                  ? "Elegí los 8 terceros para exportar"
                  : isComplete
                    ? "Descargar imagen PNG"
                    : "Completá el cuadro para exportar tu imagen"}
            </button>
            {exportFeedback ? <p className={styles.exportFeedback}>{exportFeedback}</p> : null}
          </div>
        </div>

        {summaryActions}

        {isKnockoutReady ? (
          <div className={styles.posterCaptureRoot} aria-hidden>
            <FixturePoster
              ref={exportPosterRef}
              matchesById={matches}
              championName={champion?.shortName ?? "Sin campeón definido"}
              generatedAtLabel={generatedAtLabel}
              title={readOnly ? "Fixture guardado Mundial 2026" : "Tu fixture Mundial 2026"}
            />
          </div>
        ) : null}
      </section>
      ) : null}

      {!readOnly && onResetAll ? (
        <footer className={styles.fullResetFooter}>
          {confirmingFullReset ? (
            <div className={styles.confirmResetRow}>
              <span className={styles.fullResetHint}>
                Esto borra todos los pasos y vuelve a empezar.
              </span>
              <button
                type="button"
                className={styles.dangerAction}
                onClick={() => {
                  onResetAll();
                  setConfirmingFullReset(false);
                }}
              >
                Sí, empezar de cero
              </button>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => setConfirmingFullReset(false)}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.resetAction}
              onClick={() => setConfirmingFullReset(true)}
            >
              Empezar de cero
            </button>
          )}
        </footer>
      ) : null}
    </>
  );
}
