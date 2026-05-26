import { cookies } from "next/headers";

import { AdminDashboard } from "@/components/operator-dashboard";
import { AdminLogin } from "@/components/admin-login";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { listCompanies, listUsersForCompany } from "@/lib/corporate/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const isAuthenticated = isValidAdminSession(adminCookie);

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const companies = await listCompanies();
  const companiesWithUsers = await Promise.all(
    companies.map(async (company) => {
      const users = await listUsersForCompany(company.id);
      return {
        ...company,
        users,
      };
    }),
  );

  return <AdminDashboard companies={companiesWithUsers} />;
}
