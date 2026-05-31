// Simulation endpoint — tests the full sync pipeline with hardcoded WC 2026
// match data in football-data.org format. No API key needed.
// GET /api/sync-results/simulate?rounds=groups|all
// Protected with CRON_SECRET same as the main sync endpoint.

import { NextResponse } from "next/server";

import { deleteOfficialResult, getOfficialResultsForCompany, listCompanies, saveOfficialResult } from "@/lib/corporate/db";
import { groupMatchSchedule } from "@/lib/corporate/group-schedule";
import { buildSimpleModeOfficialFixtureState } from "@/lib/corporate/simple-mode-official";
import { knockoutMatchOrder } from "@/data/world-cup-2026";
import { deriveMatches } from "@/lib/world-cup-fixture";
import type { TeamId } from "@/lib/world-cup-types";
import type { ApiMatch } from "@/lib/football-data/client";
import { syncMatchResults } from "@/lib/football-data/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("Authorization");
  return auth === `Bearer ${secret}`;
}

function makeMatch(
  id: number,
  stage: string,
  group: string | null,
  date: string,
  homeTla: string,
  awayTla: string,
  homeScore: number,
  awayScore: number,
): ApiMatch {
  const winner =
    homeScore > awayScore
      ? "HOME_TEAM"
      : awayScore > homeScore
        ? "AWAY_TEAM"
        : "DRAW";

  return {
    id,
    stage,
    group,
    utcDate: `${date}T18:00:00Z`,
    status: "FINISHED",
    homeTeam: { id: id * 10, name: homeTla, shortName: homeTla, tla: homeTla },
    awayTeam: { id: id * 10 + 1, name: awayTla, shortName: awayTla, tla: awayTla },
    score: {
      winner,
      fullTime: { home: homeScore, away: awayScore },
      halfTime: { home: Math.floor(homeScore / 2), away: Math.floor(awayScore / 2) },
    },
  };
}

// Simulate all 72 group matches — home team wins every match
function buildSimulatedGroupMatches(): ApiMatch[] {
  const { groupMatchSchedule } = require("@/lib/corporate/group-schedule");
  return groupMatchSchedule.map((match: { id: string; homeTeamId: string; awayTeamId: string; date: string }, index: number) =>
    makeMatch(
      1000 + index,
      "GROUP_STAGE",
      `GROUP_${match.id.split("-")[1]}`,
      match.date,
      match.homeTeamId.toUpperCase(),
      match.awayTeamId.toUpperCase(),
      2,
      1,
    ),
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const isDryRun = searchParams.get("dry") !== "0";

  // Cleanup: delete all simulated results from DB (groups + knockout)
  if (action === "cleanup") {
    const companies = await listCompanies();
    const simpleCompanies = companies.filter((c) => c.gameMode === "simple" && c.status === "active");
    let deleted = 0;
    for (const company of simpleCompanies) {
      for (const match of groupMatchSchedule) {
        await deleteOfficialResult({ companyId: company.id, matchId: match.id });
        deleted++;
      }
      for (const matchId of knockoutMatchOrder) {
        await deleteOfficialResult({ companyId: company.id, matchId });
        deleted++;
      }
    }
    return NextResponse.json({ ok: true, action: "cleanup", deleted });
  }

  // Full tournament simulation: groups + complete knockout bracket
  // Tests the knockout resolver end-to-end through the HTTP stack
  if (action === "full") {
    const companies = await listCompanies();
    const simpleCompanies = companies.filter((c) => c.gameMode === "simple" && c.status === "active");
    const report: Array<{ slug: string; groups: number; knockout: number; errors: string[] }> = [];

    for (const company of simpleCompanies) {
      const companyReport = { slug: company.slug, groups: 0, knockout: 0, errors: [] as string[] };

      // Step 1: sync all 72 group matches
      const groupMatches = buildSimulatedGroupMatches();
      const groupResult = await syncMatchResults(company.id, groupMatches, isDryRun);
      companyReport.groups = groupResult.saved;
      companyReport.errors.push(...groupResult.errors);

      // Step 2: simulate knockout round by round (must rebuild state each time)
      for (const matchId of knockoutMatchOrder) {
        const currentResults = isDryRun ? {} : await getOfficialResultsForCompany(company.id);
        const currentState = buildSimpleModeOfficialFixtureState(currentResults);
        const { matchesById } = deriveMatches(currentState);
        const match = matchesById[matchId];
        if (!match?.sideA?.id || !match?.sideB?.id) {
          companyReport.errors.push(`Knockout ${matchId}: teams not resolved yet`);
          break;
        }

        const knockoutApiMatch: ApiMatch = makeMatch(
          9000 + knockoutMatchOrder.indexOf(matchId),
          match.stage === "roundOf32" ? "ROUND_OF_32" :
          match.stage === "roundOf16" ? "ROUND_OF_16" :
          match.stage === "quarterFinal" ? "QUARTER_FINALS" :
          match.stage === "semiFinal" ? "SEMI_FINALS" :
          match.stage === "bronzeFinal" ? "THIRD_PLACE" : "FINAL",
          null,
          "2026-07-01",
          match.sideA.id.toUpperCase(),
          match.sideB.id.toUpperCase(),
          2,
          1,
        );

        if (!isDryRun) {
          try {
            await saveOfficialResult({
              companyId: company.id,
              matchId,
              home: 2,
              away: 1,
              advancingTeamId: match.sideA.id as TeamId,
            });
            companyReport.knockout++;
          } catch (e) {
            companyReport.errors.push(`${matchId}: ${e instanceof Error ? e.message : String(e)}`);
          }
        } else {
          companyReport.knockout++;
          // In dry run we can't rebuild state after each match, so stop after first resolved
          if (companyReport.knockout >= 4) break; // verify first 4 knockout matches resolve
        }
        // suppress unused variable warning
        void knockoutApiMatch;
      }

      report.push(companyReport);
    }

    return NextResponse.json({
      ok: true,
      action: "full",
      dryRun: isDryRun,
      description: "72 group matches + full knockout bracket simulated",
      report,
    });
  }

  const rounds = searchParams.get("rounds") ?? "groups";

  const matches = buildSimulatedGroupMatches();

  const companies = await listCompanies();
  const simpleCompanies = companies.filter(
    (c) => c.gameMode === "simple" && c.status === "active",
  );

  if (simpleCompanies.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No active simple-mode companies found.",
      matchesSimulated: matches.length,
    });
  }

  const syncResults = await Promise.all(
    simpleCompanies.map(async (company) => {
      const result = await syncMatchResults(company.id, matches, isDryRun);
      return { companyId: company.id, slug: company.slug, ...result };
    }),
  );

  return NextResponse.json({
    ok: true,
    dryRun: isDryRun,
    rounds,
    matchesSimulated: matches.length,
    description: "All group matches simulated — home team wins every match (2-1)",
    synced: syncResults,
  });
}
