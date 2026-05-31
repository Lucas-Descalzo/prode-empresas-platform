// football-data.org v4 — types and fetch client

export type ApiMatchStatus = "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "SUSPENDED" | "POSTPONED" | "CANCELLED" | "AWARDED";

export type ApiMatchWinner = "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;

export interface ApiTeamRef {
  id: number;
  name: string;
  shortName: string;
  tla: string;
}

export interface ApiScore {
  winner: ApiMatchWinner;
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface ApiMatch {
  id: number;
  stage: string;
  group: string | null;
  utcDate: string;
  status: ApiMatchStatus;
  homeTeam: ApiTeamRef;
  awayTeam: ApiTeamRef;
  score: ApiScore;
}

export interface ApiMatchesResponse {
  matches: ApiMatch[];
}

const BASE_URL = "https://api.football-data.org/v4";
const WC_2026_ID = "WC";

function getApiKey(): string {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("FOOTBALL_DATA_API_KEY is not set");
  return key;
}

export async function fetchCompetitionMatches(
  competitionCode: string,
  params: { dateFrom?: string; dateTo?: string; status?: string } = {},
): Promise<ApiMatchesResponse> {
  const url = new URL(`${BASE_URL}/competitions/${competitionCode}/matches`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: { "X-Auth-Token": getApiKey() },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`football-data.org ${response.status}: ${body}`);
  }

  return response.json() as Promise<ApiMatchesResponse>;
}

export function fetchTodayMatches(): Promise<ApiMatchesResponse> {
  const today = new Date().toISOString().slice(0, 10);
  return fetchCompetitionMatches(WC_2026_ID, { dateFrom: today, dateTo: today });
}

export function fetchFinishedMatchesWindow(
  from: string,
  to: string,
): Promise<ApiMatchesResponse> {
  return fetchCompetitionMatches(WC_2026_ID, {
    dateFrom: from,
    dateTo: to,
    status: "FINISHED",
  });
}

// For testing: fetch a past competition (Qatar 2022)
export function fetchQatar2022Matches(): Promise<ApiMatchesResponse> {
  return fetchCompetitionMatches("2000", { status: "FINISHED" });
}
