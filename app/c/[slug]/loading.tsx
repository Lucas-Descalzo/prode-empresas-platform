import styles from "@/components/corporate/corporate-shell.module.css";

export default function CorporateLoading() {
  return (
    <section className={`${styles.sectionBlock} ${styles.routeLoading}`} aria-live="polite">
      <span className={styles.sectionEyebrow}>Cargando</span>
      <span className={`${styles.routeLoadingBar} ${styles.routeLoadingBarShort}`} />
      <span className={styles.routeLoadingBar} />
    </section>
  );
}
