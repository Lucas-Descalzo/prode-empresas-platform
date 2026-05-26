"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createInitialFixtureState } from "@/lib/world-cup-fixture";
import type { GroupPageData } from "@/lib/group-types";
import {
  formatArgentinaDateTime,
  getRemainingKnockoutMatchesCount,
} from "@/lib/group-utils";
import {
  decodeFixtureState,
  encodeFixtureState,
  FIXTURE_STORAGE_KEY,
} from "@/lib/world-cup-state";
import type { FixtureState } from "@/lib/world-cup-types";

import { FixtureBuilder } from "./fixture-builder";
import { ScoringExplainer } from "./scoring-explainer";
import styles from "./group-page.module.css";

interface GroupPageClientProps {
  data: GroupPageData;
}

function getLegacyDraftKey(slug: string, isPublicPool: boolean) {
  return isPublicPool ? "fwc26-public-pool-draft" : `fwc26-group-draft:${slug}`;
}

function getPredictionTarget(pathname: string | null, fallback: string) {
  const returnTo = pathname || fallback;
  return `/mi-prediccion?returnTo=${encodeURIComponent(returnTo)}`;
}

export function GroupPageClient({ data }: GroupPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const [fixtureState, setFixtureState] = useState<FixtureState>(createInitialFixtureState());
  const [hasStoredPrediction, setHasStoredPrediction] = useState(false);
  const [loadedFromResume, setLoadedFromResume] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [editKey, setEditKey] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [hasSavedEntry, setHasSavedEntry] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState(
    data.participants[0]?.id ?? "",
  );

  const isPublicPool = data.group.isPublicPool;
  const fallbackPath = isPublicPool ? "/ligas/general" : `/ligas/${data.group.slug}`;
  const predictionTarget = getPredictionTarget(pathname, fallbackPath);
  const legacyDraftKey = useMemo(
    () => getLegacyDraftKey(data.group.slug, isPublicPool),
    [data.group.slug, isPublicPool],
  );
  const remainingMatches = getRemainingKnockoutMatchesCount(fixtureState);
  const isPredictionComplete = hasStoredPrediction && remainingMatches === 0;
  const selectedParticipant = data.participants.find(
    (participant) => participant.id === selectedParticipantId,
  );

  useEffect(() => {
    if (data.isClosed) {
      return;
    }

    const mainDraft = window.localStorage.getItem(FIXTURE_STORAGE_KEY);
    const mainPrediction = decodeFixtureState(mainDraft);
    if (mainPrediction) {
      setFixtureState(mainPrediction);
      setHasStoredPrediction(true);
      return;
    }

    const legacyDraft = window.localStorage.getItem(legacyDraftKey);
    const legacyPrediction = decodeFixtureState(legacyDraft);
    if (legacyPrediction) {
      setFixtureState(legacyPrediction);
      setHasStoredPrediction(true);
      window.localStorage.setItem(FIXTURE_STORAGE_KEY, encodeFixtureState(legacyPrediction));
    }
  }, [data.isClosed, legacyDraftKey]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback("");
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const saveButtonLabel = data.isClosed
    ? "Predicciones cerradas"
    : hasSavedEntry
      ? "Actualizar mi predicción en esta liga"
      : "Usar esta predicción en esta liga";
  const saveEndpoint = isPublicPool
    ? "/api/public-pool/entries"
    : `/api/groups/${data.group.slug}/entries`;
  const resumeEndpoint = isPublicPool
    ? "/api/public-pool/entries/resume"
    : `/api/groups/${data.group.slug}/entries/resume`;
  const introCopy = isPublicPool
    ? "Usá tu predicción completa para participar en el ranking público del proyecto."
    : "Cada participante usa su predicción completa con nombre, apellido y clave.";
  const closedCopy = isPublicPool
    ? "La Liga general ya cerró y ahora podés recorrer las predicciones guardadas."
    : "Esta liga ya cerró y ahora podés recorrer los fixtures guardados.";
  const rankingTitle = isPublicPool ? "Ranking general" : "Ranking de la liga";

  const disableSave =
    data.isClosed ||
    isSaving ||
    !isPredictionComplete ||
    !firstName.trim() ||
    !lastName.trim() ||
    !editKey.trim();

  const copyGroupLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setFeedback(isPublicPool ? "Link de la Liga general copiado." : "Link de la liga copiado.");
    } catch {
      setFeedback("No pude copiar el link automáticamente.");
    }
  };

  const handleResume = async () => {
    setIsResuming(true);
    setFeedback("");

    try {
      const response = await fetch(resumeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          editKey,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        fixtureState?: FixtureState;
        deadlineReached?: boolean;
        lockedUntilUtc?: string | null;
        message?: string;
      };

      if (!response.ok || !payload.ok || !payload.fixtureState) {
        if (payload.deadlineReached) {
          router.refresh();
          return;
        }

        if (payload.lockedUntilUtc) {
          setFeedback(
            `Tu participación quedó bloqueada hasta ${formatArgentinaDateTime(payload.lockedUntilUtc)}.`,
          );
          return;
        }

        setFeedback(payload.message ?? "No pudimos validar esos datos.");
        return;
      }

      const encoded = encodeFixtureState(payload.fixtureState);
      window.localStorage.setItem(FIXTURE_STORAGE_KEY, encoded);
      setFixtureState(payload.fixtureState);
      setHasStoredPrediction(true);
      setLoadedFromResume(true);
      setHasSavedEntry(true);
      setFeedback("Cargamos esta predicción para que puedas editarla.");
      window.setTimeout(() => router.push(predictionTarget), 600);
    } catch {
      setFeedback("No pudimos recuperar tu predicción.");
    } finally {
      setIsResuming(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback("");

    try {
      const response = await fetch(saveEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          editKey,
          fixtureState,
        }),
      });

      const payload = (await response.json()) as {
        saved?: boolean;
        remainingMatches?: number;
        isUpdate?: boolean;
        deadlineReached?: boolean;
        lockedUntilUtc?: string | null;
        message?: string;
      };

      if (!response.ok || !payload.saved) {
        if (payload.deadlineReached) {
          router.refresh();
          return;
        }

        if (payload.lockedUntilUtc) {
          setFeedback(
            `Tu participación quedó bloqueada hasta ${formatArgentinaDateTime(payload.lockedUntilUtc)}.`,
          );
          return;
        }

        if (typeof payload.remainingMatches === "number" && payload.remainingMatches > 0) {
          setFeedback(`Te faltan ${payload.remainingMatches} partidos por definir.`);
          return;
        }

        setFeedback(payload.message ?? "No pudimos guardar tu predicción.");
        return;
      }

      setHasSavedEntry(true);
      setFeedback(
        payload.isUpdate
          ? "Tu predicción fue actualizada en esta liga."
          : "Tu predicción quedó guardada en esta liga.",
      );
      router.refresh();
    } catch {
      setFeedback("No pudimos guardar tu predicción.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.pageShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{isPublicPool ? "Liga general" : "Liga de amigos"}</p>
          <h1>{data.group.name}</h1>
          <p>{data.isClosed ? closedCopy : introCopy}</p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={copyGroupLink}>
            Copiar link
          </button>
          <Link href="/ligas" className={styles.secondaryButton}>
            Ver ligas
          </Link>
        </div>
      </header>

      <motion.section
        className={styles.summaryGrid}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
      >
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Estado</p>
          <strong>{data.isClosed ? "Cerrada" : "Abierta"}</strong>
          <span>Fecha límite: {formatArgentinaDateTime(data.group.deadlineAtUtc)}</span>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Participantes</p>
          <strong>{data.participants.length}</strong>
          <span>
            {data.isClosed
              ? "Podés revisar las predicciones guardadas."
              : "Por ahora solo se muestra quién ya participó."}
          </span>
        </article>
      </motion.section>

      <ScoringExplainer enabled={data.group.scoringEnabled} />

      {data.group.scoringEnabled ? (
        <section className={styles.rankingCard}>
          <div className={styles.cardHeader}>
            <p className={styles.eyebrow}>Puntaje</p>
            <h2>{rankingTitle}</h2>
            <p>
              {data.hasOfficialResults
                ? "Se actualiza con los resultados reales cargados manualmente desde el admin."
                : "Todavía no hay resultados reales cargados. Cuando se carguen, esta tabla empezará a sumar puntos."}
            </p>
          </div>

          {data.hasOfficialResults && data.ranking.length > 0 ? (
            <div className={styles.rankingTable}>
              {data.ranking.map((row, index) => (
                <div key={row.entryId} className={styles.rankingRow}>
                  <strong>#{index + 1}</strong>
                  <span>{row.displayName}</span>
                  <b>{row.total} pts</b>
                  <small>
                    {row.groupClassificationPoints + row.groupExactPositionPoints} grupos +{" "}
                    {row.roundOf32Points +
                      row.roundOf16Points +
                      row.quarterFinalPoints +
                      row.semiFinalPoints +
                      row.finalistPoints}{" "}
                    supervivencia +{" "}
                    {row.exactFinalBonus + row.championBonus + row.thirdPlaceBonus} bonus
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>
              {data.hasOfficialResults
                ? "Todavía no hay participantes para rankear."
                : "Ranking pendiente de resultados oficiales."}
            </p>
          )}
        </section>
      ) : null}

      {feedback ? <p className={styles.feedbackBanner}>{feedback}</p> : null}

      {!data.isClosed ? (
        <>
          {!isPredictionComplete ? (
            <section className={styles.savePanel}>
              <div>
                <p className={styles.eyebrow}>Primero Mi predicción</p>
                <h2>Primero necesitás completar tu predicción</h2>
                <p>
                  Las ligas usan tu predicción principal. Cuando la termines, volvés
                  acá para guardarla en esta liga.
                </p>
              </div>
              <div className={styles.savePanelActions}>
                {hasStoredPrediction ? (
                  <strong>{remainingMatches} partidos pendientes</strong>
                ) : (
                  <strong>Sin predicción guardada</strong>
                )}
                <Link href={predictionTarget} className={styles.primaryButton}>
                  {hasStoredPrediction ? "Continuar mi predicción" : "Armar mi predicción"}
                </Link>
              </div>
            </section>
          ) : (
            <section className={styles.savePanel}>
              <div>
                <p className={styles.eyebrow}>Predicción lista</p>
                <h2>Usá tu predicción en esta liga</h2>
                <p>
                  Ya tenés una predicción completa. Completá tus datos para guardarla
                  o actualizarla en esta liga.
                </p>
              </div>
              <div className={styles.savePanelActions}>
                <strong>Predicción completa</strong>
                <Link href={predictionTarget} className={styles.secondaryButton}>
                  Editar antes de guardar
                </Link>
              </div>
            </section>
          )}

          <section className={styles.openLayout}>
            {isPredictionComplete ? (
              <article className={styles.identityCard}>
                <div className={styles.cardHeader}>
                  <p className={styles.eyebrow}>Tu participación</p>
                  <h2>Nombre, apellido y clave</h2>
                  <p>
                    La clave te permite volver a editar hasta la fecha límite. No se
                    recupera.
                  </p>
                </div>

                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span>Nombre</span>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Nombre"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Apellido</span>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Apellido"
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <span>Clave</span>
                  <input
                    type="password"
                    value={editKey}
                    onChange={(event) => setEditKey(event.target.value)}
                    placeholder="Tu clave de edición"
                  />
                </label>

                <div className={styles.inlineActions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleSave}
                    disabled={disableSave}
                  >
                    {isSaving ? "Guardando..." : saveButtonLabel}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleResume}
                    disabled={
                      isResuming || !firstName.trim() || !lastName.trim() || !editKey.trim()
                    }
                  >
                    {isResuming ? "Buscando..." : "Retomar mi fixture"}
                  </button>
                </div>
              </article>
            ) : (
              <article className={styles.identityCard}>
                <div className={styles.cardHeader}>
                  <p className={styles.eyebrow}>Editar una participación</p>
                  <h2>Retomar mi fixture</h2>
                  <p>
                    Si ya habías guardado una predicción en esta liga, ingresá tus datos
                    y la cargamos como Mi predicción para que puedas editarla.
                  </p>
                </div>

                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span>Nombre</span>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Nombre"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Apellido</span>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Apellido"
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <span>Clave</span>
                  <input
                    type="password"
                    value={editKey}
                    onChange={(event) => setEditKey(event.target.value)}
                    placeholder="Tu clave de edición"
                  />
                </label>

                <div className={styles.inlineActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleResume}
                    disabled={
                      isResuming || !firstName.trim() || !lastName.trim() || !editKey.trim()
                    }
                  >
                    {isResuming ? "Buscando..." : "Retomar mi fixture"}
                  </button>
                </div>
              </article>
            )}

            <article className={styles.participantsCard}>
              <div className={styles.cardHeader}>
                <p className={styles.eyebrow}>Ya participaron</p>
                <h2>Participantes confirmados</h2>
                <p>
                  Antes del cierre solo se muestra quién ya cargó su predicción, no sus
                  elecciones.
                </p>
              </div>

              {data.participants.length === 0 ? (
                <p className={styles.emptyState}>Todavía nadie guardó su predicción.</p>
              ) : (
                <ul className={styles.participantList}>
                  {data.participants.map((participant) => (
                    <li key={participant.id} className={styles.participantRow}>
                      <strong>{participant.displayName}</strong>
                      <span>{formatArgentinaDateTime(participant.updatedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>

          {loadedFromResume ? (
            <p className={styles.feedbackBanner}>
              Cargamos esta predicción como tu predicción principal. Desde el resumen
              vas a poder volver a esta liga.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <section className={styles.closedLayout}>
            <article className={styles.participantsCard}>
              <div className={styles.cardHeader}>
                <p className={styles.eyebrow}>Predicciones guardadas</p>
                <h2>Elegí una para verla</h2>
                <p>Las mostramos en orden alfabético por nombre completo.</p>
              </div>

              {data.participants.length === 0 ? (
                <p className={styles.emptyState}>
                  Esta liga cerró sin participantes guardados.
                </p>
              ) : (
                <div className={styles.closedParticipantList}>
                  {data.participants.map((participant) => (
                    <button
                      key={participant.id}
                      type="button"
                      className={`${styles.participantChoice} ${
                        participant.id === selectedParticipantId
                          ? styles.participantChoiceActive
                          : ""
                      }`}
                      onClick={() => setSelectedParticipantId(participant.id)}
                    >
                      <strong>{participant.displayName}</strong>
                      <span>{formatArgentinaDateTime(participant.updatedAt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </article>
          </section>

          {selectedParticipant?.fixtureState ? (
            <FixtureBuilder
              fixtureState={selectedParticipant.fixtureState}
              onFixtureStateChange={() => undefined}
              readOnly
              beforeBuilder={
                <section className={styles.readOnlyBanner}>
                  <div>
                    <p className={styles.eyebrow}>Predicción seleccionada</p>
                    <h2>{selectedParticipant.displayName}</h2>
                    <p>
                      Guardada por última vez el{" "}
                      {formatArgentinaDateTime(selectedParticipant.updatedAt)}.
                    </p>
                  </div>
                </section>
              }
            />
          ) : null}
        </>
      )}
    </div>
  );
}
