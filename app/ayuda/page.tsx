import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/ayuda-page.module.css";

export const metadata: Metadata = {
  title: "Ayuda — Fixture Mundial 2026",
  description:
    "Preguntas frecuentes sobre el fixture interactivo del Mundial 2026.",
};

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "¿Qué es Fixture Mundial 2026?",
    a: (
      <p>
        Es una aplicación web que te permite armar tu propia predicción del
        Mundial 2026: elegís quién clasifica de cada grupo, quiénes son los
        mejores terceros, y definís el cuadro de eliminación directa hasta el
        campeón.
      </p>
    ),
  },
  {
    q: "¿Tiene relación con FIFA o la organización oficial?",
    a: (
      <p>
        No. Este sitio es un proyecto independiente, sin afiliación oficial con
        FIFA ni con ninguna de las federaciones participantes. Las marcas y
        escudos mencionados pertenecen a sus respectivos dueños.
      </p>
    ),
  },
  {
    q: "¿Cómo funciona la predicción?",
    a: (
      <>
        <p>La predicción se arma en cuatro pasos:</p>
        <p>
          <strong>1. Grupos</strong> — ordenás los equipos de cada grupo según
          cómo creés que terminarán.
        </p>
        <p>
          <strong>2. Terceros</strong> — elegís los 8 mejores terceros que
          avanzan a los 16avos.
        </p>
        <p>
          <strong>3. Cuadro</strong> — completás los enfrentamientos de
          eliminación directa hasta la final.
        </p>
        <p>
          <strong>4. Resumen</strong> — exportás, compartís o guardás tu
          predicción.
        </p>
      </>
    ),
  },
  {
    q: "¿Qué son los 'mejores terceros'?",
    a: (
      <p>
        En el Mundial 2026, con 12 grupos de 4 equipos cada uno, los terceros
        de cada grupo compiten entre sí por los 8 lugares restantes en los
        16avos de final. El app te pide que elijas cuáles 8 de los 12 terceros
        pasan, y los ubica automáticamente en el cuadro.
      </p>
    ),
  },
  {
    q: "¿El cuadro de eliminación directa se completa solo?",
    a: (
      <p>
        Sí, en la medida en que hayas completado los pasos anteriores. Si
        definiste bien los grupos y los terceros, el cuadro ya sabe quién va
        contra quién en los 16avos. A partir de ahí elegís al ganador de cada
        partido para avanzar.
      </p>
    ),
  },
  {
    q: "¿Se guarda mi predicción automáticamente?",
    a: (
      <p>
        Sí. Cada cambio se guarda automáticamente en el almacenamiento local de
        tu navegador. No necesitás crear una cuenta. Si cerrás el navegador y
        volvés desde el mismo dispositivo, tu predicción estará tal cual la
        dejaste.
      </p>
    ),
  },
  {
    q: "¿Puedo editar mi predicción después de guardarla?",
    a: (
      <p>
        Sí, podés volver a cualquier paso en cualquier momento y modificar lo
        que quieras. Los cambios se guardan automáticamente.
      </p>
    ),
  },
  {
    q: "¿Cómo comparto mi predicción?",
    a: (
      <p>
        En el paso Resumen encontrás la opción de copiar un link. Ese link
        codifica tu predicción completa y cualquier persona que lo abra verá tu
        fixture en modo lectura, sin poder modificarlo.
      </p>
    ),
  },
  {
    q: "¿Puedo exportar el fixture como imagen?",
    a: (
      <p>
        Sí. En el paso Resumen hay un botón para exportar tu predicción como
        imagen. Si el navegador no soporta la exportación automática, aparecerá
        un mensaje sugiriéndote hacer una captura de pantalla.
      </p>
    ),
  },
  {
    q: "¿En qué dispositivos funciona?",
    a: (
      <p>
        En cualquier navegador moderno, tanto en desktop como en mobile. Está
        optimizado para pantallas desde 320px en adelante. No requiere instalar
        nada.
      </p>
    ),
  },
  {
    q: "¿Puedo usar la app sin conexión a internet?",
    a: (
      <p>
        La app necesita conexión para cargarse por primera vez. Una vez abierta,
        funciona sin problemas aunque la conexión sea intermitente, ya que toda
        la predicción se guarda localmente en tu dispositivo.
      </p>
    ),
  },
];

export default function AyudaPage() {
  return (
    <main className={styles.shell}>
      <header className={styles.pageHeader}>
        <Link href="/" className={styles.backLink}>
          ← Inicio
        </Link>
        <span className={styles.eyebrow}>Ayuda</span>
        <h1 className={styles.pageTitle}>Preguntas frecuentes</h1>
        <p className={styles.pageSubtitle}>
          Todo lo que necesitás saber para armar y compartir tu predicción.
        </p>
      </header>

      <aside className={styles.disclaimer} role="note">
        <span className={styles.disclaimerEyebrow}>Aviso</span>
        <p className={styles.disclaimerBody}>
          Este sitio es un proyecto independiente, sin afiliación oficial con
          FIFA ni con ninguna federación. No es un producto oficial del
          Mundial 2026.
        </p>
      </aside>

      <section className={styles.faqSection}>
        <div className={styles.faqHead}>
          <span className={styles.faqEyebrow}>FAQ</span>
          <h2 className={styles.faqHeadTitle}>{faqs.length} respuestas rápidas</h2>
        </div>
        <ul className={styles.faqList}>
          {faqs.map(({ q, a }) => (
            <li key={q} className={styles.faqItem}>
              <details>
                <summary>{q}</summary>
                <div className={styles.faqBody}>{a}</div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.footerCta} aria-label="Continuar">
        <span className={styles.footerCtaEyebrow}>Listo para empezar</span>
        <h2 className={styles.footerCtaTitle}>Armá tu fixture en pocos minutos</h2>
        <div className={styles.footerCtaActions}>
          <Link href="/mi-prediccion" className={styles.footerCtaPrimary}>
            Armar mi predicción
          </Link>
          <Link href="/calendario" className={styles.footerCtaSecondary}>
            Ver calendario
          </Link>
        </div>
      </section>
    </main>
  );
}
