"use server";

import { redirect } from "next/navigation";

import { getCorporateClient } from "@/lib/corporate/clients";
import {
  authenticateCompanyUser,
  changeCompanyUserPassword,
} from "@/lib/corporate/db";
import {
  clearParticipantSession,
  setParticipantSession,
} from "@/lib/corporate/session";

export interface LoginActionState {
  error?: string;
}

export async function loginAction(
  prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  const client = await getCorporateClient(slug);
  if (!client) {
    return { error: "Empresa no encontrada." };
  }

  if (!identifier || !password) {
    return {
      error:
        client.accessMode === "signup_link"
          ? "Ingresa tu DNI y tu clave."
          : "Ingresá tu email y tu contraseña.",
    };
  }

  const user = await authenticateCompanyUser({
    companyId: client.id,
    accessMode: client.accessMode,
    identifier,
    password,
  });

  if (!user) {
    return {
      error:
        client.accessMode === "signup_link"
          ? "DNI o clave incorrectos."
          : "Email o contraseña incorrectos.",
    };
  }

  await setParticipantSession({
    companyId: client.id,
    userId: user.id,
  });

  redirect(`/c/${client.slug}/partidos`);
}

export interface ChangePasswordState {
  error?: string;
}

export async function changePasswordAction(
  prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const companyId = String(formData.get("companyId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  const client = await getCorporateClient(slug);
  if (!client || client.id !== companyId) {
    return { error: "Empresa no encontrada." };
  }

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  await changeCompanyUserPassword({
    companyId,
    userId,
    password,
  });

  redirect(`/c/${slug}/partidos`);
}

export async function logoutAction(slug: string): Promise<void> {
  await clearParticipantSession();
  redirect(`/c/${slug}`);
}
