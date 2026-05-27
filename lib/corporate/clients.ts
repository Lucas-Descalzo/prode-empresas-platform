import { cache } from "react";

import { getCompanyBySlug, listCompanies } from "./db";

export const DEFAULT_ROOT_DOMAIN = "prode-empresas.com";

export function getRootDomain() {
  return (
    process.env.APP_ROOT_DOMAIN ??
    process.env.NEXT_PUBLIC_APP_ROOT_DOMAIN ??
    DEFAULT_ROOT_DOMAIN
  ).toLowerCase();
}

export const getCorporateClient = cache(async (slug: string) => {
  return getCompanyBySlug(slug);
});

export async function listCorporateClients() {
  return listCompanies();
}
