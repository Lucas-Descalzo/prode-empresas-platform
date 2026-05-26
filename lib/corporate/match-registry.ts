import { knockoutSlots } from "@/data/world-cup-2026";
import type { GroupId, ParticipantRef, StageId, TeamId } from "@/lib/world-cup-types";
import { groupMatchSchedule } from "./group-schedule";
import type { PredictionStage } from "./types";

export interface UnifiedMatch {
  id: string;
  stage: PredictionStage;
  groupId?: GroupId;
  homeTeamId?: TeamId;
  awayTeamId?: TeamId;
  homeRef?: ParticipantRef;
  awayRef?: ParticipantRef;
  date: string;
  lockedAt: Date;
  city?: string;
  venue?: string;
}

function dateWithKickoff(dateStr: string): Date {
  return new Date(`${dateStr}T15:00:00Z`);
}

const groupMatches: UnifiedMatch[] = groupMatchSchedule.map((match) => ({
  id: match.id,
  stage: "groups" as PredictionStage,
  groupId: match.groupId,
  homeTeamId: match.homeTeamId,
  awayTeamId: match.awayTeamId,
  date: match.date,
  lockedAt: dateWithKickoff(match.date),
}));

const knockoutMatches: UnifiedMatch[] = knockoutSlots.map((slot) => ({
  id: slot.matchId,
  stage: slot.stage as StageId,
  homeRef: slot.sideA,
  awayRef: slot.sideB,
  date: slot.meta.date,
  lockedAt: dateWithKickoff(slot.meta.date),
  city: slot.meta.city,
  venue: slot.meta.venue,
}));

export const allMatches: UnifiedMatch[] = [...groupMatches, ...knockoutMatches];

const matchById = new Map<string, UnifiedMatch>(
  allMatches.map((match) => [match.id, match]),
);

export function getMatchById(id: string): UnifiedMatch | null {
  return matchById.get(id) ?? null;
}

export function getMatchesByStage(stage: PredictionStage): UnifiedMatch[] {
  return allMatches.filter((match) => match.stage === stage);
}

export function getGroupMatchesByGroup(groupId: GroupId): UnifiedMatch[] {
  return groupMatches.filter((match) => match.groupId === groupId);
}
