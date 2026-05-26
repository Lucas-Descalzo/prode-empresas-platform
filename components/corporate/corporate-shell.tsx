import type { ReactNode } from "react";

import type { CorporateClient } from "@/lib/corporate/types";
import { CorporateHeader } from "./corporate-header";
import styles from "./corporate-shell.module.css";

interface CorporateShellProps {
  client: CorporateClient;
  children: ReactNode;
  participantName?: string;
}

function isDarkHex(hex: string) {
  const safe = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(safe)) {
    return false;
  }

  const red = Number.parseInt(safe.slice(0, 2), 16);
  const green = Number.parseInt(safe.slice(2, 4), 16);
  const blue = Number.parseInt(safe.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance < 0.45;
}

export function CorporateShell({
  client,
  children,
  participantName,
}: CorporateShellProps) {
  const darkBackground = isDarkHex(client.branding.background);
  const cssVars = {
    "--client-primary": client.branding.primary,
    "--client-primary-hover": client.branding.primaryHover,
    "--client-on-primary": client.branding.contrastOnPrimary,
    "--client-glow": `${client.branding.primary}24`,
    "--client-eyebrow": client.branding.primaryDark,
    "--client-bg": client.branding.background,
    "--client-bg-strong": client.branding.background,
    "--client-fg": client.branding.foreground,
    "--client-fg-soft": client.branding.foreground,
    "--client-muted": client.branding.muted,
    "--client-muted-strong": client.branding.muted,
    "--client-line": client.branding.line,
    "--client-line-strong": client.branding.line,
    "--client-card-bg": darkBackground ? "rgba(255,255,255,0.035)" : "#ffffff",
    "--client-card-soft": darkBackground ? "rgba(255,255,255,0.05)" : "#fff8ec",
    "--client-card-shadow": darkBackground
      ? "0 10px 30px rgba(0, 0, 0, 0.26)"
      : "0 6px 18px rgba(244, 0, 9, 0.06)",
    "--client-card-shadow-strong": darkBackground
      ? "0 14px 36px rgba(0, 0, 0, 0.34)"
      : "0 12px 32px rgba(244, 0, 9, 0.1)",
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
