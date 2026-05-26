import { redirect } from "next/navigation";

import { buildQueryString } from "@/lib/navigation-utils";

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const queryString = buildQueryString(await searchParams);
  redirect(`/ligas/${slug}${queryString}`);
}
