import type { CorporateClient, PredictionMode, PredictionStage } from "./types";
import type { TeamId } from "@/lib/world-cup-types";

interface ResolveModeArgs {
  client: CorporateClient;
  stage: PredictionStage;
  homeTeamId?: TeamId;
  awayTeamId?: TeamId;
}

export function resolvePredictionMode({
  client,
  stage,
  homeTeamId,
  awayTeamId,
}: ResolveModeArgs): PredictionMode {
  const baseMode = client.predictionRules[stage];

  if (baseMode === "score") {
    return "score";
  }

  const involvesHighlightedTeam =
    (homeTeamId && client.highlightedTeamIds.includes(homeTeamId)) ||
    (awayTeamId && client.highlightedTeamIds.includes(awayTeamId));

  if (involvesHighlightedTeam) {
    return "score";
  }

  return baseMode;
}

export function isHighlightedMatch(
  client: CorporateClient,
  homeTeamId?: TeamId,
  awayTeamId?: TeamId,
): boolean {
  if (!homeTeamId || !awayTeamId) return false;
  return (
    client.highlightedTeamIds.includes(homeTeamId) ||
    client.highlightedTeamIds.includes(awayTeamId)
  );
}
