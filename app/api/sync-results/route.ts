import { NextResponse } from "next/server";

import { listCompanies } from "@/lib/corporate/db";
import { fetchFinishedMatchesWindow, fetchQatar2022Matches } from "@/lib/football-data/client";
import { syncMatchResults } from "@/lib/football-data/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tournament window: 11 jun – 19 jul 2026
const TOURNAMENT_START = "2026-06-11";
const TOURNAMENT_END = "2026-07-19";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("Authorization");
  return auth === `Bearer ${secret}`;
}

// GET /api/sync-results
// Called by Vercel Cron every 10 minutes.
// Also accepts ?dry=1 for dry runs and ?test=qatar2022 for validation.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const isDryRun = searchParams.get("dry") === "1";
  const testMode = searchParams.get("test");

  try {
    // Fetch matches from the API
    let matches;

    if (testMode === "qatar2022") {
      // Validation mode: use Qatar 2022 completed data to test the full pipeline
      const response = await fetchQatar2022Matches();
      matches = response.matches;
    } else {
      // Production: fetch a 3-day window (yesterday + today + tomorrow)
      // to catch any matches we may have missed due to cron timing
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 1);
      const to = new Date(today);
      to.setDate(today.getDate() + 1);

      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);

      // Skip API call if outside tournament window
      if (fromStr > TOURNAMENT_END || toStr < TOURNAMENT_START) {
        return NextResponse.json({
          ok: true,
          message: "Outside tournament window, nothing to sync.",
        });
      }

      const response = await fetchFinishedMatchesWindow(fromStr, toStr);
      matches = response.matches;
    }

    if (matches.length === 0) {
      return NextResponse.json({ ok: true, synced: [], message: "No finished matches found." });
    }

    // Sync results for each active simple-mode company
    const companies = await listCompanies();
    const simpleCompanies = companies.filter((c) => c.gameMode === "simple" && c.status === "active");

    const syncResults = await Promise.all(
      simpleCompanies.map(async (company) => {
        const result = await syncMatchResults(company.id, matches, isDryRun);
        return { companyId: company.id, slug: company.slug, ...result };
      }),
    );

    return NextResponse.json({
      ok: true,
      dryRun: isDryRun,
      testMode: testMode ?? null,
      matchesFromApi: matches.length,
      synced: syncResults,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sync-results]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
