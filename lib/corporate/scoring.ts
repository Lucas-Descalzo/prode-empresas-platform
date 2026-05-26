import type { Prediction } from "./types";

export interface OfficialResult {
  home: number;
  away: number;
}

function outcomeOf(home: number, away: number): "home" | "draw" | "away" {
  if (home > away) return "home";
  if (home < away) return "away";
  return "draw";
}

export const POINTS_EXACT_SCORE = 3;
export const POINTS_CORRECT_OUTCOME = 1;

export function computeScore(
  prediction: Prediction,
  official: OfficialResult,
): number {
  const officialOutcome = outcomeOf(official.home, official.away);

  if (prediction.kind === "1X2") {
    return prediction.outcome === officialOutcome ? POINTS_CORRECT_OUTCOME : 0;
  }

  if (prediction.kind === "score") {
    if (
      prediction.home === official.home &&
      prediction.away === official.away
    ) {
      return POINTS_EXACT_SCORE;
    }
    const predictedOutcome = outcomeOf(prediction.home, prediction.away);
    if (predictedOutcome === officialOutcome) {
      return POINTS_CORRECT_OUTCOME;
    }
    return 0;
  }

  return 0;
}
