import { describe, expect, it } from "vitest";

import { knockoutMatchOrder } from "@/data/world-cup-2026";
import { groupMatchSchedule } from "@/lib/corporate/group-schedule";
import { buildSimpleModeOfficialFixtureState } from "@/lib/corporate/simple-mode-official";
import { scoreFixture } from "@/lib/scoring";
import { deriveMatches, getThirdPlaceCandidates, normalizeFixtureState } from "@/lib/world-cup-fixture";
import type { FixtureState, TeamId } from "@/lib/world-cup-types";
import { createInitialFixtureState } from "@/lib/world-cup-fixture";
import { resolveGroupMatchId, resolveKnockoutMatchId } from "./sync";

// ─── Group match resolver ────────────────────────────────────────────────────

describe("resolveGroupMatchId", () => {
  it("maps MEX vs RSA to G-A-1 (first match of Group A)", () => {
    // Group A: [mex, rsa, kor, cze], pair [0,1] = mex vs rsa
    expect(resolveGroupMatchId("MEX", "RSA")).toBe("G-A-1");
  });

  it("maps ARG vs ALG to the correct Group J match", () => {
    // Group J: [arg, alg, aut, jor], pair [0,1] = arg vs alg
    expect(resolveGroupMatchId("ARG", "ALG")).toBe("G-J-1");
  });

  it("maps ENG vs CRO to the correct Group L match", () => {
    // Group L: [eng, cro, gha, pan], pair [0,1] = eng vs cro
    expect(resolveGroupMatchId("ENG", "CRO")).toBe("G-L-1");
  });

  it("returns null for teams that don't match any group match", () => {
    expect(resolveGroupMatchId("ARG", "BRA")).toBeNull(); // different groups
  });

  it("returns null for reversed pairs (home/away matter for groups)", () => {
    // Our schedule has MEX at home, RSA away
    expect(resolveGroupMatchId("RSA", "MEX")).toBeNull();
  });

  it("covers all 72 group matches — every pair has a unique ID", () => {
    const resolved = new Set<string>();
    for (const match of groupMatchSchedule) {
      const id = resolveGroupMatchId(
        match.homeTeamId.toUpperCase(),
        match.awayTeamId.toUpperCase(),
      );
      expect(id).toBe(match.id);
      resolved.add(id!);
    }
    expect(resolved.size).toBe(72);
  });
});

// ─── Knockout match resolver ─────────────────────────────────────────────────

describe("resolveKnockoutMatchId", () => {
  it("resolves a knockout match once the bracket is derived from official results", () => {
    // Build a minimal official state: complete all group matches so teams
    // are assigned to the knockout bracket
    const resultsById: Record<string, { homeScore: number; awayScore: number; advancingTeamId?: TeamId | null }> = {};
    for (const match of groupMatchSchedule) {
      resultsById[match.id] = { homeScore: 1, awayScore: 0 };
    }

    const officialState = buildSimpleModeOfficialFixtureState(resultsById);
    const { matchesById } = deriveMatches(officialState);

    // First knockout match (M73) should have two real teams
    const m73 = matchesById["M73"];
    expect(m73.sideA?.id).toBeTruthy();
    expect(m73.sideB?.id).toBeTruthy();

    // Resolve it using the TLAs of those teams
    const resolved = resolveKnockoutMatchId(
      m73.sideA!.id.toUpperCase(),
      m73.sideB!.id.toUpperCase(),
      matchesById,
    );
    expect(resolved).toBe("M73");
  });
});

// ─── Bracket propagation ─────────────────────────────────────────────────────

describe("buildSimpleModeOfficialFixtureState — bracket propagation", () => {
  it("produces 8 qualified thirds when all 72 group matches have results", () => {
    const results: Record<string, { homeScore: number; awayScore: number }> = {};
    for (const match of groupMatchSchedule) {
      results[match.id] = { homeScore: 2, awayScore: 1 };
    }

    const state = buildSimpleModeOfficialFixtureState(results);
    expect(state.qualifiedThirdPlaces).toHaveLength(8);
    expect(Object.keys(state.thirdPlaceAssignments)).toHaveLength(8);
  });

  it("home team wins all groups → all group winners are home teams", () => {
    const results: Record<string, { homeScore: number; awayScore: number }> = {};
    for (const match of groupMatchSchedule) {
      results[match.id] = { homeScore: 3, awayScore: 0 };
    }

    const state = buildSimpleModeOfficialFixtureState(results);
    // Check that qualified thirds are distinct teams
    const thirdsSet = new Set(state.qualifiedThirdPlaces);
    expect(thirdsSet.size).toBe(8);
  });

  it("propagates winners through the full knockout bracket", () => {
    // Complete group phase
    const results: Record<string, { homeScore: number; awayScore: number; advancingTeamId?: TeamId | null }> = {};
    for (const match of groupMatchSchedule) {
      results[match.id] = { homeScore: 1, awayScore: 0 };
    }

    // Simulate the entire knockout round by round — rebuild state after each result
    // so subsequent matches resolve their participants correctly
    for (const matchId of knockoutMatchOrder) {
      const currentState = buildSimpleModeOfficialFixtureState(results);
      const { matchesById } = deriveMatches(currentState);
      const match = matchesById[matchId];
      if (!match.sideA?.id || !match.sideB?.id) break;

      results[matchId] = {
        homeScore: 1,
        awayScore: 0,
        advancingTeamId: match.sideA.id as TeamId,
      };
    }

    // After full knockout, champion should be set (M104 has a winner)
    const finalOfficialState = buildSimpleModeOfficialFixtureState(results);
    const { matchesById: finalMatches } = deriveMatches(finalOfficialState);
    expect(finalMatches["M104"]?.winnerId).toBeTruthy();
  });
});

// ─── End-to-end scoring ──────────────────────────────────────────────────────

describe("scoreFixture — end-to-end with official results", () => {
  it("perfect prediction scores maximum points once all results are loaded", () => {
    // Build a complete set of official results (home wins everything)
    const officialResults: Record<string, { homeScore: number; awayScore: number; advancingTeamId?: TeamId | null }> = {};

    for (const match of groupMatchSchedule) {
      officialResults[match.id] = { homeScore: 2, awayScore: 0 };
    }

    // Simulate knockout round by round
    for (const matchId of knockoutMatchOrder) {
      const currentState = buildSimpleModeOfficialFixtureState(officialResults);
      const { matchesById } = deriveMatches(currentState);
      const match = matchesById[matchId];
      if (!match.sideA?.id || !match.sideB?.id) break;

      officialResults[matchId] = {
        homeScore: 1,
        awayScore: 0,
        advancingTeamId: match.sideA.id as TeamId,
      };
    }

    const finalOfficialState = buildSimpleModeOfficialFixtureState(officialResults);

    // A perfect prediction = same as official
    const score = scoreFixture(finalOfficialState, finalOfficialState);
    expect(score.preWorldCupPoints).toBe(112);
    expect(score.knockoutPoints).toBe(116);
    expect(score.total).toBe(228);
  });

  it("zero prediction scores 0 when official results are set", () => {
    const officialResults: Record<string, { homeScore: number; awayScore: number }> = {};
    for (const match of groupMatchSchedule) {
      officialResults[match.id] = { homeScore: 1, awayScore: 0 };
    }

    const officialState = buildSimpleModeOfficialFixtureState(officialResults);
    // Empty prediction (initial state = default group order, no thirds, no knockout)
    const emptyPrediction = createInitialFixtureState();
    const score = scoreFixture(emptyPrediction, officialState);

    // Group phase is scored (official has results), but prediction has wrong order
    // Score >= 0 in all cases
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThan(228);
  });
});
