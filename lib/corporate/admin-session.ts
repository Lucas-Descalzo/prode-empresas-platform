import { cookies } from "next/headers";

const COOKIE_PREFIX = "fwc26-corp-admin-";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

function cookieName(clientSlug: string): string {
  return `${COOKIE_PREFIX}${clientSlug}`;
}

export async function setAdminSession(clientSlug: string): Promise<void> {
  const jar = await cookies();
  jar.set(cookieName(clientSlug), "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/c/${clientSlug}/admin`,
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearAdminSession(clientSlug: string): Promise<void> {
  const jar = await cookies();
  jar.delete(cookieName(clientSlug));
}

export async function isAdminAuthenticated(clientSlug: string): Promise<boolean> {
  const jar = await cookies();
  return jar.get(cookieName(clientSlug))?.value === "1";
}
