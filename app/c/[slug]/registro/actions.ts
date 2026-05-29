"use server";

import { redirect } from "next/navigation";

import { isValidCompanyArea } from "@/lib/corporate/area-options";
import { getCorporateClient } from "@/lib/corporate/clients";
import { normalizeDocumentId } from "@/lib/corporate/document-id";
import {
  createSignupLinkParticipant,
  isSignupLinkTokenValid,
} from "@/lib/corporate/db";
import { setParticipantSession } from "@/lib/corporate/session";

export interface SignupActionState {
  error?: string;
  info?: string;
}

export async function signupAction(
  prevState: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const documentIdRaw = String(formData.get("documentId") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  const client = await getCorporateClient(slug);
  if (!client || client.accessMode !== "signup_link") {
    return { error: "Registro no disponible para esta empresa." };
  }

  if (!(await isSignupLinkTokenValid({ companyId: client.id, token }))) {
    return { error: "Este link de alta no esta disponible." };
  }

  if (!firstName || !lastName) {
    return { error: "Ingresa nombre y apellido." };
  }

  if (client.collectsArea) {
    if (!area) {
      return { error: `Selecciona tu ${client.areaLabel.toLowerCase()}.` };
    }

    if (!isValidCompanyArea(client, area)) {
      return { error: `${client.areaLabel} no valida.` };
    }
  }

  const documentId = normalizeDocumentId(documentIdRaw);
  if (!documentId) {
    return { error: "El DNI debe tener 7 u 8 numeros." };
  }

  if (password.length < 8) {
    return { error: "La clave debe tener al menos 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "Las claves no coinciden." };
  }

  const result = await createSignupLinkParticipant({
    companyId: client.id,
    firstName,
    lastName,
    area: client.collectsArea ? area : null,
    documentId,
    password,
  });

  if (result.kind === "existing") {
    return {
      info: "Ya existe una cuenta con ese DNI. Entra desde Mi Prode con tu DNI y tu clave.",
    };
  }

  await setParticipantSession({
    companyId: client.id,
    userId: result.user.id,
  });

  redirect(`/c/${client.slug}/partidos`);
}
