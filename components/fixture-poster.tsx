"use client";

import type { CSSProperties } from "react";
import { forwardRef } from "react";

import { knockoutSlots, stageLabels } from "@/data/world-cup-2026";
import { getTeamFlagAsset } from "@/lib/team-flag-assets";
import type { DerivedMatch, KnockoutSlot, MatchId, StageId } from "@/lib/world-cup-types";

import styles from "./fixture-poster.module.css";

type BracketSide = "left" | "right" | "center";

interface FixturePosterProps {
  matchesById: Record<MatchId, DerivedMatch>;
  championName: string;
  generatedAtLabel: string;
  title?: string;
  companyLogoUrl?: string | null;
  companyLabel?: string;
  brandPrimary?: string | null;
  brandBg?: string | null;
  brandOnPrimary?: string | null;
  participantName?: string | null;
}

interface PosterMatchCardProps {
  match: DerivedMatch;
  side: BracketSide;
  featured?: boolean;
  compact?: boolean;
}

interface PosterMatchTreeProps {
  matchId: MatchId;
  side: Extract<BracketSide, "left" | "right">;
  matchesById: Record<MatchId, DerivedMatch>;
}

const focusStages: StageId[] = ["roundOf32", "roundOf16", "quarterFinal", "semiFinal"];
const knockoutSlotMap = Object.fromEntries(
  knockoutSlots.map((slot) => [slot.matchId, slot]),
) as Record<MatchId, KnockoutSlot>;

function cn(...classNames: Array<string | false | undefined>) {
  return classNames.filter(Boolean).join(" ");
}


function getChildMatchIds(matchId: MatchId): [MatchId, MatchId] | null {
  const slot = knockoutSlotMap[matchId];

  if (slot.sideA.kind !== "winner" || slot.sideB.kind !== "winner") {
    return null;
  }

  return [slot.sideA.matchId, slot.sideB.matchId];
}

function PosterTeamRow({
  teamId,
  code,
  label,
  winner = false,
  side,
}: {
  teamId?: string;
  code?: string;
  label: string;
  winner?: boolean;
  side: BracketSide;
}) {
  const flagAsset = teamId ? getTeamFlagAsset(teamId) : undefined;

  return (
    <div
      className={cn(
        styles.teamRow,
        winner && styles.teamRowWinner,
        side === "right" && styles.teamRowRight,
        side === "center" && styles.teamRowCenter,
      )}
    >
      <div className={styles.teamIdentity}>
        {flagAsset ? (
          <span className={styles.flagFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={flagAsset}
              alt={`Bandera de ${label}`}
              className={styles.flagAsset}
              width={34}
              height={24}
            />
          </span>
        ) : (
          <span className={styles.flagFallback}>--</span>
        )}

        <div className={styles.teamCopy}>
          <strong>{code ?? "---"}</strong>
          <span>{label}</span>
        </div>
      </div>

      <span
        className={cn(
          styles.statusDot,
          winner ? styles.statusDotWinner : styles.statusDotReady,
        )}
      />
    </div>
  );
}

function PosterMatchCard({
  match,
  side,
  featured = false,
  compact = false,
}: PosterMatchCardProps) {
  return (
    <article
      className={cn(
        styles.matchCard,
        side === "left" && styles.matchCardLeft,
        side === "right" && styles.matchCardRight,
        side === "center" && styles.matchCardCenter,
        featured && styles.matchCardFeatured,
        compact && styles.matchCardCompact,
      )}
    >
      <header className={styles.matchHeader}>
        <span>{match.meta.city}</span>
      </header>

      <div className={styles.countryStack}>
        <PosterTeamRow
          teamId={match.sideA?.id}
          code={match.sideA?.code}
          label={match.sideA?.shortName ?? match.sideALabel}
          winner={match.winnerId === match.sideA?.id}
          side={side}
        />
        <PosterTeamRow
          teamId={match.sideB?.id}
          code={match.sideB?.code}
          label={match.sideB?.shortName ?? match.sideBLabel}
          winner={match.winnerId === match.sideB?.id}
          side={side}
        />
      </div>
    </article>
  );
}

function PosterMatchTree({ matchId, side, matchesById }: PosterMatchTreeProps) {
  const match = matchesById[matchId];
  const childMatchIds = getChildMatchIds(matchId);

  if (!childMatchIds) {
    return (
      <div
        className={cn(
          styles.treeLeaf,
          side === "left" && styles.treeLeafLeft,
          side === "right" && styles.treeLeafRight,
        )}
      >
        <PosterMatchCard match={match} side={side} />
      </div>
    );
  }

  const children = (
    <div
      className={cn(
        styles.treeChildren,
        side === "left" && styles.treeChildrenLeft,
        side === "right" && styles.treeChildrenRight,
      )}
    >
      {childMatchIds.map((childMatchId) => (
        <div
          key={childMatchId}
          className={cn(
            styles.treeChild,
            side === "left" && styles.treeChildLeft,
            side === "right" && styles.treeChildRight,
          )}
        >
          <PosterMatchTree matchId={childMatchId} side={side} matchesById={matchesById} />
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={cn(
        styles.treeNode,
        side === "left" && styles.treeNodeLeft,
        side === "right" && styles.treeNodeRight,
      )}
    >
      {side === "left" ? (
        <>
          {children}
          <div className={styles.treeConnector} aria-hidden />
          <div className={styles.treeMatch}>
            <PosterMatchCard match={match} side={side} />
          </div>
        </>
      ) : (
        <>
          <div className={styles.treeMatch}>
            <PosterMatchCard match={match} side={side} />
          </div>
          <div className={styles.treeConnector} aria-hidden />
          {children}
        </>
      )}
    </div>
  );
}

export const FixturePoster = forwardRef<HTMLDivElement, FixturePosterProps>(function FixturePoster(
  {
    matchesById,
    championName,
    generatedAtLabel,
    title = "Tu fixture Mundial 2026",
    companyLogoUrl,
    companyLabel,
    brandPrimary,
    brandBg,
    brandOnPrimary,
    participantName,
  },
  ref,
) {
  const brandStyle = {
    ...(brandPrimary ? { "--poster-primary": brandPrimary } : {}),
    ...(brandPrimary
      ? {
          "--poster-primary-soft": `color-mix(in srgb, ${brandPrimary} 16%, transparent)`,
          "--poster-primary-border": `color-mix(in srgb, ${brandPrimary} 48%, transparent)`,
        }
      : {}),
    ...(brandBg ? { "--poster-bg": brandBg } : {}),
    ...(brandOnPrimary ? { "--poster-on-primary": brandOnPrimary } : {}),
  } as CSSProperties;

  const eyebrowText = companyLabel
    ? `PRODE · ${companyLabel.toUpperCase()}`
    : "PRODE MUNDIAL 2026";

  return (
    <div ref={ref} className={styles.posterRoot} style={brandStyle}>
      <header className={styles.posterHeader}>
        <div className={cn(styles.brandBlock, companyLogoUrl && styles.brandBlockCompany)}>
          {companyLogoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={companyLogoUrl}
              alt={companyLabel ?? "Logo empresa"}
              className={styles.brandClientLogo}
            />
          ) : (
            <div className={styles.brandLogos}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/official/wc26-logo.png" alt="World Cup 26" className={styles.brandLogo} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/official/fifa-logo-white.png"
                alt="FIFA"
                className={styles.brandFifa}
              />
            </div>
          )}

          <div className={styles.brandCopy}>
            {companyLogoUrl ? (
              <p className={styles.brandCompanyTitle}>{eyebrowText}</p>
            ) : (
              <>
                <p className={styles.eyebrow}>{eyebrowText}</p>
                <h1>{title}</h1>
              </>
            )}
          </div>
        </div>

        <div className={styles.metaStack}>
          {participantName ? (
            <div className={styles.metaCardParticipant}>
              <span>Pronóstico de</span>
              <strong>{participantName}</strong>
            </div>
          ) : null}
          <div className={styles.metaCardChampion}>
            <div className={styles.championInner}>
              <span className={styles.championTrophyIcon}>🏆</span>
              <div className={styles.championContent}>
                <span>CAMPEÓN</span>
                <strong>{championName}</strong>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.stageGuide}>
        {focusStages.map((stage, index) => (
          <div
            key={`left-${stage}`}
            className={styles.stagePill}
            style={{ gridColumn: index + 1 }}
          >
            {stageLabels[stage]}
          </div>
        ))}

        <div className={cn(styles.stagePill, styles.stagePillFinal)} style={{ gridColumn: 5 }}>
          {stageLabels.final}
        </div>

        {[...focusStages].reverse().map((stage, index) => (
          <div
            key={`right-${stage}`}
            className={styles.stagePill}
            style={{ gridColumn: 6 + index }}
          >
            {stageLabels[stage]}
          </div>
        ))}
      </div>

      <main className={styles.posterMain}>
        <div className={styles.posterCanvas}>
          <div className={cn(styles.branchColumn, styles.branchColumnLeft)}>
            <PosterMatchTree matchId="M101" side="left" matchesById={matchesById} />
          </div>

          <div className={styles.finalColumn}>
            <div className={styles.finalRow}>
              <span className={styles.finalConnector} aria-hidden />
              <div className={styles.posterFinalStack}>
                {matchesById.M104.winnerId ? (
                  <div className={styles.posterTrophyWrap} aria-hidden>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/official/world-cup-trophy.png"
                      alt=""
                      className={styles.posterTrophy}
                    />
                  </div>
                ) : null}
                <PosterMatchCard match={matchesById.M104} side="center" featured />
              </div>
              <span className={styles.finalConnector} aria-hidden />
            </div>
          </div>

          <div className={cn(styles.branchColumn, styles.branchColumnRight)}>
            <PosterMatchTree matchId="M102" side="right" matchesById={matchesById} />
          </div>
        </div>

        <div className={styles.bronzeWrapper}>
          <PosterMatchCard match={matchesById.M103} side="center" compact />
        </div>
      </main>

      <footer className={styles.posterFooter}>
        {companyLabel ? (
          <span className={styles.footerBrand}>{companyLabel}</span>
        ) : null}
      </footer>
    </div>
  );
});
