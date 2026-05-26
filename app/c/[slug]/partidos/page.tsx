import { notFound } from "next/navigation";

import {
  ChangePasswordForm,
  LoginForm,
} from "@/components/corporate/login-form";
import { SimpleModeApp } from "@/components/corporate/simple-mode-app";
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
    const fixturePrediction = await getFixturePredictionForUser(client.id, participant.id);
    return (
      <SimpleModeApp
        client={client}
        initialFixtureState={fixturePrediction?.fixtureState ?? null}
      />
    );
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
