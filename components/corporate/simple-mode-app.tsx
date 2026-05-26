"use client";

import { useEffect, useRef, useState } from "react";

import { FixtureBuilder } from "@/components/fixture-builder";
import { createInitialFixtureState } from "@/lib/world-cup-fixture";
import type { CompanyRecord } from "@/lib/corporate/types";
import type { FixtureState } from "@/lib/world-cup-types";
import styles from "./corporate-shell.module.css";

interface SimpleModeAppProps {
  client: CompanyRecord;
  initialFixtureState: FixtureState | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function SimpleModeApp({
  client,
  initialFixtureState,
}: SimpleModeAppProps) {
  const [fixtureState, setFixtureState] = useState<FixtureState>(
    initialFixtureState ?? createInitialFixtureState(),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [feedback, setFeedback] = useState("");
  const didMountRef = useRef(false);

  useEffect(() => {
    setFixtureState(initialFixtureState ?? createInitialFixtureState());
  }, [initialFixtureState]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setSaveState("saving");

      try {
        const response = await fetch(`/c/${client.slug}/api/predictions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fixtureState }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        setSaveState("saved");
        window.setTimeout(() => {
          setSaveState((current) => (current === "saved" ? "idle" : current));
        }, 1800);
      } catch {
        setSaveState("error");
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [client.slug, fixtureState]);

  return (
    <>
      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Modo simple</span>
            <h2 className={styles.sectionTitle}>Predicción completa pre-Mundial</h2>
          </div>
          <p className={styles.sectionHint}>
            Cada participante completa su fixture una sola vez antes del arranque del
            torneo. Después, la liga mostrará el ranking interno cuando cargues
            resultados oficiales.
          </p>
        </div>

        <p className={styles.predictionStatus}>
          {saveState === "saving"
            ? "Guardando cambios..."
            : saveState === "saved"
              ? "Cambios guardados ✓"
              : saveState === "error"
                ? "No pude guardar automáticamente."
                : "Tu fixture se guarda a medida que avanzás."}
        </p>
      </section>

      <FixtureBuilder
        fixtureState={fixtureState}
        onFixtureStateChange={setFixtureState}
        onFeedback={setFeedback}
      />

      {feedback ? (
        <section className={styles.sectionBlock}>
          <p className={styles.predictionStatus}>{feedback}</p>
        </section>
      ) : null}
    </>
  );
}
