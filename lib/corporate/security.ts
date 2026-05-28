import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const HASH_BYTES = 64;

function getSessionSecret() {
  return (
    process.env.SESSION_SECRET ??
    process.env.SUPABASE_JWT_SECRET ??
    process.env.POSTGRES_PASSWORD ??
    ""
  );
}

export function isSessionSecretConfigured() {
  return Boolean(getSessionSecret());
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildCompanySignupToken(companyId: string) {
  if (!isSessionSecretConfigured()) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return createHmac("sha256", getSessionSecret())
    .update(`signup-link:${companyId}`)
    .digest("base64url");
}

export function hashCompanySignupToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  const normalized = password.trim();
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(normalized, salt, HASH_BYTES).toString("hex");

  return { salt, hash };
}

export function verifyPassword(
  password: string,
  expectedSalt: string,
  expectedHash: string,
) {
  const derivedHash = scryptSync(password.trim(), expectedSalt, HASH_BYTES);
  const storedHash = Buffer.from(expectedHash, "hex");

  if (derivedHash.length !== storedHash.length) {
    return false;
  }

  return timingSafeEqual(derivedHash, storedHash);
}

export interface ParticipantSessionPayload {
  companyId: string;
  userId: string;
}

function signPayload(payload: string) {
  const secret = getSessionSecret();
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeParticipantSession(payload: ParticipantSessionPayload) {
  const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(serialized);
  return `${serialized}.${signature}`;
}

export function decodeParticipantSession(
  token: string | undefined,
): ParticipantSessionPayload | null {
  if (!token || !isSessionSecretConfigured()) {
    return null;
  }

  const [serialized, signature] = token.split(".");
  if (!serialized || !signature) {
    return null;
  }

  const expected = signPayload(serialized);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const json = Buffer.from(serialized, "base64url").toString("utf8");
    return JSON.parse(json) as ParticipantSessionPayload;
  } catch {
    return null;
  }
}

export function generateTemporaryPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}
