"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { CorporateClient } from "@/lib/corporate/types";
import styles from "./corporate-shell.module.css";

interface CorporateHeaderProps {
  client: CorporateClient;
  participantName?: string;
}

type TabId = "inicio" | "partidos" | "liga";

const TABS: Array<{ id: TabId; label: string; href: (slug: string) => string }> = [
  { id: "inicio", label: "Inicio", href: (slug) => `/c/${slug}` },
  { id: "partidos", label: "Partidos", href: (slug) => `/c/${slug}/partidos` },
  { id: "liga", label: "Liga", href: (slug) => `/c/${slug}/liga` },
];

function activeTabFromPath(pathname: string, slug: string): TabId {
  if (pathname.startsWith(`/c/${slug}/partidos`)) return "partidos";
  if (pathname.startsWith(`/c/${slug}/liga`)) return "liga";
  return "inicio";
}

export function CorporateHeader({ client, participantName }: CorporateHeaderProps) {
  const pathname = usePathname() ?? "";
  const activeTab = activeTabFromPath(pathname, client.slug);
  const logoText = client.branding.logoText?.trim() || client.shortName;
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [client.branding.logoUrl]);

  return (
    <header className={styles.unifiedHeader}>
      <div className={styles.headerTopRow}>
        <Link
          href={`/c/${client.slug}`}
          className={styles.brandWrap}
          aria-label={client.displayName}
        >
          {client.branding.logoUrl && !logoFailed ? (
            <img
              src={client.branding.logoUrl}
              alt={client.displayName}
              className={styles.brandLogoImage}
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className={styles.brandTextLogo}>{logoText}</span>
          )}

          <span className={styles.brandDivider} aria-hidden="true" />
          <span className={styles.brandTitle}>
            <span className={styles.brandTitleStrong}>Mundial 2026</span>
            <span className={styles.brandTitleSmall}>
              {participantName ? `Hola, ${participantName}` : "Activacion interna"}
            </span>
          </span>
        </Link>
      </div>

      <nav className={styles.progressSteps} aria-label="Navegacion">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href(client.slug)}
            className={`${styles.progressStep} ${
              activeTab === tab.id ? styles.stepActive : ""
            }`}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
