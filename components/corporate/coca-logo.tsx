import styles from "./corporate-shell.module.css";

interface CocaLogoProps {
  variant?: "full" | "compact";
}

export function CocaLogo({ variant = "full" }: CocaLogoProps) {
  if (variant === "compact") {
    return (
      <span className={styles.cocaLogo} aria-label="Coca-Cola">
        <span className={styles.cocaWordmark}>Coca-Cola</span>
      </span>
    );
  }

  return (
    <span className={styles.cocaLogo} aria-label="Coca-Cola">
      <span className={styles.cocaWordmark}>Coca-Cola</span>
      <svg
        className={styles.cocaWave}
        viewBox="0 0 120 14"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 9 C 14 -1, 28 1, 40 7 C 52 12, 64 12, 78 7 C 90 3, 104 3, 117 9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="3" cy="9" r="1.4" fill="currentColor" />
        <circle cx="117" cy="9" r="1.4" fill="currentColor" />
      </svg>
    </span>
  );
}
