import Image from "next/image";

import { teamMap } from "@/data/world-cup-2026";
import { getTeamFlagAsset } from "@/lib/team-flag-assets";
import type { TeamId } from "@/lib/world-cup-types";
import styles from "./corporate-shell.module.css";

interface TeamBadgeProps {
  teamId: TeamId;
  small?: boolean;
  showCode?: boolean;
}

export function TeamBadge({
  teamId,
  small = false,
  showCode = true,
}: TeamBadgeProps) {
  const team = teamMap[teamId];
  if (!team) {
    return <span className={styles.teamBadgePill}>—</span>;
  }
  const flagAsset = getTeamFlagAsset(teamId);

  return (
    <span
      className={`${styles.teamBadgePill} ${
        small ? styles.teamBadgePillSmall : ""
      }`}
      title={team.name}
    >
      {flagAsset ? (
        <span
          className={`${styles.teamFlagBox} ${
            small ? styles.teamFlagBoxSmall : ""
          }`}
        >
          <Image
            src={flagAsset}
            alt={`Bandera de ${team.shortName}`}
            fill
            sizes={small ? "20px" : "24px"}
            className={styles.teamFlagImg}
          />
        </span>
      ) : (
        <span className={styles.teamFlagFallback}>{team.flag || team.code}</span>
      )}
      {showCode ? (
        <span className={styles.teamBadgeCode}>{team.code}</span>
      ) : null}
    </span>
  );
}
