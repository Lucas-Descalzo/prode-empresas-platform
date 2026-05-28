import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import styles from "@/components/corporate/corporate-shell.module.css";
import { SignupForm } from "@/components/corporate/signup-form";
import { getCorporateClient } from "@/lib/corporate/clients";
import { isSignupLinkTokenValid } from "@/lib/corporate/db";
import { getCurrentParticipant } from "@/lib/corporate/session";

export const dynamic = "force-dynamic";

export default async function RegistroPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const tokenValue = resolvedSearchParams.token;
  const token = Array.isArray(tokenValue) ? tokenValue[0] ?? "" : tokenValue ?? "";
  const client = await getCorporateClient(slug);

  if (!client) {
    notFound();
  }

  if (client.accessMode !== "signup_link") {
    redirect(`/c/${client.slug}/partidos`);
  }

  const participant = await getCurrentParticipant(client.id);
  if (participant) {
    redirect(`/c/${client.slug}/partidos`);
  }

  const isValidLink = token
    ? await isSignupLinkTokenValid({ companyId: client.id, token })
    : false;

  if (!isValidLink) {
    return (
      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Registro privado</span>
            <h1 className={styles.sectionTitle}>Link no disponible</h1>
          </div>
          <p className={styles.sectionHint}>
            Este link puede estar inactivo o ser incorrecto. Pide uno nuevo en el
            gimnasio.
          </p>
        </div>

        <Link href={`/c/${client.slug}/partidos`} className={styles.formSubmit}>
          Ir al ingreso
        </Link>
      </section>
    );
  }

  return <SignupForm client={client} token={token} />;
}
