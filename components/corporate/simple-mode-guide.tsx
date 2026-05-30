import type { CompanyRecord } from "@/lib/corporate/types";
import {
  formatSimpleModeCutoffLabel,
  getSimpleModeFaqs,
  SIMPLE_MODE_POINT_BLOCKS,
} from "@/lib/simple-mode-rules";
import { SimpleModeFaq } from "./simple-mode-faq";
import styles from "./corporate-shell.module.css";

export function SimpleModeGuide({ client }: { client: CompanyRecord }) {
  return (
    <section className={styles.sectionBlock}>
      <div>
        <span className={styles.sectionEyebrow}>Sistema de puntos</span>
        <h2 className={styles.sectionTitle}>Como se gana el ranking</h2>
        <p className={styles.simpleModeDeadline}>
          Cierre de carga: {formatSimpleModeCutoffLabel()}
        </p>
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
        <strong>Reglas importantes</strong>
        <p>
          Importa hasta qué ronda bancaste a cada equipo, no por qué lado del cuadro
          llegó. En {client.shortName}, si dos personas empatan al final, primero
          desempata quien tenga más puntos del pre-Mundial.
        </p>
      </div>

      <SimpleModeFaq faqs={getSimpleModeFaqs(client.slug)} />
    </section>
  );
}
