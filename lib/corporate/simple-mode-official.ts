import { knockoutMatchOrder } from "@/data/world-cup-2026";
import {
  createInitialFixtureState,
  deriveMatches,
  normalizeFixtureState,
  suggestThirdAssignments,
} from "@/lib/world-cup-fixture";
import type { FixtureState, GroupId, TeamId } from "@/lib/world-cup-types";
import { groupMatchSchedule } from "./group-schedule";

interface OfficialResultLike {
  homeScore: number;
  awayScore: number;
  advancingTeamId?: TeamId | null;
}

interface GroupTableStat {
  teamId: TeamId;
  points: number;
  goalDiff: number;
  goalsFor: number;
}

function emptyStat(teamId: TeamId): GroupTableStat {
  return {
    teamId,
    points: 0,
    goalDiff: 0,
    goalsFor: 0,
  };
}

function compareGroupStats(
  left: GroupTableStat,
  right: GroupTableStat,
  orderIndex: Record<TeamId, number>,
) {
  if (right.points !== left.points) {
    return right.points - left.points;
  }

  if (right.goalDiff !== left.goalDiff) {
    return right.goalDiff - left.goalDiff;
  }

  if (right.goalsFor !== left.goalsFor) {
    return right.goalsFor - left.goalsFor;
  }

  return (orderIndex[left.teamId] ?? 99) - (orderIndex[right.teamId] ?? 99);
}

function buildCompletedGroupPhase(
  resultsByMatchId: Record<string, OfficialResultLike>,
): Pick<FixtureState, "groupOrders" | "qualifiedThirdPlaces" | "thirdPlaceAssignments"> | null {
  if (!groupMatchSchedule.every((match) => resultsByMatchId[match.id])) {
    return null;
  }

  const initialState = createInitialFixtureState();
  const groupOrders = { ...initialState.groupOrders };
  const thirdPlaceStats: Array<GroupTableStat & { groupId: GroupId }> = [];

  for (const [groupId, initialOrder] of Object.entries(groupOrders) as Array<
    [GroupId, TeamId[]]
  >) {
    const stats = new Map<TeamId, GroupTableStat>(
      initialOrder.map((teamId) => [teamId, emptyStat(teamId)]),
    );
    const orderIndex = Object.fromEntries(
      initialOrder.map((teamId, index) => [teamId, index]),
    ) as Record<TeamId, number>;

    for (const match of groupMatchSchedule.filter((item) => item.groupId === groupId)) {
      const result = resultsByMatchId[match.id];
      if (!result) {
        return null;
      }

      const home = stats.get(match.homeTeamId);
      const away = stats.get(match.awayTeamId);
      if (!home || !away) {
        continue;
      }

      home.goalsFor += result.homeScore;
      away.goalsFor += result.awayScore;
      home.goalDiff += result.homeScore - result.awayScore;
      away.goalDiff += result.awayScore - result.homeScore;

      if (result.homeScore > result.awayScore) {
        home.points += 3;
      } else if (result.awayScore > result.homeScore) {
        away.points += 3;
      } else {
        home.points += 1;
        away.points += 1;
      }
    }

    const ordered = [...stats.values()].sort((left, right) =>
      compareGroupStats(left, right, orderIndex),
    );
    groupOrders[groupId] = ordered.map((row) => row.teamId);

    const third = ordered[2];
    if (third) {
      thirdPlaceStats.push({ ...third, groupId });
    }
  }

  const qualifiedThirdPlaces = thirdPlaceStats
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      if (right.goalDiff !== left.goalDiff) {
        return right.goalDiff - left.goalDiff;
      }

      if (right.goalsFor !== left.goalsFor) {
        return right.goalsFor - left.goalsFor;
      }

      return left.groupId.localeCompare(right.groupId, "es-AR");
    })
    .slice(0, 8)
    .map((row) => row.teamId);

  return {
    groupOrders,
    qualifiedThirdPlaces,
    thirdPlaceAssignments: suggestThirdAssignments(qualifiedThirdPlaces),
  };
}

function resolveAdvancingTeamId(
  homeTeamId: TeamId,
  awayTeamId: TeamId,
  result: OfficialResultLike,
) {
  if (result.homeScore > result.awayScore) {
    return homeTeamId;
  }

  if (result.awayScore > result.homeScore) {
    return awayTeamId;
  }

  if (result.advancingTeamId === homeTeamId || result.advancingTeamId === awayTeamId) {
    return result.advancingTeamId;
  }

  return null;
}

export function buildSimpleModeOfficialFixtureState(
  resultsByMatchId: Record<string, OfficialResultLike>,
) {
  const initialState = createInitialFixtureState();
  const completedGroupPhase = buildCompletedGroupPhase(resultsByMatchId);
  let officialState = normalizeFixtureState({
    ...initialState,
    ...(completedGroupPhase ?? {}),
  });

  for (const matchId of knockoutMatchOrder) {
    const result = resultsByMatchId[matchId];
    if (!result) {
      continue;
    }

    const matchesById = deriveMatches(officialState).matchesById;
    const match = matchesById[matchId];
    const homeTeamId = match.sideA?.id;
    const awayTeamId = match.sideB?.id;

    if (!homeTeamId || !awayTeamId) {
      continue;
    }

    const winnerId = resolveAdvancingTeamId(homeTeamId, awayTeamId, result);
    if (!winnerId) {
      continue;
    }

    officialState = normalizeFixtureState({
      ...officialState,
      knockoutWinners: {
        ...officialState.knockoutWinners,
        [matchId]: winnerId,
      },
    });
  }

  return officialState;
}

export function isKnockoutMatchResolvedByPenalties(
  result: OfficialResultLike | null | undefined,
) {
  return Boolean(result && result.homeScore === result.awayScore && result.advancingTeamId);
}

export function inferAdvancingTeamFromResult(
  homeTeamId: TeamId | undefined,
  awayTeamId: TeamId | undefined,
  result: OfficialResultLike | null | undefined,
) {
  if (!homeTeamId || !awayTeamId || !result) {
    return null;
  }

  return resolveAdvancingTeamId(homeTeamId, awayTeamId, result);
}
