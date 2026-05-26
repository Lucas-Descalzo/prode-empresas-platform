"use client";

import { useEffect, useMemo, useState } from "react";

import { FixtureBuilder } from "@/components/fixture-builder";
import type { CompanyRecord } from "@/lib/corporate/types";
import { getRemainingKnockoutMatchesCount } from "@/lib/group-utils";
import { createInitialFixtureState } from "@/lib/world-cup-fixture";
import type { FixtureState } from "@/lib/world-cup-types";
import styles from "./corporate-shell.module.css";

interface SimpleModeAppProps {
  client: CompanyRecord;
  initialFixtureState: FixtureState | null;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type Step = 1 | 2 | 3 | 4;

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

export function SimpleModeApp({
  client,
  initialFixtureState,
}: SimpleModeAppProps) {
  const initialState = initialFixtureState ?? createInitialFixtureState();
  const [fixtureState, setFixtureState] = useState<FixtureState>(initialState);
  const [currentStep, setCurrentStep] = useState<Step>(getAutoStep(initialState));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [feedback, setFeedback] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState("");

  useEffect(() => {
    const nextState = initialFixtureState ?? createInitialFixtureState();
    setFixtureState(nextState);
    setCurrentStep(getAutoStep(nextState));
    setSaveState("idle");
    setLastSavedAt("");
  }, [initialFixtureState]);

  const remainingKnockout = useMemo(
    () => getRemainingKnockoutMatchesCount(fixtureState),
    [fixtureState],
  );

  const steps = useMemo(
    () => [
      {
        id: 1 as Step,
        label: "Grupos",
        meta: `${Object.keys(fixtureState.groupPredictionModes).length} con partidos`,
        disabled: false,
      },
      {
        id: 2 as Step,
        label: "Terceros",
        meta: `${fixtureState.qualifiedThirdPlaces.length}/8`,
        disabled: false,
      },
      {
        id: 3 as Step,
        label: "Cuadro",
        meta: remainingKnockout === 0 ? "Completo" : `${remainingKnockout} pendientes`,
        disabled: false,
      },
      {
        id: 4 as Step,
        label: "Resumen",
        meta:
          remainingKnockout === 0 && fixtureState.qualifiedThirdPlaces.length === 8
            ? "Listo"
            : "Pendiente",
        disabled:
          remainingKnockout > 0 || fixtureState.qualifiedThirdPlaces.length < 8,
      },
    ],
    [
      fixtureState.groupPredictionModes,
      fixtureState.qualifiedThirdPlaces.length,
      remainingKnockout,
    ],
  );

  async function saveFixtureState(nextFixtureState = fixtureState) {
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

      setSaveState("saved");
      setLastSavedAt(
        new Intl.DateTimeFormat("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
      );

      return true;
    } catch {
      setSaveState("error");
      return false;
    }
  }

  async function handleStepChange(step: number) {
    if (saveState === "dirty") {
      const saved = await saveFixtureState();

      if (!saved) {
        return;
      }
    }

    setCurrentStep(step as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFixtureStateChange(nextState: FixtureState) {
    setFixtureState(nextState);
    setSaveState("dirty");
  }

  const saveLabel =
    saveState === "saving"
      ? "Guardando..."
      : saveState === "saved"
        ? "Guardado"
        : "Guardar fixture";

  const statusLabel =
    saveState === "saving"
      ? "Estamos guardando tu prediccion."
      : saveState === "saved"
        ? lastSavedAt
          ? `Ultimo guardado a las ${lastSavedAt}.`
          : "Tu fixture ya quedo guardado."
        : saveState === "error"
          ? "No pudimos guardar. Reintenta antes de seguir."
          : saveState === "dirty"
            ? "Hay cambios sin guardar."
            : "Completa los pasos y guarda cuando quieras confirmar avances.";

  return (
    <>
      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Modo simple</span>
            <h2 className={styles.sectionTitle}>Prediccion completa pre-Mundial</h2>
          </div>
          <p className={styles.sectionHint}>
            Cada participante completa su fixture una sola vez antes del arranque del
            torneo. Despues, la liga muestra el ranking interno cuando cargues
            resultados oficiales.
          </p>
        </div>
      </section>

      <FixtureBuilder
        fixtureState={fixtureState}
        onFixtureStateChange={handleFixtureStateChange}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onFeedback={setFeedback}
        beforeBuilder={
          <section className={styles.sectionBlock}>
            <div className={styles.simpleModeBar}>
              <div className={styles.simpleModeStatus}>
                <span className={styles.sectionEyebrow}>Estado del fixture</span>
                <p className={styles.predictionStatus}>{statusLabel}</p>
              </div>

              <button
                type="button"
                className={styles.simpleModeSaveButton}
                onClick={() => void saveFixtureState()}
                disabled={saveState === "saving" || saveState === "idle" || saveState === "saved"}
              >
                {saveLabel}
              </button>
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
                  onClick={() => void handleStepChange(step.id)}
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
