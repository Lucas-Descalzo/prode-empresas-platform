import { groupMatchSchedule } from "@/lib/corporate/group-schedule";
import { getOfficialResultsForCompany, saveOfficialResult } from "@/lib/corporate/db";
import { buildSimpleModeOfficialFixtureState } from "@/lib/corporate/simple-mode-official";
import { deriveMatches } from "@/lib/world-cup-fixture";
import { knockoutMatchOrder } from "@/data/world-cup-2026";
import type { TeamId } from "@/lib/world-cup-types";
import type { ApiMatch, ApiMatchWinner } from "./client";

// football-data.org stage string → our internal stage key
const API_STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "groups",
  ROUND_OF_32: "roundOf32",
  LAST_32: "roundOf32",
  ROUND_OF_16: "roundOf16",
  LAST_16: "roundOf16",
  QUARTER_FINALS: "quarterFinal",
  SEMI_FINALS: "semiFinal",
  THIRD_PLACE: "bronzeFinal",
  FINAL: "final",
};

// football-data.org TLA → our internal TeamId.
// Almost all TLAs are identical (just lowercase), except a handful of discrepancies.
const TLA_OVERRIDES: Record<string, TeamId> = {
  URY: "uru", // football-data uses URY, FIFA/our data uses URU
};

function tlaToTeamId(tla: string): TeamId {
  return (TLA_OVERRIDES[tla] ?? tla.toLowerCase()) as TeamId;
}

// Index group matches by "homeTeamId|awayTeamId" → our match ID
const GROUP_MATCH_BY_TEAM_PAIR = new Map<string, string>(
  groupMatchSchedule.map((match) => [
    `${match.homeTeamId}|${match.awayTeamId}`,
    match.id,
  ]),
);

export function resolveGroupMatchId(homeTla: string, awayTla: string): string | null {
  const key = `${tlaToTeamId(homeTla)}|${tlaToTeamId(awayTla)}`;
  return GROUP_MATCH_BY_TEAM_PAIR.get(key) ?? null;
}

export function resolveKnockoutMatchId(
  homeTla: string,
  awayTla: string,
  derivedMatchesById: ReturnType<typeof deriveMatches>["matchesById"],
): string | null {
  const homeId = tlaToTeamId(homeTla);
  const awayId = tlaToTeamId(awayTla);

  for (const matchId of knockoutMatchOrder) {
    const match = derivedMatchesById[matchId];
    const sideA = match?.sideA?.id;
    const sideB = match?.sideB?.id;
    if (!sideA || !sideB) continue;

    if (
      (sideA === homeId && sideB === awayId) ||
      (sideA === awayId && sideB === homeId)
    ) {
      return matchId;
    }
  }

  return null;
}

function resolveAdvancingTeamId(
  winner: ApiMatchWinner,
  homeTla: string,
  awayTla: string,
): TeamId | null {
  if (winner === "HOME_TEAM") return tlaToTeamId(homeTla);
  if (winner === "AWAY_TEAM") return tlaToTeamId(awayTla);
  return null;
}

export interface SyncResult {
  processed: number;
  skipped: number;
  saved: number;
  errors: string[];
}

export async function syncMatchResults(
  companyId: string,
  matches: ApiMatch[],
  dryRun = false,
): Promise<SyncResult> {
  const result: SyncResult = { processed: 0, skipped: 0, saved: 0, errors: [] };

  const finishedMatches = matches.filter(
    (m) => m.status === "FINISHED" &&
      m.score.fullTime.home !== null &&
      m.score.fullTime.away !== null,
  );

  if (finishedMatches.length === 0) {
    return result;
  }

  // Load current official results to build derived state for knockout resolution
  const existingResults = await getOfficialResultsForCompany(companyId);
  const officialState = buildSimpleModeOfficialFixtureState(existingResults);
  const { matchesById: derivedMatchesById } = deriveMatches(officialState);

  for (const match of finishedMatches) {
    result.processed++;

    const stage = API_STAGE_MAP[match.stage];
    if (!stage) {
      result.skipped++;
      continue;
    }

    const homeScore = match.score.fullTime.home!;
    const awayScore = match.score.fullTime.away!;

    let matchId: string | null = null;

    if (stage === "groups") {
      matchId = resolveGroupMatchId(match.homeTeam.tla, match.awayTeam.tla);
    } else {
      matchId = resolveKnockoutMatchId(
        match.homeTeam.tla,
        match.awayTeam.tla,
        derivedMatchesById,
      );
    }

    if (!matchId) {
      result.skipped++;
      result.errors.push(
        `Could not resolve match: ${match.homeTeam.tla} vs ${match.awayTeam.tla} (stage: ${match.stage}, apiId: ${match.id})`,
      );
      continue;
    }

    // Skip if already saved with same score (avoid redundant writes)
    const existing = existingResults[matchId];
    if (
      existing &&
      existing.homeScore === homeScore &&
      existing.awayScore === awayScore &&
      existing.advancingTeamId === resolveAdvancingTeamId(match.score.winner, match.homeTeam.tla, match.awayTeam.tla)
    ) {
      result.skipped++;
      continue;
    }

    const advancingTeamId = resolveAdvancingTeamId(
      match.score.winner,
      match.homeTeam.tla,
      match.awayTeam.tla,
    );

    if (!dryRun) {
      try {
        await saveOfficialResult({
          companyId,
          matchId,
          home: homeScore,
          away: awayScore,
          advancingTeamId,
        });
        result.saved++;
      } catch (error) {
        result.errors.push(
          `Failed to save ${matchId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      // Dry run: just count what would be saved
      result.saved++;
    }
  }

  return result;
}
