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
    />
  );
}
