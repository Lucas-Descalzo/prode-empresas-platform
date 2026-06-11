import { NextResponse } from "next/server";

import { getCorporateClient } from "@/lib/corporate/clients";
import {
  upsertFixturePrediction,
  upsertInteractivePrediction,
} from "@/lib/corporate/db";
import { getCurrentParticipant } from "@/lib/corporate/session";
import type { Prediction } from "@/lib/corporate/types";
import { getMatchById } from "@/lib/corporate/match-registry";
import { isSimpleModeLocked } from "@/lib/simple-mode-rules";
import { normalizeFixtureState } from "@/lib/world-cup-fixture";
import type { FixtureState } from "@/lib/world-cup-types";

function isValidPrediction(value: unknown): value is Prediction {
  if (!value || typeof value !== "object") return false;
  const v = value as { kind?: unknown; outcome?: unknown; home?: unknown; away?: unknown };

  if (v.kind === "1X2") {
    return v.outcome === "home" || v.outcome === "draw" || v.outcome === "away";
  }

  if (v.kind === "score") {
    return (
      typeof v.home === "number" &&
      typeof v.away === "number" &&
      Number.isInteger(v.home) &&
      Number.isInteger(v.away) &&
      v.home >= 0 &&
      v.away >= 0 &&
      v.home <= 20 &&
      v.away <= 20
    );
  }

  return false;
}

function isValidFixtureState(value: unknown): value is FixtureState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FixtureState>;
  return (
    typeof candidate.version === "number" &&
    typeof candidate.groupOrders === "object" &&
    typeof candidate.groupMatchPredictions === "object" &&
    typeof candidate.groupPredictionModes === "object" &&
    Array.isArray(candidate.qualifiedThirdPlaces) &&
    typeof candidate.thirdPlaceAssignments === "object" &&
    typeof candidate.knockoutWinners === "object"
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const client = await getCorporateClient(slug);
  if (!client) {
    return NextResponse.json({ error: "company_not_found" }, { status: 404 });
  }

  const participant = await getCurrentParticipant(client.id);
  if (!participant) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (participant.mustChangePassword) {
    return NextResponse.json({ error: "password_change_required" }, { status: 409 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = payload as { matchId?: unknown; prediction?: unknown };

  if (client.gameMode === "simple") {
    if (isSimpleModeLocked(new Date(), client.slug)) {
      return NextResponse.json({ error: "simple_mode_locked" }, { status: 409 });
    }

    const simpleBody = payload as { fixtureState?: unknown };

    if (!isValidFixtureState(simpleBody.fixtureState)) {
      return NextResponse.json({ error: "invalid_fixture_state" }, { status: 400 });
    }

    await upsertFixturePrediction({
      companyId: client.id,
      userId: participant.id,
      fixtureState: normalizeFixtureState(simpleBody.fixtureState),
    });

    return NextResponse.json({ ok: true });
  }

  if (typeof body.matchId !== "string") {
    return NextResponse.json({ error: "invalid_match_id" }, { status: 400 });
  }

  const match = getMatchById(body.matchId);
  if (!match) {
    return NextResponse.json({ error: "match_not_found" }, { status: 404 });
  }

  if (match.lockedAt && new Date() >= match.lockedAt) {
    return NextResponse.json({ error: "match_locked" }, { status: 409 });
  }

  if (!isValidPrediction(body.prediction)) {
    return NextResponse.json({ error: "invalid_prediction" }, { status: 400 });
  }

  await upsertInteractivePrediction({
    companyId: client.id,
    userId: participant.id,
    matchId: body.matchId,
    prediction: body.prediction,
  });

  return NextResponse.json({ ok: true });
}
