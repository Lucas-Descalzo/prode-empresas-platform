"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCorporateClient } from "@/lib/corporate/clients";
import {
  deleteOfficialResult,
  resetCompanyUserPassword,
  saveOfficialResult,
  setCompanyUserStatus,
  updateCompanySignupLinkStatus,
} from "@/lib/corporate/db";
import { getMatchById } from "@/lib/corporate/match-registry";
import { inferAdvancingTeamFromResult } from "@/lib/corporate/simple-mode-official";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  isAdminConfigured,
  isValidAdminSession,
  shouldUseSecureAdminCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export interface AdminLoginState {
  error?: string;
}

async function isGlobalAdminAuthenticated() {
  const jar = await cookies();
  return isValidAdminSession(jar.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function adminLoginAction(
  prevState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  const client = await getCorporateClient(slug);
  if (!client) {
    return { error: "Empresa no encontrada." };
  }

  if (!isAdminConfigured()) {
    return { error: "Configura ADMIN_PASSWORD para usar el panel operador." };
  }

  if (!verifyAdminPassword(password)) {
    return { error: "Contrasena incorrecta." };
  }

  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureAdminCookie(),
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  redirect(`/c/${client.slug}/admin`);
}

export async function adminLogoutAction(slug: string): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_SESSION_COOKIE);
  redirect(`/c/${slug}/admin`);
}

export interface SaveResultState {
  matchId?: string;
  message?: string;
  error?: string;
}

export async function saveResultAction(
  prevState: SaveResultState,
  formData: FormData,
): Promise<SaveResultState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const matchId = String(formData.get("matchId") ?? "").trim();
  const homeStr = String(formData.get("home") ?? "");
  const awayStr = String(formData.get("away") ?? "");
  const advancingTeamIdValue = String(formData.get("advancingTeamId") ?? "").trim();

  const client = await getCorporateClient(slug);
  if (!client) {
    return { error: "Empresa no encontrada." };
  }

  if (!(await isGlobalAdminAuthenticated())) {
    return { error: "No autorizado." };
  }

  const match = getMatchById(matchId);
  if (!match) {
    return { error: "Partido no encontrado." };
  }

  const home = Number.parseInt(homeStr, 10);
  const away = Number.parseInt(awayStr, 10);
  if (
    !Number.isFinite(home) ||
    !Number.isFinite(away) ||
    home < 0 ||
    away < 0 ||
    home > 20 ||
    away > 20
  ) {
    return { matchId, error: "Resultado invalido." };
  }

  const inferredAdvancingTeamId = inferAdvancingTeamFromResult(
    match.homeTeamId,
    match.awayTeamId,
    {
      homeScore: home,
      awayScore: away,
      advancingTeamId: advancingTeamIdValue || null,
    },
  );

  if (match.stage !== "groups" && home === away && !inferredAdvancingTeamId) {
    return { matchId, error: "Elige quien avanza en el empate." };
  }

  await saveOfficialResult({
    companyId: client.id,
    matchId,
    home,
    away,
    advancingTeamId: inferredAdvancingTeamId,
  });

  revalidatePath(`/c/${client.slug}/admin`);
  revalidatePath(`/c/${client.slug}/liga`);
  return { matchId, message: "Guardado · ranking actualizado" };
}

export async function clearResultAction(
  prevState: SaveResultState,
  formData: FormData,
): Promise<SaveResultState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const matchId = String(formData.get("matchId") ?? "").trim();

  const client = await getCorporateClient(slug);
  if (!client) {
    return { error: "Empresa no encontrada." };
  }

  if (!(await isGlobalAdminAuthenticated())) {
    return { error: "No autorizado." };
  }

  await deleteOfficialResult({
    companyId: client.id,
    matchId,
  });

  revalidatePath(`/c/${client.slug}/admin`);
  revalidatePath(`/c/${client.slug}/liga`);
  return { matchId, message: "Resultado borrado" };
}

export interface SignupLinkState {
  success?: string;
  error?: string;
}

export async function updateSignupLinkStatusAction(
  prevState: SignupLinkState,
  formData: FormData,
): Promise<SignupLinkState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  const client = await getCorporateClient(slug);
  if (!client) {
    return { error: "Empresa no encontrada." };
  }

  if (!(await isGlobalAdminAuthenticated())) {
    return { error: "No autorizado." };
  }

  if (status !== "active" && status !== "inactive") {
    return { error: "Estado invalido." };
  }

  await updateCompanySignupLinkStatus({
    companyId: client.id,
    status,
  });

  revalidatePath(`/c/${client.slug}/admin`);
  revalidatePath(`/c/${client.slug}/registro`);

  return {
    success:
      status === "active"
        ? "Link de alta activado."
        : "Link de alta desactivado.",
  };
}

export interface ParticipantAdminState {
  userId?: string;
  success?: string;
  error?: string;
  temporaryPassword?: string;
}

export async function resetParticipantPasswordAction(
  prevState: ParticipantAdminState,
  formData: FormData,
): Promise<ParticipantAdminState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();

  const client = await getCorporateClient(slug);
  if (!client) {
    return { error: "Empresa no encontrada." };
  }

  if (!(await isGlobalAdminAuthenticated())) {
    return { error: "No autorizado." };
  }

  if (!userId) {
    return { error: "Faltan datos del participante." };
  }

  const temporaryPassword = await resetCompanyUserPassword({
    companyId: client.id,
    userId,
  });

  revalidatePath(`/c/${client.slug}/admin`);

  return {
    userId,
    success: `Clave temporal regenerada para ${fullName}.`,
    temporaryPassword,
  };
}

export async function updateParticipantStatusAction(
  prevState: ParticipantAdminState,
  formData: FormData,
): Promise<ParticipantAdminState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  const client = await getCorporateClient(slug);
  if (!client) {
    return { error: "Empresa no encontrada." };
  }

  if (!(await isGlobalAdminAuthenticated())) {
    return { error: "No autorizado." };
  }

  if (status !== "active" && status !== "disabled") {
    return { error: "Estado invalido." };
  }

  await setCompanyUserStatus({
    companyId: client.id,
    userId,
    status,
  });

  revalidatePath(`/c/${client.slug}/admin`);
  revalidatePath(`/c/${client.slug}/liga`);
  revalidatePath(`/c/${client.slug}/partidos`);

  return {
    userId,
    success:
      status === "disabled"
        ? `${fullName} fue dado de baja.`
        : `${fullName} fue reactivado.`,
  };
}
