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
  return `Prode Mundial 2026 ${client.shortName}`;
}

export function getLandingHeroCopy(
  client: Pick<
    CompanyRecord,
    "displayName" | "shortName" | "tagline" | "collectsArea" | "gameMode"
  >,
) {
  if (client.gameMode === "simple") {
    return usesCommunityVoice(client)
      ? `Un prode privado para la comunidad de ${client.shortName}. Arma tu prediccion antes del Mundial y segui tu posicion en el ranking interno durante todo el torneo.`
      : `Un prode privado para ${client.shortName}. Arma tu prediccion antes del Mundial y segui tu posicion en el ranking interno durante todo el torneo.`;
  }

  return usesCommunityVoice(client)
    ? "Segui el Mundial partido a partido junto a tu comunidad y pelea por el primer puesto del ranking interno."
    : `Segui el Mundial partido a partido y compite en el ranking interno de ${client.shortName}.`;
}

export function getAccessCopy(
  client: Pick<
    CompanyRecord,
    "displayName" | "shortName" | "tagline" | "collectsArea" | "accessMode"
  >,
) {
  if (client.accessMode === "corporate_domain_signup") {
    return usesCommunityVoice(client)
      ? "Cada miembro activa su cuenta privada con su mail y entra a la plataforma."
      : "Cada persona activa su cuenta privada con su mail corporativo.";
  }

  return `Solo participan personas invitadas por ${client.shortName}. Cada usuario recibe su acceso para cargar la prediccion.`;
}

export function getGameModeCopy(
  client: Pick<
    CompanyRecord,
    "displayName" | "shortName" | "tagline" | "collectsArea" | "gameMode"
  >,
) {
  if (client.gameMode === "simple") {
    return "Completas tu prediccion una sola vez antes del Mundial: grupos, mejores terceros y cuadro final.";
  }

  return "La eliminacion directa se define partido a partido durante todo el torneo.";
}

export function getRankingCopy(
  client: Pick<
    CompanyRecord,
    "displayName" | "shortName" | "tagline" | "collectsArea"
  >,
) {
  return `Cada participante compite en el ranking interno de ${client.shortName}, con su nombre y puntaje actualizado durante el torneo.`;
}

export function getFooterAttribution(client: Pick<CompanyRecord, "displayName">) {
  return `${client.displayName} · Plataforma operada por Prode Empresas`;
}

export function getLoginCopy(
  client: Pick<CompanyRecord, "shortName">,
) {
  return `${client.shortName} te comparte un email y una contrasena inicial. En tu primer ingreso podes definir la tuya.`;
}

export function getLoginEmailPlaceholder(
  client: Pick<CompanyRecord, "allowedEmailDomain">,
) {
  return client.allowedEmailDomain
    ? `nombre@${client.allowedEmailDomain}`
    : "nombre@correo.com";
}
