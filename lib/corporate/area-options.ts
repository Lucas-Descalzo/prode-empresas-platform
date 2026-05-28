import type { CompanyRecord } from "@/lib/corporate/types";

export function getCompanyAreaOptions(client: CompanyRecord): string[] {
  if (!client.collectsArea) {
    return [];
  }

  switch (client.slug) {
    case "tm-boxing":
      return ["Centro", "Funes"];
    default:
      return [];
  }
}

export function isValidCompanyArea(client: CompanyRecord, value: string): boolean {
  const options = getCompanyAreaOptions(client);
  if (options.length === 0) {
    return value.trim().length > 0;
  }

  return options.includes(value.trim());
}
