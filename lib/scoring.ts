import { knockoutMatchOrder } from "@/data/world-cup-2026";
import { deriveMatches, normalizeFixtureState } from "@/lib/world-cup-fixture";
import type { FixtureState, MatchId, TeamId } from "@/lib/world-cup-types";

const ROUND_OF_32_MATCHES = knockoutMatchOrder.slice(0, 16);
const ROUND_OF_16_MATCHES = knockoutMatchOrder.slice(16, 24);
const QUARTER_FINAL_MATCHES = knockoutMatchOrder.slice(24, 28);

const TOTAL_SCORING_UNITS = 88;

export interface FixtureScoreBreakdown {
  groupExactPoints: number;
  topTwoPartialPoints: number;
  bestThirdPoints: number;
  roundOf16Points: number;
  quarterFinalPoints: number;
  semiFinalPoints: number;
  finalPoints: number;
  championPoints: number;
  thirdPlaceWinnerPoints: number;
  preWorldCupPoints: number;
  knockoutPoints: number;
  total: number;
  scoredUnits: number;
  pendingUnits: number;
}

function uniqueTeamIds(teamIds: Array<TeamId | undefined>) {
  return [...new Set(teamIds.filter(Boolean) as TeamId[])];
}

function countSetHits(predicted: TeamId[], official: TeamId[]) {
  const officialSet = new Set(official);
  return predicted.filter((teamId) => officialSet.has(teamId)).length;
}

function hasOfficialGroupPhase(officialState: FixtureState) {
  return (
    officialState.qualifiedThirdPlaces.length === 8 &&
    Object.keys(officialState.thirdPlaceAssignments).length === 8
  );
}

function getParticipantIdsByMatchIds(
  matchesById: ReturnType<typeof deriveMatches>["matchesById"],
  matchIds: MatchId[],
) {
  return uniqueTeamIds(
    matchIds.flatMap((matchId) => [
      matchesById[matchId]?.sideA?.id,
      matchesById[matchId]?.sideB?.id,
    ]),
  );
}

function getWinnerIdsByMatchIds(
  matchesById: ReturnType<typeof deriveMatches>["matchesById"],
  matchIds: MatchId[],
) {
  return uniqueTeamIds(matchIds.map((matchId) => matchesById[matchId]?.winnerId));
}

function getGroupPhasePoints(predictionState: FixtureState, officialState: FixtureState) {
  if (!hasOfficialGroupPhase(officialState)) {
    return {
      groupExactPoints: 0,
      topTwoPartialPoints: 0,
      bestThirdPoints: 0,
    };
  }

  let groupExactPoints = 0;
  let topTwoPartialPoints = 0;

  for (const groupId of Object.keys(predictionState.groupOrders) as Array<
    keyof FixtureState["groupOrders"]
  >) {
    const predictionOrder = predictionState.groupOrders[groupId];
    const officialOrder = officialState.groupOrders[groupId];
    const officialTopTwo = new Set(officialOrder.slice(0, 2));

    for (let index = 0; index < predictionOrder.length; index += 1) {
      const predictedTeamId = predictionOrder[index];
      if (!predictedTeamId) {
        continue;
      }

      if (predictedTeamId === officialOrder[index]) {
        groupExactPoints += 2;
        continue;
      }

      if (index < 2 && officialTopTwo.has(predictedTeamId)) {
        topTwoPartialPoints += 1;
      }
    }
  }

  return {
    groupExactPoints,
    topTwoPartialPoints,
    bestThirdPoints:
      countSetHits(
        predictionState.qualifiedThirdPlaces,
        officialState.qualifiedThirdPlaces,
      ) * 2,
  };
}

function scoreStageReach(
  predictedTeams: TeamId[],
  officialTeams: TeamId[],
  pointsPerTeam: number,
) {
  if (officialTeams.length === 0) {
    return 0;
  }

  return countSetHits(predictedTeams, officialTeams) * pointsPerTeam;
}

function countScoredUnits(officialState: FixtureState) {
  const matchesById = deriveMatches(officialState).matchesById;
  let scoredUnits = 0;

  if (hasOfficialGroupPhase(officialState)) {
    scoredUnits += 56;
  }

  scoredUnits += getWinnerIdsByMatchIds(matchesById, ROUND_OF_32_MATCHES).length;
  scoredUnits += getWinnerIdsByMatchIds(matchesById, ROUND_OF_16_MATCHES).length;
  scoredUnits += getWinnerIdsByMatchIds(matchesById, QUARTER_FINAL_MATCHES).length;
  scoredUnits += getParticipantIdsByMatchIds(matchesById, ["M104"]).length;

  if (matchesById.M104.winnerId) {
    scoredUnits += 1;
  }

  if (matchesById.M103.winnerId) {
    scoredUnits += 1;
  }

  return scoredUnits;
}

export function scoreFixture(
  predictionSource: Partial<FixtureState> | FixtureState,
  officialSource: Partial<FixtureState> | FixtureState,
): FixtureScoreBreakdown {
  const predictionState = normalizeFixtureState(predictionSource);
  const officialState = normalizeFixtureState(officialSource);
  const predictionMatches = deriveMatches(predictionState).matchesById;
  const officialMatches = deriveMatches(officialState).matchesById;
  const groupPoints = getGroupPhasePoints(predictionState, officialState);

  const predictedRoundOf16 = getWinnerIdsByMatchIds(predictionMatches, ROUND_OF_32_MATCHES);
  const officialRoundOf16 = getWinnerIdsByMatchIds(officialMatches, ROUND_OF_32_MATCHES);
  const predictedQuarterFinalists = getWinnerIdsByMatchIds(
    predictionMatches,
    ROUND_OF_16_MATCHES,
  );
  const officialQuarterFinalists = getWinnerIdsByMatchIds(
    officialMatches,
    ROUND_OF_16_MATCHES,
  );
  const predictedSemiFinalists = getWinnerIdsByMatchIds(
    predictionMatches,
    QUARTER_FINAL_MATCHES,
  );
  const officialSemiFinalists = getWinnerIdsByMatchIds(
    officialMatches,
    QUARTER_FINAL_MATCHES,
  );
  const predictedFinalists = getParticipantIdsByMatchIds(predictionMatches, ["M104"]);
  const officialFinalists = getParticipantIdsByMatchIds(officialMatches, ["M104"]);

  const roundOf16Points = scoreStageReach(predictedRoundOf16, officialRoundOf16, 2);
  const quarterFinalPoints = scoreStageReach(
    predictedQuarterFinalists,
    officialQuarterFinalists,
    4,
  );
  const semiFinalPoints = scoreStageReach(
    predictedSemiFinalists,
    officialSemiFinalists,
    6,
  );
  const finalPoints = scoreStageReach(predictedFinalists, officialFinalists, 8);
  const championPoints =
    officialMatches.M104.winnerId &&
    predictionMatches.M104.winnerId === officialMatches.M104.winnerId
      ? 10
      : 0;
  const thirdPlaceWinnerPoints =
    officialMatches.M103.winnerId &&
    predictionMatches.M103.winnerId === officialMatches.M103.winnerId
      ? 2
      : 0;

  const preWorldCupPoints =
    groupPoints.groupExactPoints +
    groupPoints.topTwoPartialPoints +
    groupPoints.bestThirdPoints;
  const knockoutPoints =
    roundOf16Points +
    quarterFinalPoints +
    semiFinalPoints +
    finalPoints +
    championPoints +
    thirdPlaceWinnerPoints;
  const total = preWorldCupPoints + knockoutPoints;
  const scoredUnits = countScoredUnits(officialState);

  return {
    groupExactPoints: groupPoints.groupExactPoints,
    topTwoPartialPoints: groupPoints.topTwoPartialPoints,
    bestThirdPoints: groupPoints.bestThirdPoints,
    roundOf16Points,
    quarterFinalPoints,
    semiFinalPoints,
    finalPoints,
    championPoints,
    thirdPlaceWinnerPoints,
    preWorldCupPoints,
    knockoutPoints,
    total,
    scoredUnits,
    pendingUnits: Math.max(0, TOTAL_SCORING_UNITS - scoredUnits),
  };
}
