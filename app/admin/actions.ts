"use server";

import { revalidatePath } from "next/cache";

import {
  createCompany,
  importCompanyUsers,
  resetCompanyUserPassword,
  updateCompanySettings,
} from "@/lib/corporate/db";
import type { CompanyAccessMode, CompanyGameMode } from "@/lib/corporate/types";

export interface CreateCompanyActionState {
  error?: string;
  success?: string;
  createdSlug?: string;
}

export interface ImportUsersActionState {
  error?: string;
  success?: string;
  credentials?: Array<{
    fullName: string;
    email: string;
    temporaryPassword: string;
  }>;
}

export interface ResetUserPasswordState {
  error?: string;
  success?: string;
  temporaryPassword?: string;
}

export interface UpdateCompanyActionState {
  error?: string;
  success?: string;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeHexColor(value: string, fallback: string) {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

function shadeHex(hex: string, amount: number) {
  const safe = normalizeHexColor(hex, "#0f4c81").slice(1);
  const delta = Math.round(255 * amount);
  const channels = [0, 2, 4].map((index) => {
    const raw = Number.parseInt(safe.slice(index, index + 2), 16);
    const value = Math.max(0, Math.min(255, raw + delta));
    return value.toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

function isDarkHex(hex: string) {
  const safe = normalizeHexColor(hex, "#0f4c81").slice(1);
  const red = Number.parseInt(safe.slice(0, 2), 16);
  const green = Number.parseInt(safe.slice(2, 4), 16);
  const blue = Number.parseInt(safe.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance < 0.45;
}

function parseImportedUsers(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const parts = line
      .split(/[,\t;]/)
      .map((part) => part.trim())
      .filter(Boolean);

    return {
      fullName: parts[0] ?? "",
      email: parts[1] ?? "",
      area: parts[2] ?? null,
    };
  });
}

function buildBranding({
  primaryColor,
  backgroundColor,
  logoText,
  logoUrl,
}: {
  primaryColor: string;
  backgroundColor: string;
  logoText: string | null;
  logoUrl: string | null;
}) {
  const darkBackground = isDarkHex(backgroundColor);

  return {
    primary: primaryColor,
    primaryDark: shadeHex(primaryColor, -0.18),
    primaryHover: shadeHex(primaryColor, -0.08),
    background: backgroundColor,
    foreground: darkBackground ? "#f5f7fb" : "#1b1d24",
    muted: darkBackground ? "rgba(245,247,251,0.72)" : "#5d6470",
    line: darkBackground ? "rgba(255,255,255,0.14)" : "rgba(27,29,36,0.14)",
    contrastOnPrimary: darkBackground ? "#111317" : "#ffffff",
    logoText,
    logoUrl,
  };
}

export async function createCompanyAction(
  prevState: CreateCompanyActionState,
  formData: FormData,
): Promise<CreateCompanyActionState> {
  try {
    const displayName = String(formData.get("displayName") ?? "").trim();
    const shortName = String(formData.get("shortName") ?? "").trim();
    const slug = normalizeSlug(String(formData.get("slug") ?? ""));
    const tagline = String(formData.get("tagline") ?? "").trim();
    const gameMode = String(formData.get("gameMode") ?? "interactive") as CompanyGameMode;
    const accessMode = String(
      formData.get("accessMode") ?? "invited_only",
    ) as CompanyAccessMode;
    const allowedEmailDomain =
      String(formData.get("allowedEmailDomain") ?? "").trim().toLowerCase() || null;
    const primaryColor = normalizeHexColor(
      String(formData.get("primaryColor") ?? ""),
      "#0f4c81",
    );
    const backgroundColor = normalizeHexColor(
      String(formData.get("backgroundColor") ?? ""),
      "#f6f3ee",
    );
    const logoText = String(formData.get("logoText") ?? "").trim() || shortName;
    const collectsArea = String(formData.get("collectsArea") ?? "true") === "true";
    const areaLabel = String(formData.get("areaLabel") ?? "").trim() || "Área";

    if (!displayName || !shortName || !slug || !tagline) {
      return { error: "Completá nombre, nombre corto, slug y tagline." };
    }

    const created = await createCompany({
      slug,
      displayName,
      shortName,
      tagline,
      gameMode,
      accessMode,
      allowedEmailDomain,
      collectsArea,
      areaLabel,
      branding: buildBranding({
        primaryColor,
        backgroundColor,
        logoText,
        logoUrl: null,
      }),
    });

    revalidatePath("/admin");

    return {
      success: `Empresa creada: ${created.displayName}`,
      createdSlug: created.slug,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pude crear la empresa.";
    return { error: message };
  }
}

export async function updateCompanyAction(
  prevState: UpdateCompanyActionState,
  formData: FormData,
): Promise<UpdateCompanyActionState> {
  try {
    const companyId = String(formData.get("companyId") ?? "").trim();
    const displayName = String(formData.get("displayName") ?? "").trim();
    const shortName = String(formData.get("shortName") ?? "").trim();
    const tagline = String(formData.get("tagline") ?? "").trim();
    const areaLabel = String(formData.get("areaLabel") ?? "").trim() || "Área";
    const collectsArea = String(formData.get("collectsArea") ?? "false") === "true";
    const primaryColor = normalizeHexColor(
      String(formData.get("primaryColor") ?? ""),
      "#0f4c81",
    );
    const backgroundColor = normalizeHexColor(
      String(formData.get("backgroundColor") ?? ""),
      "#111317",
    );
    const logoText = String(formData.get("logoText") ?? "").trim() || shortName;
    const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;

    if (!companyId || !displayName || !shortName || !tagline) {
      return { error: "Completá los datos principales de la empresa." };
    }

    await updateCompanySettings({
      companyId,
      displayName,
      shortName,
      tagline,
      collectsArea,
      areaLabel,
      branding: buildBranding({
        primaryColor,
        backgroundColor,
        logoText,
        logoUrl,
      }),
    });

    revalidatePath("/admin");
    return { success: "Empresa actualizada." };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pude actualizar la empresa.";
    return { error: message };
  }
}

export async function importUsersAction(
  prevState: ImportUsersActionState,
  formData: FormData,
): Promise<ImportUsersActionState> {
  try {
    const companyId = String(formData.get("companyId") ?? "").trim();
    const companyName = String(formData.get("companyName") ?? "").trim();
    const rows = parseImportedUsers(String(formData.get("rows") ?? ""));

    const validRows = rows.filter((row) => row.fullName && row.email);
    if (!companyId || validRows.length === 0) {
      return { error: "Pegá al menos un participante válido." };
    }

    const imported = await importCompanyUsers(companyId, validRows);

    revalidatePath("/admin");

    return {
      success: `${imported.length} usuarios preparados para ${companyName}.`,
      credentials: imported.map((item) => ({
        fullName: item.user.fullName,
        email: item.user.email,
        temporaryPassword: item.temporaryPassword,
      })),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pude importar el padrón.";
    return { error: message };
  }
}

export async function resetUserPasswordAction(
  prevState: ResetUserPasswordState,
  formData: FormData,
): Promise<ResetUserPasswordState> {
  try {
    const companyId = String(formData.get("companyId") ?? "").trim();
    const userId = String(formData.get("userId") ?? "").trim();
    const fullName = String(formData.get("fullName") ?? "").trim();

    if (!companyId || !userId) {
      return { error: "Faltan datos para resetear la contraseña." };
    }

    const temporaryPassword = await resetCompanyUserPassword({ companyId, userId });
    revalidatePath("/admin");

    return {
      success: `Contraseña temporal regenerada para ${fullName}.`,
      temporaryPassword,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pude resetear la contraseña.";
    return { error: message };
  }
}
