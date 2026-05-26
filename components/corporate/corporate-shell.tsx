import type { ReactNode } from "react";

import type { CorporateClient } from "@/lib/corporate/types";
import { CorporateHeader } from "./corporate-header";
import styles from "./corporate-shell.module.css";

interface CorporateShellProps {
  client: CorporateClient;
  children: ReactNode;
  participantName?: string;
}

function normalizeHex(hex: string) {
  const safe = hex.trim().replace("#", "");
  return /^[0-9a-fA-F]{6}$/.test(safe) ? safe : null;
}

function isDarkHex(hex: string) {
  const safe = normalizeHex(hex);

  if (!safe) {
    return false;
  }

  const red = Number.parseInt(safe.slice(0, 2), 16);
  const green = Number.parseInt(safe.slice(2, 4), 16);
  const blue = Number.parseInt(safe.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance < 0.45;
}

function withAlpha(hex: string, alpha: number) {
  const safe = normalizeHex(hex);

  if (!safe) {
    return `rgba(255, 255, 255, ${alpha})`;
  }

  const red = Number.parseInt(safe.slice(0, 2), 16);
  const green = Number.parseInt(safe.slice(2, 4), 16);
  const blue = Number.parseInt(safe.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function CorporateShell({
  client,
  children,
  participantName,
}: CorporateShellProps) {
  const darkBackground = isDarkHex(client.branding.background);
  const brandPrimary = client.branding.primary;
  const brandPrimaryHover = client.branding.primaryHover;
  const brandBackground = client.branding.background;
  const brandText = client.branding.foreground;
  const brandTextMuted = client.branding.muted;
  const brandBorder = darkBackground
    ? "rgba(255,255,255,0.12)"
    : client.branding.line;
  const brandSurface = darkBackground ? "#101113" : "#ffffff";
  const brandSurface2 = darkBackground ? "#18191C" : "#f3ede0";
  const stateSuccess = darkBackground ? "#45D6B0" : "#1A8359";
  const stateDanger = darkBackground ? "#FF7A7A" : "#B42318";

  const cssVars = {
    "--brand-bg": brandBackground,
    "--brand-surface": brandSurface,
    "--brand-surface-2": brandSurface2,
    "--brand-border": brandBorder,
    "--brand-border-strong": darkBackground
      ? "rgba(255,255,255,0.18)"
      : "rgba(26, 20, 16, 0.16)",
    "--brand-primary": brandPrimary,
    "--brand-primary-hover": brandPrimaryHover,
    "--brand-primary-muted": withAlpha(brandPrimary, 0.14),
    "--brand-primary-border": withAlpha(brandPrimary, 0.35),
    "--brand-text": brandText,
    "--brand-text-muted": brandTextMuted,
    "--brand-text-soft": darkBackground
      ? "rgba(255,255,255,0.45)"
      : "rgba(26, 20, 16, 0.45)",
    "--brand-on-primary": client.branding.contrastOnPrimary,
    "--brand-label": withAlpha(brandPrimary, darkBackground ? 0.82 : 0.74),
    "--brand-shadow": darkBackground
      ? "0 14px 40px rgba(0, 0, 0, 0.34)"
      : "0 10px 28px rgba(0, 0, 0, 0.12)",
    "--brand-shadow-soft": darkBackground
      ? "0 10px 28px rgba(0, 0, 0, 0.22)"
      : "0 6px 18px rgba(0, 0, 0, 0.08)",
    "--brand-focus-ring": withAlpha(brandPrimary, 0.36),
    "--state-success": stateSuccess,
    "--state-success-bg": withAlpha(stateSuccess, 0.12),
    "--state-success-border": withAlpha(stateSuccess, 0.35),
    "--state-warning": brandPrimary,
    "--state-warning-bg": withAlpha(brandPrimary, 0.12),
    "--state-warning-border": withAlpha(brandPrimary, 0.35),
    "--state-danger": stateDanger,
    "--state-danger-bg": withAlpha(stateDanger, 0.12),
    "--state-danger-border": withAlpha(stateDanger, 0.28),
    "--state-disabled": darkBackground
      ? "rgba(255,255,255,0.28)"
      : "rgba(26, 20, 16, 0.28)",
    "--cta-from": brandPrimary,
    "--cta-to": brandPrimaryHover,
    "--line": brandBorder,
    "--foreground": brandText,
    "--muted": brandTextMuted,
    "--client-primary": brandPrimary,
    "--client-primary-hover": brandPrimaryHover,
    "--client-on-primary": client.branding.contrastOnPrimary,
    "--client-glow": withAlpha(brandPrimary, 0.24),
    "--client-eyebrow": brandPrimary,
    "--client-bg": brandBackground,
    "--client-bg-strong": brandBackground,
    "--client-fg": brandText,
    "--client-fg-soft": brandText,
    "--client-muted": brandTextMuted,
    "--client-muted-strong": brandTextMuted,
    "--client-line": brandBorder,
    "--client-line-strong": darkBackground
      ? "rgba(255,255,255,0.18)"
      : "rgba(26, 20, 16, 0.16)",
    "--client-card-bg": brandSurface,
    "--client-card-soft": brandSurface2,
    "--client-card-shadow": darkBackground
      ? "0 10px 30px rgba(0, 0, 0, 0.26)"
      : "0 6px 18px rgba(0, 0, 0, 0.08)",
    "--client-card-shadow-strong": darkBackground
      ? "0 14px 36px rgba(0, 0, 0, 0.34)"
      : "0 12px 32px rgba(0, 0, 0, 0.14)",
    "--client-header-bg": darkBackground
      ? "rgba(5, 5, 5, 0.94)"
      : "rgba(255, 250, 240, 0.92)",
    "--client-header-soft": darkBackground ? brandSurface2 : "rgba(255,255,255,0.78)",
    "--client-hover-soft": darkBackground
      ? "rgba(255,255,255,0.06)"
      : "rgba(244, 0, 9, 0.06)",
  } as React.CSSProperties;

  return (
    <div className={styles.shell} style={cssVars}>
      <CorporateHeader client={client} participantName={participantName} />
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <span>{client.displayName} · Predicciones internas</span>
        <span>Uso interno · plataforma operada por PRODE Empresas</span>
      </footer>
    </div>
  );
}
