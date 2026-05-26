"use client";

import Image from "next/image";
import Link from "next/link";
import { ViewTransition, startTransition, useEffect, useRef, useState } from "react";

import { knockoutMatchOrder } from "@/data/world-cup-2026";
import { getRemainingKnockoutMatchesCount } from "@/lib/group-utils";
import { sanitizeInternalReturnTo } from "@/lib/navigation-utils";
import { createInitialFixtureState } from "@/lib/world-cup-fixture";
import {
  clearPersistedFixtureState,
  loadFixtureStateFromBrowser,
  persistFixtureState,
} from "@/lib/world-cup-state";
import type { FixtureState } from "@/lib/world-cup-types";

import { FixtureBuilder } from "./fixture-builder";
import styles from "./world-cup-app.module.css";

type LoadSource = "empty" | "storage" | "url";
export type Step = 1 | 2 | 3 | 4;

function getAutoStep(state: FixtureState, source: LoadSource): Step {
  if (source === "empty") return 1;
  const remaining = getRemainingKnockoutMatchesCount(state);
  const thirdsDone = state.qualifiedThirdPlaces.length === 8;
  if (remaining === 0 && thirdsDone) return 4;
  if (thirdsDone) return 3;
  if (state.qualifiedThirdPlaces.length > 0) return 2;
  return 1;
}

function getFixtureProgress(fixtureState: FixtureState) {
  const thirdAssignmentCount = Object.keys(fixtureState.thirdPlaceAssignments).length;
  const allThirdSlotsReady =
    fixtureState.qualifiedThirdPlaces.length === 8 && thirdAssignmentCount === 8;
  const remainingKnockout = getRemainingKnockoutMatchesCount(fixtureState);
  const completedKnockout = knockoutMatchOrder.length - remainingKnockout;
  const thirdsWeight = Math.min(fixtureState.qualifiedThirdPlaces.length / 8, 1) * 20;
  const bracketWeight = (completedKnockout / knockoutMatchOrder.length) * 45;
  const summaryWeight = remainingKnockout === 0 && allThirdSlotsReady ? 10 : 0;

  return {
    isComplete: remainingKnockout === 0 && allThirdSlotsReady,
    percent: Math.round(25 + thirdsWeight + bracketWeight + summaryWeight),
    remainingKnockout,
    steps: [
      { id: 1 as Step, label: "Grupos", meta: "Listo", done: true, disabled: false },
      {
        id: 2 as Step,
        label: "Terceros",
        meta: `${fixtureState.qualifiedThirdPlaces.length}/8`,
        done: fixtureState.qualifiedThirdPlaces.length === 8,
        disabled: false,
      },
      {
        id: 3 as Step,
        label: "Cuadro",
        meta: remainingKnockout === 0 ? "Listo" : `${remainingKnockout} pend.`,
        done: remainingKnockout === 0 && allThirdSlotsReady,
        disabled: false,
      },
      {
        id: 4 as Step,
        label: "Resumen",
        meta: remainingKnockout === 0 && allThirdSlotsReady ? "Listo" : "Pend.",
        done: remainingKnockout === 0 && allThirdSlotsReady,
        disabled: remainingKnockout > 0 || !allThirdSlotsReady,
      },
    ],
  };
}

function getStepStatus(step: Step, fixtureState: FixtureState, remainingKnockout: number) {
  switch (step) {
    case 1: {
      const matchModeGroups = Object.values(fixtureState.groupPredictionModes).filter(
        (mode) => mode === "matches",
      ).length;

      return {
        label: "Paso actual: Grupos",
        detail:
          matchModeGroups > 0
            ? `${matchModeGroups} grupos usando predicción por partidos`
            : "Abrí un grupo para ordenar o predecir partidos",
      };
    }
    case 2:
      return {
        label: "Paso actual: Terceros",
        detail: `${fixtureState.qualifiedThirdPlaces.length}/8 terceros seleccionados`,
      };
    case 3:
      return {
        label: "Paso actual: Cuadro",
        detail:
          remainingKnockout > 0
            ? `${remainingKnockout} cruces pendientes por definir`
            : "Cuadro completo",
      };
    case 4:
      return {
        label: "Paso actual: Resumen",
        detail: "Revisá, compartí o exportá tu predicción",
      };
  }
}

function getNextIncompleteStep(fixtureState: FixtureState, remainingKnockout: number): Step {
  if (fixtureState.qualifiedThirdPlaces.length < 8) {
    return 2;
  }

  if (remainingKnockout > 0) {
    return 3;
  }

  return 4;
}

export function WorldCupApp() {
  const [fixtureState, setFixtureState] = useState<FixtureState>(createInitialFixtureState());
  const [loadSource, setLoadSource] = useState<LoadSource>("empty");
  const [hydrated, setHydrated] = useState(false);
  const [returnTo, setReturnTo] = useState("");
  const [shareFeedback, setShareFeedback] = useState("");
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const stepContentRef = useRef<HTMLDivElement | null>(null);
  const progress = getFixtureProgress(fixtureState);
  const stepStatus = getStepStatus(currentStep, fixtureState, progress.remainingKnockout);
  const nextIncompleteStep = getNextIncompleteStep(
    fixtureState,
    progress.remainingKnockout,
  );

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const initialUrl = new URL(window.location.href);
      const safeReturnTo = sanitizeInternalReturnTo(initialUrl.searchParams.get("returnTo"));
      const loaded = loadFixtureStateFromBrowser();

      if (!safeReturnTo && initialUrl.searchParams.has("returnTo")) {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("returnTo");
        window.history.replaceState({}, "", currentUrl);
      }

      setReturnTo(safeReturnTo);
      setFixtureState(loaded.state);
      setLoadSource(loaded.source);
      setCurrentStep(getAutoStep(loaded.state, loaded.source));
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistFixtureState(fixtureState);
  }, [fixtureState, hydrated]);

  useEffect(() => {
    if (!shareFeedback) return;
    const timeoutId = window.setTimeout(() => setShareFeedback(""), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [shareFeedback]);

  const goToStep = (step: number) => {
    startTransition(() => {
      setCurrentStep(step as Step);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyShareUrl = async () => {
    const persistedUrl = new URL(persistFixtureState(fixtureState));
    persistedUrl.searchParams.delete("returnTo");

    try {
      await navigator.clipboard.writeText(persistedUrl.toString());
      setShareFeedback("Link copiado al portapapeles.");
    } catch {
      setShareFeedback("No pude copiar el link automáticamente.");
    }
  };

  const resetFixture = () => {
    clearPersistedFixtureState();
    startTransition(() => {
      setFixtureState(createInitialFixtureState());
      setLoadSource("empty");
      goToStep(1);
      setShareFeedback("Predicción reiniciada.");
    });
  };

  const announceFeedback = (message: string) => {
    setShareFeedback(message);
  };

  const persistBeforeLeaving = () => {
    persistFixtureState(fixtureState);
  };

  return (
    <div id="top" className={`${styles.pageShell} ${styles.predictionShell}`}>
      <header className={styles.unifiedHeader} style={{ viewTransitionName: "site-header" }}>
        <div className={styles.headerTopRow}>
          <Link href="/" className={styles.headerBrand}>
            <Image
              src="/official/wc26-logo.png"
              alt="World Cup 26"
              width={38}
              height={58}
              className={styles.headerBrandLogo}
            />
            <div>
              <strong>Mi predicción</strong>
              <span>Mundial 2026</span>
            </div>
          </Link>

          <div className={styles.headerProgressMeta}>
            <strong className={styles.progressPercent}>{progress.percent}%</strong>
            <span className={styles.progressInfo}>{stepStatus.detail}</span>
          </div>

          {hydrated ? (
            <span className={styles.headerAutoSave}>● Guardado automáticamente</span>
          ) : null}
        </div>

        <div className={styles.progressTrack}>
          <span style={{ inlineSize: `${progress.percent}%` }} />
        </div>

        <nav className={styles.progressSteps} aria-label="Pasos de Mi predicción">
          {progress.steps.map((step) => (
            <button
              key={step.id}
              type="button"
              className={`${styles.progressStep} ${
                step.done && currentStep !== step.id ? styles.stepDone : ""
              } ${currentStep === step.id ? styles.stepActive : ""}`}
              disabled={step.disabled}
              aria-current={currentStep === step.id ? "step" : undefined}
              onClick={() => goToStep(step.id)}
            >
              <span className={styles.stepCheck}>{step.done ? "✓" : step.id}</span>
              <span className={styles.stepLabel}>{step.label}</span>
              <small>{step.meta}</small>
            </button>
          ))}
        </nav>

        {(loadSource === "url" || (loadSource === "storage" && currentStep === 1) || returnTo || shareFeedback) ? (
          <div className={styles.statusRow}>
            {loadSource === "url" ? (
              <p className={styles.statusPill}>Abriste una predicción compartida.</p>
            ) : null}
            {loadSource === "storage" && currentStep === 1 ? (
              <p className={styles.statusPill}>Recuperamos tu última predicción guardada.</p>
            ) : null}
            {returnTo ? (
              <p className={styles.statusPill}>Cuando termines, podés volver a la liga.</p>
            ) : null}
            {shareFeedback ? <p className={styles.statusPill}>{shareFeedback}</p> : null}
          </div>
        ) : null}
      </header>

      <ViewTransition key={currentStep} enter="step-enter" exit="step-exit" default="none">
      <div ref={stepContentRef} className={styles.stepContent}>
        <FixtureBuilder
          fixtureState={fixtureState}
          onFixtureStateChange={setFixtureState}
          currentStep={currentStep}
          onStepChange={goToStep}
          onResetAll={resetFixture}
          onFeedback={announceFeedback}
          summaryActions={
            <div className={styles.summaryActionGrid}>
              {!progress.isComplete ? (
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={() => goToStep(nextIncompleteStep)}
                >
                  Continuar mi predicción
                </button>
              ) : (
                <>
                  {returnTo ? (
                    <Link
                      href={returnTo}
                      className={styles.primaryAction}
                      onClick={persistBeforeLeaving}
                    >
                      Volver a la liga
                    </Link>
                  ) : null}
                  <button type="button" className={styles.secondaryAction} onClick={copyShareUrl}>
                    Copiar link
                  </button>
                  <Link
                    href="/ligas/general"
                    className={styles.secondaryAction}
                    onClick={persistBeforeLeaving}
                  >
                    Participar en Liga general
                  </Link>
                  <Link
                    href="/ligas/crear"
                    className={styles.secondaryAction}
                    onClick={persistBeforeLeaving}
                  >
                    Crear Liga de amigos
                  </Link>
                </>
              )}
            </div>
          }
        />
      </div>
      </ViewTransition>
    </div>
  );
}
