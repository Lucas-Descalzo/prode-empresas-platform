import type { CompanyRecord } from "./types";

const COMMUNITY_HINT =
  /(boxing|box|club|gym|fitness|dojo|academy|academia|community|comunidad|crew|studio)/i;

function companySignature(client: Pick<CompanyRecord, "displayName" | "shortName" | "tagline">) {
  return `${client.displayName} ${client.shortName} ${client.tagline}`;
}

export function usesCommunityVoice(
  client: Pick<CompanyRecord, "displayName" | "shortName" | "tagline" | "collectsArea">,
) {
  return !client.collectsArea || COMMUNITY_HINT.test(companySignature(client));
}

export function getLandingHeroTitle(
  client: Pick<CompanyRecord, "displayName" | "shortName">,
) {
  return `${client.shortName} Mundial 2026`;
}

export function getLandingHeroCopy(
  client: Pick<
    CompanyRecord,
    "displayName" | "shortName" | "tagline" | "collectsArea" | "gameMode"
  >,
) {
  if (client.gameMode === "simple") {
    return usesCommunityVoice(client)
      ? `Un prode privado para la comunidad de ${client.shortName}. Armá tu predicción antes del Mundial y seguí tu posición en el ranking interno durante todo el torneo.`
      : `Un prode privado para ${client.shortName}. Armá tu predicción antes del Mundial y seguí tu posición en el ranking interno durante todo el torneo.`;
  }

  return usesCommunityVoice(client)
    ? "Seguí el Mundial partido a partido junto a tu comunidad y peleá por el primer puesto del ranking interno."
    : `Seguí el Mundial partido a partido y competí en el ranking interno de ${client.shortName}.`;
}

export function getAccessCopy(
  client: Pick<
    CompanyRecord,
    "displayName" | "shortName" | "tagline" | "collectsArea" | "accessMode"
  >,
) {
  if (client.accessMode === "signup_link") {
    return `Cada persona habilitada por ${client.shortName} recibe un link privado para crear su usuario y entrar con DNI y clave.`;
  }

  if (client.accessMode === "corporate_domain_signup") {
    return usesCommunityVoice(client)
      ? "Cada miembro activa su cuenta privada con su mail y entra a la plataforma."
      : "Cada persona activa su cuenta privada con su mail corporativo.";
  }

  return `Solo participan personas invitadas por ${client.shortName}. Cada usuario recibe su acceso para cargar la predicción.`;
}

export function getGameModeCopy(
  client: Pick<
    CompanyRecord,
    "displayName" | "shortName" | "tagline" | "collectsArea" | "gameMode"
  >,
) {
  if (client.gameMode === "simple") {
    return "Completas tu prode una sola vez antes del Mundial: grupos, mejores terceros y cuadro final.";
  }

  return "Tu prode se completa partido a partido durante todo el torneo.";
}

export function getRankingCopy(
  client: Pick<
    CompanyRecord,
    "displayName" | "shortName" | "tagline" | "collectsArea"
  >,
) {
  return `Cada participante sigue su posición en el ranking interno de ${client.shortName}, con nombre y puntaje actualizados durante el torneo.`;
}

export function getFooterAttribution(client: Pick<CompanyRecord, "displayName">) {
  return `${client.displayName} · Plataforma operada por Prode Empresas`;
}

export function getLoginCopy(
  client: Pick<CompanyRecord, "shortName" | "accessMode">,
) {
  if (client.accessMode === "signup_link") {
    return `Si ya te registraste, entrá con tu DNI y la clave que creaste. Si todavía no tenés cuenta, pedí el link privado al equipo de ${client.shortName}.`;
  }

  return `${client.shortName} te comparte un email y una contraseña inicial. En tu primer ingreso podés definir la tuya.`;
}

export function getLoginIdentifierLabel(
  client: Pick<CompanyRecord, "accessMode">,
) {
  return client.accessMode === "signup_link" ? "DNI" : "Email";
}

export function getLoginIdentifierPlaceholder(
  client: Pick<CompanyRecord, "accessMode" | "allowedEmailDomain">,
) {
  if (client.accessMode === "signup_link") {
    return "12345678";
  }

  return client.allowedEmailDomain
    ? `nombre@${client.allowedEmailDomain}`
    : "nombre@correo.com";
}

export function getLoginPasswordLabel(
  client: Pick<CompanyRecord, "accessMode">,
) {
  return client.accessMode === "signup_link" ? "Clave" : "Contraseña temporal";
}

export function getLoginTitle(
  client: Pick<CompanyRecord, "accessMode">,
) {
  return client.accessMode === "signup_link"
    ? "Entrá para seguir tu prode"
    : "Entrá con tu acceso temporal";
}
