import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { AdminLogin } from "@/components/corporate/admin-login";
import { AdminPanel } from "@/components/corporate/admin-panel";
import { getCorporateClient } from "@/lib/corporate/clients";
import { getOfficialResultsForCompany } from "@/lib/corporate/db";
import { allMatches } from "@/lib/corporate/match-registry";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function CorporateAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await getCorporateClient(slug);
  if (!client) {
    notFound();
  }

  const jar = await cookies();
  const authenticated = isValidAdminSession(jar.get(ADMIN_SESSION_COOKIE)?.value);
  if (!authenticated) {
    return <AdminLogin client={client} />;
  }

  const officialResults = await getOfficialResultsForCompany(client.id);

  return (
    <AdminPanel
      client={client}
      matches={allMatches}
      officialResults={officialResults}
    />
  );
}
