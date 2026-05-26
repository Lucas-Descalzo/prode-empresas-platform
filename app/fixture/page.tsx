import { redirect } from "next/navigation";

import { buildQueryString } from "@/lib/navigation-utils";

export default async function FixturePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  redirect(`/mi-prediccion${buildQueryString(params)}`);
}
