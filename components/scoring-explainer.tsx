import styles from "./group-page.module.css";

interface ScoringExplainerProps {
  compact?: boolean;
  enabled?: boolean;
}

export function ScoringExplainer({ compact = false, enabled = true }: ScoringExplainerProps) {
  return (
    <details className={compact ? styles.scoringExplainerCompact : styles.scoringExplainer}>
      <summary>
        <span className={styles.scoringQuestionMark} aria-hidden>
          ?
        </span>
        <span>
          {enabled
            ? "Como funciona el sistema de puntos"
            : "Sistema de puntos no activo en este grupo"}
        </span>
      </summary>

      <div className={styles.scoringExplainerBody}>
        {!enabled ? (
          <div className={styles.scoringExplainerNotice}>
            Este grupo guarda fixtures, pero no muestra ranking por puntos. Lucas puede
            activarlo desde el panel admin si quieren competir con esta regla.
          </div>
        ) : null}

        <div>
          <strong>Pre-Mundial: grupos y mejores terceros</strong>
          <p>
            Cada equipo en su posicion exacta del grupo suma +2. Si acertaste el
            top-2 pero invertiste el 1.o y 2.o, recibis +1 por cada uno. Ademas,
            cada mejor tercero que efectivamente avanza suma +2.
          </p>
        </div>

        <div>
          <strong>Eliminatoria por ronda alcanzada</strong>
          <p>
            Se compara hasta que ronda bancaste a cada equipo, sin importar la
            llave exacta: octavos +2, cuartos +4, semifinales +6 y final +8.
          </p>
        </div>

        <div>
          <strong>Definiciones</strong>
          <p>
            Campeon +10 y ganador del tercer puesto +2. El ranking se actualiza
            cuando se cargan resultados reales desde el admin.
          </p>
        </div>
      </div>
    </details>
  );
}
