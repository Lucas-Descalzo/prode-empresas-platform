import Link from "next/link";

import styles from "./page.module.css";

const PLAN_FEATURES = [
  {
    title: "Plan Simple",
    copy:
      "Carga única antes del Mundial, ranking interno y una operación liviana para activaciones masivas.",
  },
  {
    title: "Plan Interactivo",
    copy:
      "Fase inicial más seguimiento partido a partido en eliminatorias, ideal para campañas que quieren sostener engagement.",
  },
  {
    title: "Operación Centralizada",
    copy:
      "Ustedes cargan branding, importan participantes, resetean claves y administran resultados desde un solo panel.",
  },
];

const FLOW_STEPS = [
  "Creás una empresa, elegís slug, colores y modo de juego.",
  "Importás nombre, apellido, email y área desde un listado.",
  "La empresa entra por su subdominio y cada participante usa su acceso temporal.",
  "El ranking y los resultados oficiales quedan aislados por empresa.",
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Prode Empresas</span>
          <h1>Una plataforma madre para activar el Mundial dentro de cada empresa.</h1>
          <p>
            Esta tercera app ya nace pensada para B2B: multiempresa, branding por
            cliente, accesos invitados, ranking interno y base lista para crecer con
            subdominios.
          </p>

          <div className={styles.actions}>
            <Link href="/admin" className={styles.primaryAction}>
              Abrir panel operador
            </Link>
            <a
              href="https://prode-empresas.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className={styles.secondaryAction}
            >
              Ver demo comercial
            </a>
          </div>
        </div>

        <aside className={styles.heroPanel}>
          <p className={styles.panelLabel}>Base ya contemplada</p>
          <ul className={styles.panelList}>
            <li>Subdominios por empresa sobre un único deployment</li>
            <li>Login por email + contraseña temporal + cambio obligatorio</li>
            <li>Panel operador para altas, importación y soporte</li>
            <li>Game mode simple o interactivo por cliente</li>
          </ul>
        </aside>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Planes</span>
          <h2>La diferencia comercial queda centrada en la experiencia de juego.</h2>
        </div>

        <div className={styles.cardGrid}>
          {PLAN_FEATURES.map((feature) => (
            <article key={feature.title} className={styles.card}>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Cómo opera</span>
          <h2>El flujo inicial está pensado para vender y ejecutar sin fricción.</h2>
        </div>

        <ol className={styles.stepList}>
          {FLOW_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
