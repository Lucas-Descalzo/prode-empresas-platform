import { describe, expect, it } from "vitest";

import { knockoutMatchOrder } from "@/data/world-cup-2026";
import {
  createInitialFixtureState,
  deriveMatches,
  getThirdPlaceCandidates,
  normalizeFixtureState,
} from "@/lib/world-cup-fixture";
import { scoreFixture } from "@/lib/scoring";
import type { FixtureState } from "@/lib/world-cup-types";

function createReadyBaseState() {
  const initial = createInitialFixtureState();

  return normalizeFixtureState({
    ...initial,
    qualifiedThirdPlaces: getThirdPlaceCandidates(initial.groupOrders)
      .map((team) => team.id)
      .slice(0, 8),
  });
}

function completeWithFirstAvailableWinner(source: FixtureState) {
  const winners: FixtureState["knockoutWinners"] = {};

  for (const matchId of knockoutMatchOrder) {
    const match = deriveMatches({ ...source, knockoutWinners: winners }).matchesById[matchId];
    const winnerId = match.sideA?.id ?? match.sideB?.id;

    if (winnerId) {
      winners[matchId] = winnerId;
    }
  }

  return normalizeFixtureState({
    ...source,
    knockoutWinners: winners,
  });
}

describe("fixture scoring", () => {
  it("scores exact group positions and best thirds for the pre-Mundial block", () => {
    const baseState = createReadyBaseState();
    const score = scoreFixture(baseState, baseState);

    expect(score.groupExactPoints).toBe(96);
    expect(score.topTwoPartialPoints).toBe(0);
    expect(score.bestThirdPoints).toBe(16);
    expect(score.preWorldCupPoints).toBe(112);
    expect(score.total).toBe(112);
    expect(score.scoredUnits).toBe(56);
  });

  it("awards partial credit when the top-2 teams are correct but inverted", () => {
    const baseState = createReadyBaseState();
    const swappedState = normalizeFixtureState({
      ...baseState,
      groupOrders: {
        ...baseState.groupOrders,
        A: [
          baseState.groupOrders.A[1],
          baseState.groupOrders.A[0],
          baseState.groupOrders.A[2],
          baseState.groupOrders.A[3],
        ],
      },
    });

    const score = scoreFixture(swappedState, baseState);

    expect(score.groupExactPoints).toBe(92);
    expect(score.topTwoPartialPoints).toBe(2);
    expect(score.preWorldCupPoints).toBe(110);
  });

  it("scores knockout survival by round sets, not exact match slots", () => {
    const baseState = createReadyBaseState();
    const firstMatch = deriveMatches(baseState).matchesById.M73;
    const officialState = normalizeFixtureState({
      ...baseState,
      knockoutWinners: { M73: firstMatch.sideA!.id },
    });

    const score = scoreFixture(officialState, officialState);

    expect(score.roundOf16Points).toBe(2);
    expect(score.total).toBe(114);
    expect(score.scoredUnits).toBe(57);
    expect(score.pendingUnits).toBe(31);
  });

  it("adds the full eliminatoria block when the complete fixture matches", () => {
    const completedState = completeWithFirstAvailableWinner(createReadyBaseState());
    const score = scoreFixture(completedState, completedState);

    expect(score.roundOf16Points).toBe(32);
    expect(score.quarterFinalPoints).toBe(32);
    expect(score.semiFinalPoints).toBe(24);
    expect(score.finalPoints).toBe(16);
    expect(score.championPoints).toBe(10);
    expect(score.thirdPlaceWinnerPoints).toBe(2);
    expect(score.knockoutPoints).toBe(116);
    expect(score.total).toBe(228);
    expect(score.pendingUnits).toBe(0);
  });
});
