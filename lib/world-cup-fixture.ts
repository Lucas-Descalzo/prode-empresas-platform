import {
  groupMap,
  groups,
  knockoutMatchOrder,
  knockoutSlots,
  stageLabels,
  teamMap,
  thirdPlaceFamilies,
} from "@/data/world-cup-2026";
import {
  createThirdPlaceCombinationKey,
  thirdPlaceCombinationMatrix,
} from "@/data/third-place-combinations";
import {
  GROUP_IDS,
  THIRD_PLACE_MATCH_IDS,
  type DerivedMatch,
  type DerivedTeam,
  type FixtureState,
  type GroupMatchId,
  type GroupMatchPrediction,
  type GroupPredictionMode,
  type GroupId,
  type MatchId,
  type ParticipantRef,
  type TeamId,
  type ThirdPlaceMatchId,
} from "@/lib/world-cup-types";

export const FIXTURE_STATE_VERSION = 2;

const placementLabels = {
  1: "1°",
  2: "2°",
  3: "3°",
  4: "4°",
} as const;

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

const groupMatchPairIndexes = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
] as const;

export interface GroupMatchDefinition {
  id: GroupMatchId;
  groupId: GroupId;
  matchNumber: 1 | 2 | 3 | 4 | 5 | 6;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
}

export interface GroupTableRow {
  teamId: TeamId;
  played: number;
  points: number;
}

export function getGroupMatchDefinitions(groupId: GroupId): GroupMatchDefinition[] {
  const teams = groupMap[groupId].teams;

  return groupMatchPairIndexes.map(([homeIndex, awayIndex], index) => ({
    id: `${groupId}-${index + 1}` as GroupMatchId,
    groupId,
    matchNumber: (index + 1) as 1 | 2 | 3 | 4 | 5 | 6,
    homeTeamId: teams[homeIndex],
    awayTeamId: teams[awayIndex],
  }));
}

export function getGroupTableRows(
  groupId: GroupId,
  predictions: Partial<Record<GroupMatchId, GroupMatchPrediction>> | undefined,
) {
  const rows = new Map<TeamId, GroupTableRow>(
    groupMap[groupId].teams.map((teamId) => [
      teamId,
      {
        teamId,
        played: 0,
        points: 0,
      },
    ]),
  );

  for (const match of getGroupMatchDefinitions(groupId)) {
    const prediction = predictions?.[match.id];

    if (!prediction) {
      continue;
    }

    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);

    if (!home || !away) {
      continue;
    }

    home.played += 1;
    away.played += 1;

    if (prediction === "draw") {
      home.points += 1;
      away.points += 1;
    } else if (prediction === "home") {
      home.points += 3;
    } else {
      away.points += 3;
    }
  }

  return [...rows.values()];
}

export function applyGroupMatchPredictionsToOrder(
  groupId: GroupId,
  currentOrder: TeamId[],
  predictions: Partial<Record<GroupMatchId, GroupMatchPrediction>> | undefined,
) {
  const rows = getGroupTableRows(groupId, predictions);
  const pointsByTeam = Object.fromEntries(
    rows.map((row) => [row.teamId, row.points]),
  ) as Record<TeamId, number>;
  const orderIndex = Object.fromEntries(
    currentOrder.map((teamId, index) => [teamId, index]),
  ) as Record<TeamId, number>;

  return [...groupMap[groupId].teams].sort((teamA, teamB) => {
    const pointsDifference = (pointsByTeam[teamB] ?? 0) - (pointsByTeam[teamA] ?? 0);

    if (pointsDifference !== 0) {
      return pointsDifference;
    }

    return (orderIndex[teamA] ?? 99) - (orderIndex[teamB] ?? 99);
  });
}

export function createInitialFixtureState(): FixtureState {
  return {
    version: FIXTURE_STATE_VERSION,
    groupOrders: Object.fromEntries(
      groups.map((group) => [group.id, [...group.teams]]),
    ) as FixtureState["groupOrders"],
    groupMatchPredictions: {},
    groupPredictionModes: {},
    qualifiedThirdPlaces: [],
    thirdPlaceAssignments: {},
    knockoutWinners: {},
  };
}

export function sanitizeGroupOrders(
  source: Partial<Record<GroupId, TeamId[]>> | undefined,
): FixtureState["groupOrders"] {
  return Object.fromEntries(
    groups.map((group) => {
      const incoming = source?.[group.id] ?? [];
      const incomingValid = incoming.filter((teamId) => group.teams.includes(teamId));
      const deduped = unique(incomingValid);
      const missing = group.teams.filter((teamId) => !deduped.includes(teamId));

      return [group.id, [...deduped, ...missing]];
    }),
  ) as FixtureState["groupOrders"];
}

export function getThirdPlaceCandidates(groupOrders: FixtureState["groupOrders"]) {
  return GROUP_IDS.map((groupId) => {
    const teamId = groupOrders[groupId][2];
    return teamMap[teamId];
  });
}

export function getGroupPlacements(groupOrders: FixtureState["groupOrders"], groupId: GroupId) {
  return groupOrders[groupId].map((teamId) => teamMap[teamId]);
}

export function suggestThirdAssignments(
  qualifiedThirdPlaces: TeamId[],
): Partial<Record<ThirdPlaceMatchId, TeamId>> {
  if (qualifiedThirdPlaces.length !== THIRD_PLACE_MATCH_IDS.length) {
    return {};
  }

  const teamsByGroup = Object.fromEntries(
    qualifiedThirdPlaces.map((teamId) => [teamMap[teamId].group, teamId]),
  ) as Partial<Record<GroupId, TeamId>>;
  const combinationKey = createThirdPlaceCombinationKey(
    qualifiedThirdPlaces.map((teamId) => teamMap[teamId].group),
  );
  const officialAssignment = thirdPlaceCombinationMatrix[combinationKey];
  const assignment: Partial<Record<ThirdPlaceMatchId, TeamId>> = {};

  if (!officialAssignment) {
    return {};
  }

  for (const matchId of THIRD_PLACE_MATCH_IDS) {
    const assignedGroup = officialAssignment[matchId];
    const teamId = teamsByGroup[assignedGroup];

    if (!teamId || !thirdPlaceFamilies[matchId].includes(assignedGroup)) {
      return {};
    }

    assignment[matchId] = teamId;
  }

  return assignment;
}

export function sanitizeQualifiedThirdPlaces(
  incoming: TeamId[] | undefined,
  thirdCandidates: TeamId[],
) {
  const thirdCandidateSet = new Set(thirdCandidates);
  const filtered = (incoming ?? []).filter((teamId) => thirdCandidateSet.has(teamId));

  return unique(filtered).slice(0, 8);
}

export function sanitizeGroupMatchPredictions(
  incoming: Partial<Record<GroupMatchId, GroupMatchPrediction>> | undefined,
) {
  const validPredictions = new Set<GroupMatchPrediction>(["home", "draw", "away"]);
  const validMatchIds = new Set<GroupMatchId>(
    GROUP_IDS.flatMap((groupId) =>
      getGroupMatchDefinitions(groupId).map((match) => match.id),
    ),
  );
  const sanitized: Partial<Record<GroupMatchId, GroupMatchPrediction>> = {};

  for (const [matchId, prediction] of Object.entries(incoming ?? {})) {
    if (
      validMatchIds.has(matchId as GroupMatchId) &&
      validPredictions.has(prediction as GroupMatchPrediction)
    ) {
      sanitized[matchId as GroupMatchId] = prediction as GroupMatchPrediction;
    }
  }

  return sanitized;
}

export function sanitizeGroupPredictionModes(
  incoming: Partial<Record<GroupId, GroupPredictionMode>> | undefined,
) {
  const sanitized: Partial<Record<GroupId, GroupPredictionMode>> = {};

  for (const groupId of GROUP_IDS) {
    if (incoming?.[groupId] === "matches") {
      sanitized[groupId] = "matches";
    }
  }

  return sanitized;
}

export function sanitizeThirdAssignments(
  _incoming: Partial<Record<ThirdPlaceMatchId, TeamId>> | undefined,
  qualifiedThirdPlaces: TeamId[],
) {
  if (qualifiedThirdPlaces.length !== THIRD_PLACE_MATCH_IDS.length) {
    return {};
  }

  return suggestThirdAssignments(qualifiedThirdPlaces);
}

function formatPlacementRef(group: GroupId, place: 1 | 2) {
  return `${placementLabels[place]} ${group}`;
}

function formatThirdRef(allowedGroups: GroupId[]) {
  return `3° ${allowedGroups.join("")}`;
}

function formatRefLabel(ref: ParticipantRef) {
  switch (ref.kind) {
    case "placement":
      return formatPlacementRef(ref.group, ref.place);
    case "third":
      return formatThirdRef(ref.allowedGroups);
    case "winner":
      return `Ganador ${ref.matchId}`;
    case "loser":
      return `Perdedor ${ref.matchId}`;
    default:
      return "";
  }
}

function getTeamByPlacement(
  ref: Extract<ParticipantRef, { kind: "placement" }>,
  groupOrders: FixtureState["groupOrders"],
) {
  const teamId = groupOrders[ref.group][ref.place - 1];
  return teamMap[teamId] ?? null;
}

function getTeamByThird(
  matchId: ThirdPlaceMatchId,
  thirdPlaceAssignments: Partial<Record<ThirdPlaceMatchId, TeamId>>,
) {
  const teamId = thirdPlaceAssignments[matchId];
  return teamId ? teamMap[teamId] : null;
}

function asDerivedTeam(teamId: TeamId | undefined): DerivedTeam | null {
  if (!teamId) {
    return null;
  }

  const team = teamMap[teamId];
  if (!team) {
    return null;
  }

  return { ...team };
}

export function deriveMatches(
  state: FixtureState,
  keepValidWinnersOnly = false,
) {
  const matchesById = {} as Record<MatchId, DerivedMatch>;
  const validWinners: Partial<Record<MatchId, TeamId>> = {};

  for (const matchId of knockoutMatchOrder) {
    const slot = knockoutSlots.find((entry) => entry.matchId === matchId);

    if (!slot) {
      continue;
    }

    const resolveRef = (ref: ParticipantRef): DerivedTeam | null => {
      switch (ref.kind) {
        case "placement":
          return getTeamByPlacement(ref, state.groupOrders);
        case "third":
          return getTeamByThird(matchId as ThirdPlaceMatchId, state.thirdPlaceAssignments);
        case "winner":
          return asDerivedTeam(validWinners[ref.matchId]);
        case "loser": {
          const previousMatch = matchesById[ref.matchId];
          return asDerivedTeam(previousMatch?.loserId);
        }
        default:
          return null;
      }
    };

    const sideA = resolveRef(slot.sideA);
    const sideB = resolveRef(slot.sideB);

    let winnerId = state.knockoutWinners[matchId];
    if (winnerId && winnerId !== sideA?.id && winnerId !== sideB?.id) {
      winnerId = undefined;
    }

    if (winnerId) {
      validWinners[matchId] = winnerId;
    } else if (keepValidWinnersOnly) {
      delete validWinners[matchId];
    }

    let loserId: TeamId | undefined;
    if (winnerId && sideA && sideB) {
      loserId = sideA.id === winnerId ? sideB.id : sideA.id;
    }

    matchesById[matchId] = {
      matchId,
      stage: slot.stage,
      meta: slot.meta,
      sideA,
      sideB,
      sideALabel: sideA?.shortName ?? formatRefLabel(slot.sideA),
      sideBLabel: sideB?.shortName ?? formatRefLabel(slot.sideB),
      winnerId,
      loserId,
    };
  }

  return { matchesById, validWinners };
}

export function normalizeFixtureState(source: Partial<FixtureState> | FixtureState) {
  const initial = createInitialFixtureState();
  const sanitizedGroupOrders = sanitizeGroupOrders(source.groupOrders);
  const groupMatchPredictions = sanitizeGroupMatchPredictions(
    source.groupMatchPredictions,
  );
  const groupPredictionModes = sanitizeGroupPredictionModes(source.groupPredictionModes);
  const groupOrders = Object.fromEntries(
    GROUP_IDS.map((groupId) => {
      const order =
        groupPredictionModes[groupId] === "matches"
          ? applyGroupMatchPredictionsToOrder(
              groupId,
              sanitizedGroupOrders[groupId],
              groupMatchPredictions,
            )
          : sanitizedGroupOrders[groupId];

      return [groupId, order];
    }),
  ) as FixtureState["groupOrders"];
  const thirdCandidates = getThirdPlaceCandidates(groupOrders).map((team) => team.id);
  const qualifiedThirdPlaces = sanitizeQualifiedThirdPlaces(
    source.qualifiedThirdPlaces,
    thirdCandidates,
  );
  const thirdPlaceAssignments = sanitizeThirdAssignments(
    source.thirdPlaceAssignments,
    qualifiedThirdPlaces,
  );

  const baseState: FixtureState = {
    version: FIXTURE_STATE_VERSION,
    groupOrders,
    groupMatchPredictions,
    groupPredictionModes,
    qualifiedThirdPlaces,
    thirdPlaceAssignments,
    knockoutWinners: source.knockoutWinners ?? initial.knockoutWinners,
  };

  const { validWinners } = deriveMatches(baseState, true);

  return {
    ...baseState,
    knockoutWinners: validWinners,
  };
}

export function getChampion(matchMap: Record<MatchId, DerivedMatch>) {
  const final = matchMap.M104;
  if (!final?.winnerId) {
    return null;
  }

  return teamMap[final.winnerId];
}

export function getThirdPlaceSlotOptions(qualifiedThirdPlaces: TeamId[]) {
  return Object.fromEntries(
    THIRD_PLACE_MATCH_IDS.map((matchId) => [
      matchId,
      qualifiedThirdPlaces
        .map((teamId) => teamMap[teamId])
        .filter((team) => thirdPlaceFamilies[matchId].includes(team.group)),
    ]),
  ) as Record<ThirdPlaceMatchId, ReturnType<typeof getThirdPlaceCandidates>>;
}

export function getGroupColor(groupId: GroupId) {
  return groupMap[groupId].color;
}

export function getStageColumns(matchMap: Record<MatchId, DerivedMatch>) {
  return [
    {
      id: "roundOf32",
      label: stageLabels.roundOf32,
      matches: [
        matchMap.M73,
        matchMap.M74,
        matchMap.M75,
        matchMap.M76,
        matchMap.M77,
        matchMap.M78,
        matchMap.M79,
        matchMap.M80,
        matchMap.M81,
        matchMap.M82,
        matchMap.M83,
        matchMap.M84,
        matchMap.M85,
        matchMap.M86,
        matchMap.M87,
        matchMap.M88,
      ],
    },
    {
      id: "roundOf16",
      label: stageLabels.roundOf16,
      matches: [
        matchMap.M89,
        matchMap.M90,
        matchMap.M91,
        matchMap.M92,
        matchMap.M93,
        matchMap.M94,
        matchMap.M95,
        matchMap.M96,
      ],
    },
    {
      id: "quarterFinal",
      label: stageLabels.quarterFinal,
      matches: [matchMap.M97, matchMap.M98, matchMap.M99, matchMap.M100],
    },
    {
      id: "semiFinal",
      label: stageLabels.semiFinal,
      matches: [matchMap.M101, matchMap.M102],
    },
    {
      id: "medal",
      label: "Medallas",
      matches: [matchMap.M103, matchMap.M104],
    },
  ];
}
