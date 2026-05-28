import type { FixtureState } from "@/lib/world-cup-types";
import type { StageId, TeamId } from "@/lib/world-cup-types";

export type PredictionMode = "1X2" | "score";
export type PredictionStage = "groups" | StageId;
export type CompanyGameMode = "simple" | "interactive";
export type CompanyAccessMode =
  | "invited_only"
  | "corporate_domain_signup"
  | "signup_link";

export interface CompanyBranding {
  primary: string;
  primaryDark: string;
  primaryHover: string;
  background: string;
  foreground: string;
  muted: string;
  line: string;
  contrastOnPrimary: string;
  logoText?: string | null;
  logoUrl?: string | null;
}

export interface CompanyRecord {
  id: string;
  slug: string;
  displayName: string;
  shortName: string;
  tagline: string;
  gameMode: CompanyGameMode;
  accessMode: CompanyAccessMode;
  allowedEmailDomain: string | null;
  collectsArea: boolean;
  areaLabel: string;
  status: "draft" | "active" | "paused";
  highlightedTeamIds: TeamId[];
  predictionRules: Record<PredictionStage, PredictionMode>;
  branding: CompanyBranding;
  domains: string[];
  primaryDomain: string | null;
}

export type CorporateClient = CompanyRecord;

export interface CompanyUserRecord {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  documentId: string | null;
  area: string | null;
  role: "participant" | "operator";
  status: "invited" | "active" | "disabled";
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export type Prediction =
  | { kind: "1X2"; outcome: "home" | "draw" | "away" }
  | { kind: "score"; home: number; away: number };

export interface CompanyFixturePrediction {
  fixtureState: FixtureState;
  updatedAt: string;
}

export interface CompanyOfficialResult {
  companyId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  advancingTeamId: TeamId | null;
  savedAt: string;
}

export interface CompanySignupLinkRecord {
  companyId: string;
  status: "active" | "inactive";
  token: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}
