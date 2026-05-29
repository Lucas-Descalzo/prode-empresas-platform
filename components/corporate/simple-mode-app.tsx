"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { FixtureBuilder } from "@/components/fixture-builder";
import type { CompanyRecord } from "@/lib/corporate/types";
import { getRemainingKnockoutMatchesCount } from "@/lib/group-utils";
import {
  formatSimpleModeCutoffLabel,
  getSimpleModeCountdownLabel,
  isSimpleModeLocked,
} from "@/lib/simple-mode-rules";
import {
  createInitialFixtureState,
  normalizeFixtureState,
} from "@/lib/world-cup-fixture";
import type { FixtureState } from "@/lib/world-cup-types";
import styles from "./corporate-shell.module.css";

interface SimpleModeAppProps {
  client: CompanyRecord;
  initialFixtureState: FixtureState | null;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type Step = 1 | 2 | 3 | 4;

const DEFAULT_FIXTURE_STATE = createInitialFixtureState();
const TOTAL_GROUPS = Object.keys(DEFAULT_FIXTURE_STATE.groupOrders).length;
const TOTAL_KNOCKOUT_MATCHES = 32;

function getAutoStep(state: FixtureState): Step {
  const remainingKnockout = getRemainingKnockoutMatchesCount(state);

  if (remainingKnockout === 0 && state.qualifiedThirdPlaces.length === 8) {
    return 4;
  }

  if (state.qualifiedThirdPlaces.length === 8) {
    return 3;
  }

  if (state.qualifiedThirdPlaces.length > 0) {
    return 2;
  }

  return 1;
}

function getEditedGroupsCount(state: FixtureState) {
  return Object.entries(state.groupOrders).filter(([groupId, order]) => {
    const typedGroupId = groupId as keyof typeof DEFAULT_FIXTURE_STATE.groupOrders;
    const defaultOrder = DEFAULT_FIXTURE_STATE.groupOrders[typedGroupId];

    return (
      state.groupPredictionModes[typedGroupId] === "matches" ||
      order.some((teamId, index) => teamId !== defaultOrder[index])
    );
  }).length;
}

function getStepGuide(currentStep: Step) {
  if (currentStep === 1) {
    return {
      kicker: "Ahora",
      title: "Ordená cada grupo antes de seguir",
      description:
        "Abrí un grupo, definí si lo cargás por partidos o manualmente y dejalo cerrado del 1° al 4° puesto.",
      foot:
        "Cuando cerrés los grupos, pasás a elegir los 8 mejores terceros que avanzan.",
    };
  }

  if (currentStep === 2) {
    return {
      kicker: "Seguí",
      title: "Elegí los 8 mejores terceros",
      description:
        "Seleccioná solo ocho. Esos equipos completan los cruces de 16avos y cada acierto suma puntos.",
      foot:
        "No hace falta pensar la llave todavía, primero definí quiénes avanzan.",
    };
  }

  if (currentStep === 3) {
    return {
      kicker: "Definición",
      title: "Completá el cuadro hasta la final",
      description:
        "En cada cruce elegís qué selección avanza. No importa por qué lado llegó, importa hasta qué ronda la bancaste.",
      foot:
        "Cuando cerrés todos los cruces, se habilita el resumen final para revisar y compartir.",
    };
  }

  return {
    kicker: "Revisión final",
    title: "Chequeá tu pronóstico completo",
    description:
      "Repasá campeón, subcampeón y tercer puesto. Desde acá podés exportar la imagen y guardar la versión final.",
    foot: "Si volvés a tocar un resultado, el guardado se reactiva automáticamente.",
  };
}

export function SimpleModeApp({
  client,
  initialFixtureState,
}: SimpleModeAppProps) {
  const [fixtureState, setFixtureState] = useState<FixtureState>(() =>
    normalizeFixtureState(initialFixtureState ?? createInitialFixtureState()),
  );
  const [currentStep, setCurrentStep] = useState<Step>(() => getAutoStep(fixtureState));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [feedback, setFeedback] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [now, setNow] = useState(() => new Date());
  const stateVersionRef = useRef(0);
  const saveRequestRef = useRef(0);
  const locked = isSimpleModeLocked(now);

  useEffect(() => {
    if (locked) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [locked]);

  const remainingKnockout = useMemo(
    () => getRemainingKnockoutMatchesCount(fixtureState),
    [fixtureState],
  );
  const editedGroupsCount = useMemo(
    () => getEditedGroupsCount(fixtureState),
    [fixtureState],
  );
  const completedKnockoutMatches = TOTAL_KNOCKOUT_MATCHES - remainingKnockout;
  const currentStepGuide = useMemo(() => getStepGuide(currentStep), [currentStep]);

  const steps = useMemo(
    () => [
      {
        id: 1 as Step,
        label: "Grupos",
        meta: `${editedGroupsCount}/${TOTAL_GROUPS} listos`,
        disabled: false,
      },
      {
        id: 2 as Step,
        label: "Terceros",
        meta: `${fixtureState.qualifiedThirdPlaces.length}/8 elegidos`,
        disabled: false,
      },
      {
        id: 3 as Step,
        label: "Cuadro",
        meta:
          remainingKnockout === 0
            ? "32/32 cerrados"
            : `${completedKnockoutMatches}/${TOTAL_KNOCKOUT_MATCHES} definidos`,
        disabled: false,
      },
      {
        id: 4 as Step,
        label: "Resumen",
        meta:
          remainingKnockout === 0 && fixtureState.qualifiedThirdPlaces.length === 8
            ? "Listo para revisar"
            : "Se activa al completar",
        disabled:
          remainingKnockout > 0 || fixtureState.qualifiedThirdPlaces.length < 8,
      },
    ],
    [
      completedKnockoutMatches,
      editedGroupsCount,
      fixtureState.qualifiedThirdPlaces.length,
      remainingKnockout,
    ],
  );

  async function saveFixtureState(nextFixtureState = fixtureState) {
    if (locked) {
      setSaveState("error");
      return false;
    }

    const savedVersion = stateVersionRef.current;
    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;
    setSaveState("saving");

    try {
      const response = await fetch(`/c/${client.slug}/api/predictions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fixtureState: nextFixtureState }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (requestId !== saveRequestRef.current) {
        return true;
      }

      if (stateVersionRef.current === savedVersion) {
        setSaveState("saved");
        setLastSavedAt(
          new Intl.DateTimeFormat("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date()),
        );
      } else {
        setSaveState("dirty");
      }

      return true;
    } catch {
      if (requestId === saveRequestRef.current) {
        setSaveState("error");
      }
      return false;
    }
  }

  function handleStepChange(step: number) {
    setCurrentStep(step as Step);
    const prefersInstantScroll = window.matchMedia("(max-width: 759px)").matches;
    window.scrollTo({ top: 0, behavior: prefersInstantScroll ? "auto" : "smooth" });

    if (saveState === "dirty") {
      void saveFixtureState();
    }
  }

  function handleFixtureStateChange(nextState: FixtureState) {
    stateVersionRef.current += 1;
    setFixtureState(nextState);
    setSaveState("dirty");
  }

  const saveLabel =
    saveState === "saving"
      ? "Guardando..."
      : saveState === "saved"
        ? "Guardado"
        : "Guardar fixture";

  const statusLabel = locked
    ? "La predicción ya quedó cerrada. Compite la última versión completa guardada antes del arranque."
    : saveState === "saving"
      ? "Estamos guardando tu predicción."
      : saveState === "saved"
        ? lastSavedAt
          ? `Último guardado a las ${lastSavedAt}.`
          : "Tu fixture ya quedó guardado."
        : saveState === "error"
          ? "No pudimos guardar. Reintentá antes de seguir."
          : saveState === "dirty"
            ? "Hay cambios sin guardar."
            : "Completá los pasos y guardá cuando quieras confirmar avances.";

  return (
    <>
      <FixtureBuilder
        fixtureState={fixtureState}
        onFixtureStateChange={handleFixtureStateChange}
        readOnly={locked}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onFeedback={setFeedback}
        posterBrandLogoUrl={
          client.branding.logoUrl ? `/c/${client.slug}/assets/logo` : null
        }
        posterBrandName={client.shortName}
        beforeBuilder={
          <section className={styles.sectionBlock}>
            <div className={styles.simpleModeIntro}>
              <div className={styles.simpleModeStatus}>
                <span className={styles.sectionEyebrow}>Tu predicción</span>
                <p className={styles.simpleModeSummary}>
                  Completá grupos, mejores terceros y cuadro final. La última versión
                  guardada antes del arranque es la que entra en competencia.
                </p>
                <p className={styles.simpleModeDeadline}>
                  Cierre: {formatSimpleModeCutoffLabel()} · {getSimpleModeCountdownLabel(now)}
                </p>
                <p className={styles.predictionStatus}>{statusLabel}</p>
              </div>

              <button
                type="button"
                className={styles.simpleModeSaveButton}
                onClick={() => void saveFixtureState()}
                disabled={
                  locked ||
                  saveState === "saving" ||
                  saveState === "idle" ||
                  saveState === "saved"
                }
              >
                {saveLabel}
              </button>
            </div>

            <div className={styles.simpleModeBar}>
              <div className={styles.simpleModeGuidance}>
                <span className={styles.simpleModeGuidanceKicker}>
                  {currentStepGuide.kicker}
                </span>
                <strong className={styles.simpleModeGuidanceTitle}>
                  {currentStepGuide.title}
                </strong>
                <p className={styles.simpleModeGuidanceText}>
                  {currentStepGuide.description}
                </p>
                <p className={styles.simpleModeGuidanceFoot}>{currentStepGuide.foot}</p>
              </div>

              <div className={styles.simpleModeMetricGrid}>
                <article className={styles.simpleModeMetricCard}>
                  <strong>Paso {currentStep}</strong>
                  <span>Etapa actual</span>
                </article>
                <article className={styles.simpleModeMetricCard}>
                  <strong>
                    {currentStep === 1
                      ? `${editedGroupsCount}/${TOTAL_GROUPS}`
                      : currentStep === 2
                        ? `${fixtureState.qualifiedThirdPlaces.length}/8`
                        : currentStep === 3
                          ? `${completedKnockoutMatches}/${TOTAL_KNOCKOUT_MATCHES}`
                          : remainingKnockout === 0 &&
                              fixtureState.qualifiedThirdPlaces.length === 8
                            ? "Listo"
                            : "Pendiente"}
                  </strong>
                  <span>
                    {currentStep === 1
                      ? "Grupos revisados"
                      : currentStep === 2
                        ? "Terceros elegidos"
                        : currentStep === 3
                          ? "Cruces definidos"
                          : "Estado del cierre"}
                  </span>
                </article>
              </div>
            </div>

            <nav className={styles.simpleModeSteps} aria-label="Pasos del fixture">
              {steps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  className={`${styles.simpleModeStep} ${
                    currentStep === step.id ? styles.simpleModeStepActive : ""
                  }`}
                  disabled={step.disabled}
                  aria-current={currentStep === step.id ? "step" : undefined}
                  onClick={() => handleStepChange(step.id)}
                >
                  <strong>
                    Paso {step.id}: {step.label}
                  </strong>
                  <span>{step.meta}</span>
                </button>
              ))}
            </nav>
          </section>
        }
      />

      {feedback ? (
        <section className={styles.sectionBlock}>
          <p className={styles.predictionStatus}>{feedback}</p>
        </section>
      ) : null}
    </>
  );
}
