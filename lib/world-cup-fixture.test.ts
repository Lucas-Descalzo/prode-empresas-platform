import { describe, expect, it } from "vitest";

import { knockoutMeta, teamMap, thirdPlaceFamilies } from "@/data/world-cup-2026";
import {
  createInitialFixtureState,
  deriveMatches,
  getGroupMatchDefinitions,
  getGroupTableRows,
  getThirdPlaceCandidates,
  normalizeFixtureState,
  suggestThirdAssignments,
} from "@/lib/world-cup-fixture";
import { decodeFixtureState, encodeFixtureState } from "@/lib/world-cup-state";

describe("world cup fixture engine", () => {
  it("suggests eight unique third-place assignments compatible with official slot families", () => {
    const initialState = createInitialFixtureState();
    const selectedThirds = getThirdPlaceCandidates(initialState.groupOrders)
      .map((team) => team.id)
      .slice(0, 8);

    const assignments = suggestThirdAssignments(selectedThirds);
    const assignedTeams = Object.values(assignments);

    expect(Object.keys(assignments)).toHaveLength(8);
    expect(new Set(assignedTeams).size).toBe(8);

    for (const [matchId, teamId] of Object.entries(assignments)) {
      expect(thirdPlaceFamilies[matchId as keyof typeof thirdPlaceFamilies]).toContain(
        teamMap[teamId].group,
      );
    }
  });

  it("uses the official third-place matrix independently of selection order", () => {
    const initialState = createInitialFixtureState();
    const selectedThirds = getThirdPlaceCandidates(initialState.groupOrders)
      .map((team) => team.id)
      .slice(0, 8);
    const reversedThirds = [...selectedThirds].reverse();

    const assignments = suggestThirdAssignments(selectedThirds);
    const reversedAssignments = suggestThirdAssignments(reversedThirds);

    expect(reversedAssignments).toEqual(assignments);
    expect(teamMap[assignments.M79!].group).toBe("H");
    expect(teamMap[assignments.M85!].group).toBe("G");
    expect(teamMap[assignments.M81!].group).toBe("B");
    expect(teamMap[assignments.M74!].group).toBe("C");
    expect(teamMap[assignments.M82!].group).toBe("A");
    expect(teamMap[assignments.M77!].group).toBe("F");
    expect(teamMap[assignments.M87!].group).toBe("D");
    expect(teamMap[assignments.M80!].group).toBe("E");
  });

  it("ignores manual third-place overrides and keeps the official matrix assignment", () => {
    const initialState = createInitialFixtureState();
    const selectedThirds = getThirdPlaceCandidates(initialState.groupOrders)
      .map((team) => team.id)
      .slice(0, 8);

    const normalized = normalizeFixtureState({
      ...initialState,
      qualifiedThirdPlaces: selectedThirds,
      thirdPlaceAssignments: {
        M79: selectedThirds[0],
      },
    });

    expect(teamMap[normalized.thirdPlaceAssignments.M79!].group).toBe("H");
  });

  it("normalizes legacy states without group match predictions", () => {
    const initial = createInitialFixtureState();
    const legacyState = {
      version: 1,
      groupOrders: initial.groupOrders,
      qualifiedThirdPlaces: [],
      thirdPlaceAssignments: {},
      knockoutWinners: {},
    };

    const normalized = normalizeFixtureState(legacyState);

    expect(normalized.groupMatchPredictions).toEqual({});
    expect(normalized.groupPredictionModes).toEqual({});
    expect(normalized.groupOrders.A).toEqual(initial.groupOrders.A);
  });

  it("calculates group tables from winner and draw predictions", () => {
    const initial = createInitialFixtureState();
    const normalized = normalizeFixtureState({
      ...initial,
      groupPredictionModes: { A: "matches" },
      groupMatchPredictions: {
        "A-1": "home",
        "A-2": "away",
        "A-3": "draw",
        "A-4": "away",
        "A-5": "home",
        "A-6": "draw",
      },
    });

    expect(getGroupMatchDefinitions("A").map((match) => match.id)).toEqual([
      "A-1",
      "A-2",
      "A-3",
      "A-4",
      "A-5",
      "A-6",
    ]);
    expect(normalized.groupOrders.A).toEqual(["mex", "cze", "kor", "rsa"]);
    expect(
      getGroupTableRows("A", normalized.groupMatchPredictions).map((row) => [
        row.teamId,
        row.played,
        row.points,
      ]),
    ).toEqual([
      ["mex", 3, 7],
      ["rsa", 3, 1],
      ["kor", 3, 2],
      ["cze", 3, 6],
    ]);
  });

  it("removes third-place selections that stop being third after a group reorder", () => {
    const initialState = createInitialFixtureState();
    const formerThird = initialState.groupOrders.A[2];

    const loadedState = normalizeFixtureState({
      ...initialState,
      qualifiedThirdPlaces: [formerThird],
    });

    const nextGroupOrder = [...initialState.groupOrders.A];
    [nextGroupOrder[2], nextGroupOrder[3]] = [nextGroupOrder[3], nextGroupOrder[2]];

    const normalized = normalizeFixtureState({
      ...loadedState,
      groupOrders: {
        ...loadedState.groupOrders,
        A: nextGroupOrder,
      },
    });

    expect(normalized.qualifiedThirdPlaces).not.toContain(formerThird);
  });

  it("invalidates downstream winners when a source participant changes", () => {
    const initialState = createInitialFixtureState();
    const withWinner = normalizeFixtureState({
      ...initialState,
      knockoutWinners: {
        M73: initialState.groupOrders.A[1],
      },
    });

    const changedA = [...withWinner.groupOrders.A];
    [changedA[1], changedA[2]] = [changedA[2], changedA[1]];

    const normalized = normalizeFixtureState({
      ...withWinner,
      groupOrders: {
        ...withWinner.groupOrders,
        A: changedA,
      },
    });

    expect(normalized.knockoutWinners.M73).toBeUndefined();
  });

  it("round-trips the share payload safely", () => {
    const state = normalizeFixtureState({
      ...createInitialFixtureState(),
      qualifiedThirdPlaces: getThirdPlaceCandidates(createInitialFixtureState().groupOrders)
        .map((team) => team.id)
        .slice(0, 8),
    });

    const encoded = encodeFixtureState(state);
    const decoded = decodeFixtureState(encoded);

    expect(decoded).toEqual(state);
  });

  it("keeps official metadata for the final", () => {
    expect(knockoutMeta.M104.date).toBe("2026-07-19");
    expect(knockoutMeta.M104.venue).toContain("New York New Jersey");
  });

  it("derives placeholder labels before the bracket is completed", () => {
    const matches = deriveMatches(createInitialFixtureState()).matchesById;

    expect(matches.M89.sideALabel).toContain("Ganador");
    expect(matches.M103.sideALabel).toContain("Perdedor");
  });
});
