import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { AdminLogin } from "@/components/corporate/admin-login";
import { AdminPanel } from "@/components/corporate/admin-panel";
import { getCorporateClient } from "@/lib/corporate/clients";
import {
  getCompanySignupLink,
  getOfficialResultsForCompany,
  listUsersForCompany,
} from "@/lib/corporate/db";
import { allMatches } from "@/lib/corporate/match-registry";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type AdminTab = "results" | "access" | "participants";

export default async function CorporateAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const tabValue = resolvedSearchParams.tab;
  const initialTab: AdminTab =
    typeof tabValue === "string" &&
    ["results", "access", "participants"].includes(tabValue)
      ? (tabValue as AdminTab)
      : "results";
  const client = await getCorporateClient(slug);
  if (!client) {
    notFound();
  }

  const jar = await cookies();
  const authenticated = isValidAdminSession(jar.get(ADMIN_SESSION_COOKIE)?.value);
  if (!authenticated) {
    return <AdminLogin client={client} initialTab={initialTab} />;
  }

  const [officialResults, users, signupLink] = await Promise.all([
    getOfficialResultsForCompany(client.id),
    listUsersForCompany(client.id),
    client.accessMode === "signup_link"
      ? getCompanySignupLink(client.id, client.slug)
      : Promise.resolve(null),
  ]);

  return (
    <AdminPanel
      client={client}
      matches={allMatches}
      officialResults={officialResults}
      users={users}
      signupLink={signupLink}
      initialTab={initialTab}
    />
  );
}
