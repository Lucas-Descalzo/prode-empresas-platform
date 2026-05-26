import type { ReactNode } from "react";

import type { CorporateClient } from "@/lib/corporate/types";
import { CorporateHeader } from "./corporate-header";
import styles from "./corporate-shell.module.css";

interface CorporateShellProps {
  client: CorporateClient;
  children: ReactNode;
  participantName?: string;
}

export function CorporateShell({
  client,
  children,
  participantName,
}: CorporateShellProps) {
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
