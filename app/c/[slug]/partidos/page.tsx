import { notFound } from "next/navigation";

import {
  ChangePasswordForm,
  LoginForm,
} from "@/components/corporate/login-form";
import { GroupMatchGrid } from "@/components/corporate/group-match-grid";
import { KnockoutMatchSection } from "@/components/corporate/knockout-match-section";
import { getCorporateClient } from "@/lib/corporate/clients";
import {
  getFixturePredictionForUser,
  getInteractivePredictionsForUser,
} from "@/lib/corporate/db";
import { allMatches } from "@/lib/corporate/match-registry";
import { getCurrentParticipant } from "@/lib/corporate/session";

export const dynamic = "force-dynamic";

function SimpleModePlaceholder({ companyName }: { companyName: string }) {
  return (
    <section
      style={{
        display: "grid",
        gap: "1rem",
        padding: "1.5rem",
        borderRadius: "1.25rem",
        background: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <span style={{ fontSize: "0.8rem", textTransform: "uppercase", opacity: 0.7 }}>
        Modo simple
      </span>
      <h2 style={{ fontSize: "2rem", lineHeight: 1 }}>Predicción pre-Mundial</h2>
      <p style={{ maxWidth: 640, lineHeight: 1.6 }}>
        {companyName} está configurada en modo simple. La experiencia de fixture
        completo queda preparada en esta versión madre, pero la interfaz final de
        carga única se termina de cerrar en el siguiente tramo de producto.
      </p>
    </section>
  );
}

export default async function PartidosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await getCorporateClient(slug);
  if (!client) {
    notFound();
  }

  const participant = await getCurrentParticipant(client.id);
  if (!participant) {
    return <LoginForm client={client} />;
  }

  if (participant.mustChangePassword) {
    return <ChangePasswordForm client={client} participant={participant} />;
  }

  if (client.gameMode === "simple") {
    await getFixturePredictionForUser(client.id, participant.id);
    return <SimpleModePlaceholder companyName={client.displayName} />;
  }

  const predictions = await getInteractivePredictionsForUser(client.id, participant.id);

  return (
    <>
      <GroupMatchGrid
        client={client}
        matches={allMatches}
        initialPredictions={predictions}
      />
      <KnockoutMatchSection
        client={client}
        matches={allMatches}
        initialPredictions={predictions}
      />
    </>
  );
}
