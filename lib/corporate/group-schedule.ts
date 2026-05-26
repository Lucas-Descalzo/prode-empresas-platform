import { groups } from "@/data/world-cup-2026";
import type { GroupId, TeamId } from "@/lib/world-cup-types";

export interface GroupMatch {
  id: string;
  groupId: GroupId;
  matchNumber: 1 | 2 | 3 | 4 | 5 | 6;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  date: string;
  round: 1 | 2 | 3;
}

const ROUND_PAIRS: Array<[number, number]> = [
  [0, 1],
  [2, 3],
  [0, 2],
  [3, 1],
  [3, 0],
  [1, 2],
];

const ROUND_BY_INDEX: Array<1 | 2 | 3> = [1, 1, 2, 2, 3, 3];

const ROUND_DATES: Record<1 | 2 | 3, string[]> = {
  1: [
    "2026-06-11",
    "2026-06-12",
    "2026-06-13",
    "2026-06-14",
    "2026-06-15",
    "2026-06-16",
  ],
  2: [
    "2026-06-18",
    "2026-06-19",
    "2026-06-20",
    "2026-06-21",
    "2026-06-22",
  ],
  3: [
    "2026-06-23",
    "2026-06-24",
    "2026-06-25",
    "2026-06-26",
    "2026-06-27",
  ],
};

function buildScheduleForGroup(groupId: GroupId, teams: TeamId[]): GroupMatch[] {
  return ROUND_PAIRS.map((pair, index) => {
    const round = ROUND_BY_INDEX[index];
    const matchNumber = (index + 1) as GroupMatch["matchNumber"];
    const groupOrder = "ABCDEFGHIJKL".indexOf(groupId);
    const dates = ROUND_DATES[round];
    const dayIndex = (groupOrder + index) % dates.length;
    return {
      id: `G-${groupId}-${matchNumber}`,
      groupId,
      matchNumber,
      homeTeamId: teams[pair[0]],
      awayTeamId: teams[pair[1]],
      date: dates[dayIndex],
      round,
    };
  });
}

export const groupMatchSchedule: GroupMatch[] = groups.flatMap((group) =>
  buildScheduleForGroup(group.id, group.teams),
);

export function getGroupMatchById(id: string): GroupMatch | null {
  return groupMatchSchedule.find((match) => match.id === id) ?? null;
}
