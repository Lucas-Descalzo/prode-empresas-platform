import { describe, expect, it } from "vitest";

import {
  SIMPLE_MODE_KNOCKOUT_MAX_POINTS,
  SIMPLE_MODE_PRE_WORLD_CUP_MAX_POINTS,
  SIMPLE_MODE_TOTAL_MAX_POINTS,
  getSimpleModeCountdownLabel,
  getSimpleModeCutoffDate,
  isSimpleModeLocked,
  isSimpleModePredictionComplete,
} from "@/lib/simple-mode-rules";
import {
  createInitialFixtureState,
  deriveMatches,
  getThirdPlaceCandidates,
  normalizeFixtureState,
} from "@/lib/world-cup-fixture";
import { knockoutMatchOrder } from "@/data/world-cup-2026";

describe("simple mode rules", () => {
  it("keeps the documented point caps aligned", () => {
    expect(SIMPLE_MODE_PRE_WORLD_CUP_MAX_POINTS).toBe(112);
    expect(SIMPLE_MODE_KNOCKOUT_MAX_POINTS).toBe(116);
    expect(SIMPLE_MODE_TOTAL_MAX_POINTS).toBe(228);
  });

  it("detects incomplete fixtures until third places and knockout winners are fully selected", () => {
    const initialState = createInitialFixtureState();
    const withThirdPlaces = normalizeFixtureState({
      ...initialState,
      qualifiedThirdPlaces: getThirdPlaceCandidates(initialState.groupOrders)
        .map((team) => team.id)
        .slice(0, 8),
    });

    expect(isSimpleModePredictionComplete(initialState)).toBe(false);
    expect(isSimpleModePredictionComplete(withThirdPlaces)).toBe(false);
  });

  it("detects a complete simple mode fixture once all knockout winners are defined", () => {
    const initialState = createInitialFixtureState();
    const baseState = normalizeFixtureState({
      ...initialState,
      qualifiedThirdPlaces: getThirdPlaceCandidates(initialState.groupOrders)
        .map((team) => team.id)
        .slice(0, 8),
    });
    const winners = {} as typeof baseState.knockoutWinners;

    for (const matchId of knockoutMatchOrder) {
      const match = deriveMatches({
        ...baseState,
        knockoutWinners: winners,
      }).matchesById[matchId];
      const winnerId = match.sideA?.id ?? match.sideB?.id;

      if (winnerId) {
        winners[matchId] = winnerId;
      }
    }

    const completedState = normalizeFixtureState({
      ...baseState,
      knockoutWinners: winners,
    });

    expect(isSimpleModePredictionComplete(completedState)).toBe(true);
  });

  it("locks exactly from the cutoff instant onward", () => {
    const cutoff = getSimpleModeCutoffDate();
    const oneMinuteBefore = new Date(cutoff.getTime() - 60_000);
    const atCutoff = new Date(cutoff.getTime());

    expect(isSimpleModeLocked(oneMinuteBefore)).toBe(false);
    expect(isSimpleModeLocked(atCutoff)).toBe(true);
  });

  it("extends the TM Boxing cutoff until June 12 at 16:00 Argentina time", () => {
    expect(getSimpleModeCutoffDate("tm-boxing").toISOString()).toBe(
      "2026-06-12T19:00:00.000Z",
    );
    expect(isSimpleModeLocked(new Date("2026-06-12T18:59:00Z"), "tm-boxing")).toBe(
      false,
    );
    expect(isSimpleModeLocked(new Date("2026-06-12T19:00:00Z"), "tm-boxing")).toBe(
      true,
    );
  });

  it("returns a closed countdown label once the cutoff passed", () => {
    const afterCutoff = new Date(getSimpleModeCutoffDate().getTime() + 1);

    expect(getSimpleModeCountdownLabel(afterCutoff)).toBe("Predicción cerrada");
  });
});
