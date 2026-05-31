// Simulation endpoint — tests the full sync pipeline with hardcoded WC 2026
// match data in football-data.org format. No API key needed.
// GET /api/sync-results/simulate?rounds=groups|all
// Protected with CRON_SECRET same as the main sync endpoint.

import { NextResponse } from "next/server";

import { deleteOfficialResult, listCompanies } from "@/lib/corporate/db";
import { groupMatchSchedule } from "@/lib/corporate/group-schedule";
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

  // Cleanup: delete all simulated group results from DB
  if (action === "cleanup") {
    const companies = await listCompanies();
    const simpleCompanies = companies.filter((c) => c.gameMode === "simple" && c.status === "active");
    let deleted = 0;
    for (const company of simpleCompanies) {
      for (const match of groupMatchSchedule) {
        await deleteOfficialResult({ companyId: company.id, matchId: match.id });
        deleted++;
      }
    }
    return NextResponse.json({ ok: true, action: "cleanup", deleted });
  }

  const rounds = searchParams.get("rounds") ?? "groups";
  const isDryRun = searchParams.get("dry") !== "0";

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
