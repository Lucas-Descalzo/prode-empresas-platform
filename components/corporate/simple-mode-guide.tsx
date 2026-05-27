import type { CompanyRecord } from "@/lib/corporate/types";
import {
  formatSimpleModeCutoffLabel,
  SIMPLE_MODE_FAQS,
  SIMPLE_MODE_KNOCKOUT_MAX_POINTS,
  SIMPLE_MODE_POINT_BLOCKS,
  SIMPLE_MODE_PRE_WORLD_CUP_MAX_POINTS,
  SIMPLE_MODE_TOTAL_MAX_POINTS,
} from "@/lib/simple-mode-rules";
import styles from "./corporate-shell.module.css";

export function SimpleModeGuide({ client }: { client: CompanyRecord }) {
  return (
    <section className={styles.sectionBlock}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Como se juega</span>
          <h2 className={styles.sectionTitle}>Sistema de puntos y reglas claras</h2>
        </div>
        <p className={styles.sectionHint}>
          Cierre de carga: {formatSimpleModeCutoffLabel()}. La ultima version completa
          guardada antes de ese momento es la que compite.
        </p>
      </div>

      <div className={styles.simpleModeMetricGrid}>
        <article className={styles.simpleModeMetricCard}>
          <strong>{SIMPLE_MODE_PRE_WORLD_CUP_MAX_POINTS} pts</strong>
          <span>Pre-Mundial</span>
        </article>
        <article className={styles.simpleModeMetricCard}>
          <strong>{SIMPLE_MODE_KNOCKOUT_MAX_POINTS} pts</strong>
          <span>Eliminatoria</span>
        </article>
        <article className={styles.simpleModeMetricCard}>
          <strong>{SIMPLE_MODE_TOTAL_MAX_POINTS} pts</strong>
          <span>Maximo total</span>
        </article>
      </div>

      <div className={styles.simpleModeGuideGrid}>
        {SIMPLE_MODE_POINT_BLOCKS.map((block) => (
          <article key={block.title} className={styles.simpleModeGuideCard}>
            <div className={styles.simpleModeGuideHead}>
              <span className={styles.simpleModeGuideKicker}>{block.title}</span>
              <strong>{block.maxPoints} pts max.</strong>
            </div>

            <div className={styles.simpleModeGuideRows}>
              {block.rows.map((row) => (
                <div key={`${block.title}-${row.label}`} className={styles.simpleModeGuideRow}>
                  <div>
                    <p>{row.label}</p>
                    {row.note ? (
                      <span className={styles.simpleModeGuideNote}>{row.note}</span>
                    ) : null}
                  </div>
                  <b>{row.points}</b>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className={styles.simpleModeRuleCallout}>
        <strong>Dos reglas que vale la pena tener presentes</strong>
        <p>
          Importa hasta que ronda bancaste a cada equipo, no por que lado del cuadro
          llego. Si lo pusiste en semifinales y termina en semifinales, cobras esos
          escalones aunque haya llegado por otra llave.
        </p>
        <p>
          En {client.shortName}, si dos personas empatan al final, desempata quien
          tenga mas puntos del pre-Mundial. Si siguen empatadas, comparten posicion.
        </p>
      </div>

      <div className={styles.simpleModeFaqGrid}>
        {SIMPLE_MODE_FAQS.map((item) => (
          <details key={item.question} className={styles.simpleModeFaqItem}>
            <summary>{item.question}</summary>
            <div className={styles.simpleModeFaqBody}>
              {item.answer.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
