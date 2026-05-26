import { cookies } from "next/headers";

import { getCompanyUserById } from "./db";
import { decodeParticipantSession, encodeParticipantSession } from "./security";
import type { CompanyUserRecord } from "./types";

const COOKIE_NAME = "pep-session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function setParticipantSession(input: {
  companyId: string;
  userId: string;
}): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, encodeParticipantSession(input), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearParticipantSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function readParticipantSession() {
  const jar = await cookies();
  return decodeParticipantSession(jar.get(COOKIE_NAME)?.value);
}

export async function getCurrentParticipant(
  companyId: string,
): Promise<CompanyUserRecord | null> {
  const session = await readParticipantSession();
  if (!session || session.companyId !== companyId) {
    return null;
  }

  return getCompanyUserById(companyId, session.userId);
}
