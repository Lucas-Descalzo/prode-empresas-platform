import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Allura } from "next/font/google";

import { CorporateShell } from "@/components/corporate/corporate-shell";
import { getCorporateClient } from "@/lib/corporate/clients";
import { getCurrentParticipant } from "@/lib/corporate/session";

const scriptFont = Allura({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["400"],
});

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const client = await getCorporateClient(slug);

  if (!client) {
    return { title: "No encontrado" };
  }

  return {
    title: client.displayName,
    description: client.tagline,
  };
}

export default async function CorporateLayout({
  children,
  params,
}: LayoutProps) {
  const { slug } = await params;
  const client = await getCorporateClient(slug);

  if (!client) {
    notFound();
  }

  const participant = await getCurrentParticipant(client.id);
  const wrapperStyle = {
    minHeight: "100vh",
    background: client.branding.background,
    color: client.branding.foreground,
  };

  return (
    <div
      className={scriptFont.variable}
      data-corporate-shell="true"
      style={wrapperStyle}
    >
      <CorporateShell
        client={client}
        participantName={participant?.firstName}
      >
        {children}
      </CorporateShell>
    </div>
  );
}
