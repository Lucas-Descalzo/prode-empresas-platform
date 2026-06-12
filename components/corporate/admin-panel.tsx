"use client";

import Link from "next/link";
import {
  type FormEvent,
  useActionState as useReactActionState,
  useDeferredValue,
  useMemo,
  useState,
} from "react";

import {
  clearResultAction,
  resetParticipantPasswordAction,
  saveResultAction,
  updateParticipantStatusAction,
  updateSignupLinkStatusAction,
  type ParticipantAdminState,
  type SaveResultState,
  type SignupLinkState,
} from "@/app/c/[slug]/admin/actions";
import { teamMap } from "@/data/world-cup-2026";
import type { OfficialResultRow } from "@/lib/corporate/db";
import type {
  CompanySignupLinkRecord,
  CompanyUserRecord,
  CorporateClient,
} from "@/lib/corporate/types";
import type { UnifiedMatch } from "@/lib/corporate/match-registry";
import { inferAdvancingTeamFromResult } from "@/lib/corporate/simple-mode-official";
import type { TeamId } from "@/lib/world-cup-types";
import styles from "./corporate-shell.module.css";

type ResolvedKnockoutTeams = Record<string, { homeId: TeamId; awayId: TeamId }>;

interface AdminPanelProps {
  client: CorporateClient;
  matches: UnifiedMatch[];
  officialResults: Record<string, OfficialResultRow>;
  resolvedKnockoutTeams: ResolvedKnockoutTeams;
  users: CompanyUserRecord[];
  signupLink: CompanySignupLinkRecord | null;
  initialTab?: TabId;
}

type Filter = "pending" | "loaded" | "all";
type TabId = "results" | "access" | "participants";
type ParticipantStatusFilter = "all" | "active" | "invited" | "disabled";
type ParticipantAreaFilter = "all" | string;

const STAGE_LABELS: Record<string, string> = {
  groups: "Fase de grupos",
  roundOf32: "16avos",
  roundOf16: "Octavos",
  quarterFinal: "Cuartos",
  semiFinal: "Semifinales",
  bronzeFinal: "Tercer puesto",
  final: "Final",
};

const TAB_LABELS: Array<{ id: TabId; label: string }> = [
  { id: "access", label: "Alta usuarios" },
  { id: "results", label: "Resultados partidos" },
  { id: "participants", label: "Participantes" },
];

const TAB_COPY: Record<TabId, { title: string; description: string }> = {
  access: {
    title: "Alta de usuarios",
    description:
      "Comparte el link correcto, controla si sigue abierto y revisa rápidamente el estado general de la comunidad.",
  },
  results: {
    title: "Resultados partidos",
    description:
      "La integración principal corre por API. La carga manual queda disponible solo como respaldo cuando haga falta intervenir.",
  },
  participants: {
    title: "Base de participantes",
    description:
      "Busca personas por nombre o DNI, resetea claves y da de baja usuarios cuando haga falta.",
  },
};

const PARTICIPANT_FILTER_LABELS: Array<{
  id: ParticipantStatusFilter;
  label: string;
}> = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Activos" },
  { id: "invited", label: "Pendientes" },
  { id: "disabled", label: "Baja" },
];

const PARTICIPANT_STATUS_LABELS: Record<Exclude<ParticipantStatusFilter, "all">, string> = {
  active: "Activo",
  invited: "Pendiente",
  disabled: "Baja",
};

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function teamLabel(
  match: UnifiedMatch,
  side: "home" | "away",
  resolvedKnockoutTeams?: ResolvedKnockoutTeams,
): string {
  const resolved = resolvedKnockoutTeams?.[match.id];
  if (resolved) {
    const teamId = side === "home" ? resolved.homeId : resolved.awayId;
    return teamMap[teamId]?.shortName ?? teamId;
  }

  const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
  if (teamId) {
    return teamMap[teamId].shortName;
  }

  const ref = side === "home" ? match.homeRef : match.awayRef;
  if (!ref) return "Por definir";

  switch (ref.kind) {
    case "placement":
      return `${ref.place}.o Grupo ${ref.group}`;
    case "third":
      return "Mejor 3.o";
    case "winner":
      return `Gan. ${ref.matchId}`;
    case "loser":
      return `Perd. ${ref.matchId}`;
  }
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatLastLogin(value: string | null) {
  if (!value) {
    return "Sin ingreso";
  }

  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatResultSavedAt(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatAreaLabel(areaLabel: string, value: string | null) {
  if (!value) {
    return `Sin ${areaLabel.toLocaleLowerCase("es-AR")}`;
  }

  return `${areaLabel} ${value}`;
}

function SignupLinkBar({ signupLink }: { signupLink: CompanySignupLinkRecord | null }) {
  const [copyFeedback, setCopyFeedback] = useState("");

  if (!signupLink) return null;
  const signupPath = signupLink.path;

  async function handleCopy() {
    const fullUrl = new URL(signupPath, window.location.origin).toString();
    await navigator.clipboard.writeText(fullUrl);
    setCopyFeedback("Copiado");
    window.setTimeout(() => setCopyFeedback(""), 1800);
  }

  return (
    <div className={styles.adminSignupBar}>
      <span
        className={`${styles.adminStatusPill} ${
          signupLink.status === "active" ? styles.adminStatusPillActive : styles.adminStatusPillMuted
        }`}
      >
        {signupLink.status === "active" ? "Alta activa" : "Alta inactiva"}
      </span>
      <code className={styles.adminSignupBarPath}>{signupPath}</code>
      <button
        type="button"
        className={styles.adminSaveBtn}
        onClick={() => void handleCopy()}
      >
        {copyFeedback || "Copiar link"}
      </button>
    </div>
  );
}

export function AdminPanel({
  client,
  matches,
  officialResults,
  resolvedKnockoutTeams,
  users,
  signupLink,
  initialTab = "access",
}: AdminPanelProps) {
  const totalLoaded = Object.keys(officialResults).length;
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [filter, setFilter] = useState<Filter>(() =>
    totalLoaded > 0 ? "loaded" : "pending",
  );
  const [showResultsList, setShowResultsList] = useState(totalLoaded > 0);
  const participantUsers = useMemo(
    () => users.filter((user) => user.role === "participant"),
    [users],
  );

  const loadedMatches = useMemo(
    () =>
      matches
        .map((match) => ({ match, result: officialResults[match.id] ?? null }))
        .filter(
          (item): item is { match: UnifiedMatch; result: OfficialResultRow } =>
            item.result !== null,
        )
        .sort(
          (left, right) =>
            new Date(right.result.savedAt).getTime() -
            new Date(left.result.savedAt).getTime(),
        ),
    [matches, officialResults],
  );

  const filteredMatches = useMemo(() => {
    if (filter === "all") return matches;
    if (filter === "loaded") {
      return matches.filter((match) => officialResults[match.id]);
    }
    return matches.filter((match) => !officialResults[match.id]);
  }, [filter, matches, officialResults]);

  const groupedByStage = useMemo(() => {
    const groups = new Map<string, UnifiedMatch[]>();
    for (const match of filteredMatches) {
      const list = groups.get(match.stage) ?? [];
      list.push(match);
      groups.set(match.stage, list);
    }
    return groups;
  }, [filteredMatches]);

  const totalPlayable = matches.length;
  const activeUsers = participantUsers.filter((user) => user.status === "active").length;
  const invitedUsers = participantUsers.filter((user) => user.status === "invited").length;
  const disabledUsers = participantUsers.filter((user) => user.status === "disabled").length;
  const activeTabCopy = TAB_COPY[activeTab];

  return (
    <>
      <div className={styles.gameHeader}>
        <span className={styles.gameEyebrow}>Panel {client.shortName}</span>
        <h1 className={styles.gameTitle}>{client.displayName}</h1>
        <p className={styles.gameStatus}>
          Gestiona resultados, el link de alta, el buscador de participantes y el ranking
          desde el mismo acceso administrador.
        </p>
      </div>

      <SignupLinkBar signupLink={signupLink} />

      <div className={styles.adminCard}>
        <div className={styles.adminTopBar}>
          <div className={styles.adminFilters}>
            {TAB_LABELS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.adminFilterTab} ${
                  activeTab === tab.id ? styles.adminFilterTabActive : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Link href={`/c/${client.slug}/liga`} className={styles.adminSecondaryAction}>
            Ranking
          </Link>
        </div>

        <section className={styles.adminTabLead}>
          <div>
            <span className={styles.sectionEyebrow}>Vista actual</span>
            <h2 className={styles.adminSectionTitle}>{activeTabCopy.title}</h2>
          </div>
          <p className={styles.adminTabLeadCopy}>{activeTabCopy.description}</p>
        </section>

        {activeTab === "results" ? (
          <>
            <div className={styles.adminSummaryGrid}>
              <article className={styles.adminSummaryCard}>
                <span>Resultados cargados</span>
                <strong>
                  {totalLoaded}/{totalPlayable}
                </strong>
              </article>
              <article className={styles.adminSummaryCard}>
                <span>Participantes activos</span>
                <strong>{activeUsers}</strong>
              </article>
              <article className={styles.adminSummaryCard}>
                <span>Link de alta</span>
                <strong>{signupLink?.status === "active" ? "Activo" : "Inactivo"}</strong>
              </article>
            </div>

            {loadedMatches.length > 0 ? (
              <section className={styles.adminLoadedResultsPanel}>
                <header className={styles.adminLoadedResultsHeader}>
                  <div>
                    <span className={styles.sectionEyebrow}>Control de carga</span>
                    <h3 className={styles.adminLoadedResultsTitle}>
                      Ultimos resultados guardados
                    </h3>
                  </div>
                  <button
                    type="button"
                    className={styles.adminSecondaryAction}
                    onClick={() => {
                      setShowResultsList(true);
                      setFilter("loaded");
                    }}
                  >
                    Ver cargados
                  </button>
                </header>

                <div className={styles.adminLoadedResultsList}>
                  {loadedMatches.slice(0, 5).map(({ match, result }) => (
                    <div key={match.id} className={styles.adminLoadedResultItem}>
                      <div className={styles.adminLoadedResultMain}>
                        <strong>
                          {teamLabel(match, "home", resolvedKnockoutTeams)}{" "}
                          {result.homeScore}-{result.awayScore}{" "}
                          {teamLabel(match, "away", resolvedKnockoutTeams)}
                        </strong>
                        <span>
                          {match.id} - {STAGE_LABELS[match.stage] ?? match.stage} -{" "}
                          {formatResultSavedAt(result.savedAt)}
                        </span>
                      </div>
                      <span
                        className={`${styles.adminStatusPill} ${styles.adminStatusPillActive}`}
                      >
                        Cargado
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <div className={styles.adminAccessActions}>
              <button
                type="button"
                className={styles.adminSecondaryAction}
                onClick={() => setShowResultsList((current) => !current)}
              >
                {showResultsList ? "Ocultar lista manual" : "Mostrar lista manual"}
              </button>
            </div>

            {showResultsList ? (
              <>
                <div className={styles.adminFilters}>
                  <button
                    type="button"
                    className={`${styles.adminFilterTab} ${
                      filter === "pending" ? styles.adminFilterTabActive : ""
                    }`}
                    onClick={() => setFilter("pending")}
                  >
                    Pendientes
                  </button>
                  <button
                    type="button"
                    className={`${styles.adminFilterTab} ${
                      filter === "loaded" ? styles.adminFilterTabActive : ""
                    }`}
                    onClick={() => setFilter("loaded")}
                  >
                    Cargados
                  </button>
                  <button
                    type="button"
                    className={`${styles.adminFilterTab} ${
                      filter === "all" ? styles.adminFilterTabActive : ""
                    }`}
                    onClick={() => setFilter("all")}
                  >
                    Todos
                  </button>
                </div>

                {["groups", "roundOf32", "roundOf16", "quarterFinal", "semiFinal", "bronzeFinal", "final"].map(
                  (stage) => {
                    const stageMatches = groupedByStage.get(stage);
                    if (!stageMatches || stageMatches.length === 0) {
                      return null;
                    }

                    return (
                      <section key={stage} className={styles.stageGroup}>
                        <header className={styles.stageHead}>
                          <h2 className={styles.stageHeadLabel}>
                            {STAGE_LABELS[stage] ?? stage}
                          </h2>
                          <span className={styles.stageHeadCount}>
                            {stageMatches.length} partidos
                          </span>
                        </header>

                        <div style={{ display: "grid", gap: "0.5rem" }}>
                          {stageMatches.map((match) => (
                            <ResultRow
                              key={match.id}
                              client={client}
                              match={match}
                              initial={officialResults[match.id] ?? null}
                              resolvedKnockoutTeams={resolvedKnockoutTeams}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  },
                )}

                {filteredMatches.length === 0 ? (
                  <p className={styles.leaderboardEmpty}>
                    {filter === "pending"
                      ? "No hay partidos pendientes de carga."
                      : filter === "loaded"
                        ? "Todavía no cargaste ningún resultado."
                        : "No hay partidos disponibles."}
                  </p>
                ) : null}
              </>
            ) : (
              <p className={styles.leaderboardEmpty}>
                La carga manual de partidos queda oculta por defecto. Usala solo si la API
                necesita apoyo o corrección puntual.
              </p>
            )}
          </>
        ) : null}

        {activeTab === "access" ? (
          <AccessPanel
            client={client}
            signupLink={signupLink}
            totalUsers={participantUsers.length}
            activeUsers={activeUsers}
            invitedUsers={invitedUsers}
            disabledUsers={disabledUsers}
          />
        ) : null}

        {activeTab === "participants" ? (
          <ParticipantsPanel
            client={client}
            users={participantUsers}
            activeUsers={activeUsers}
            invitedUsers={invitedUsers}
            disabledUsers={disabledUsers}
          />
        ) : null}
      </div>
    </>
  );
}

function AccessPanel({
  client,
  signupLink,
  totalUsers,
  activeUsers,
  invitedUsers,
  disabledUsers,
}: {
  client: CorporateClient;
  signupLink: CompanySignupLinkRecord | null;
  totalUsers: number;
  activeUsers: number;
  invitedUsers: number;
  disabledUsers: number;
}) {
  const [state, formAction, isPending] = useReactActionState<SignupLinkState, FormData>(
    updateSignupLinkStatusAction,
    {},
  );
  const [copyFeedback, setCopyFeedback] = useState("");

  async function handleCopyLink() {
    if (!signupLink) {
      return;
    }

    const fullUrl = new URL(signupLink.path, window.location.origin).toString();
    await navigator.clipboard.writeText(fullUrl);
    setCopyFeedback("Link copiado");
    window.setTimeout(() => setCopyFeedback(""), 1800);
  }

  return (
    <div className={styles.adminSectionStack}>
      <div className={styles.adminSummaryGrid}>
        <article className={styles.adminSummaryCard}>
          <span>Total participantes</span>
          <strong>{totalUsers}</strong>
        </article>
        <article className={styles.adminSummaryCard}>
          <span>Activos</span>
          <strong>{activeUsers}</strong>
        </article>
        <article className={styles.adminSummaryCard}>
          <span>Pendientes</span>
          <strong>{invitedUsers}</strong>
        </article>
        <article className={styles.adminSummaryCard}>
          <span>Deshabilitados</span>
          <strong>{disabledUsers}</strong>
        </article>
      </div>

      {signupLink ? (
        <div className={styles.adminAccessGrid}>
          <section className={styles.adminAccessCard}>
            <div className={styles.adminAccessHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Link único</span>
                <h2 className={styles.adminSectionTitle}>Alta de participantes</h2>
              </div>
              <span
                className={`${styles.adminStatusPill} ${
                  signupLink.status === "active"
                    ? styles.adminStatusPillActive
                    : styles.adminStatusPillMuted
                }`}
              >
                {signupLink.status === "active" ? "Activo" : "Inactivo"}
              </span>
            </div>

            <p className={styles.adminAccessCopy}>
              Comparte este link solo con socios habilitados para participar. Quien
              entre podrá crear su cuenta con DNI y clave propia.
            </p>

            <code className={styles.adminAccessPath}>{signupLink.path}</code>

            <div className={styles.adminAccessActions}>
              <button
                type="button"
                className={styles.formSubmit}
                onClick={() => void handleCopyLink()}
              >
                Copiar link
              </button>

              <form action={formAction}>
                <input type="hidden" name="slug" value={client.slug} />
                <input
                  type="hidden"
                  name="status"
                  value={signupLink.status === "active" ? "inactive" : "active"}
                />
                <button
                  type="submit"
                  className={styles.adminSecondaryAction}
                  disabled={isPending}
                >
                  {isPending
                    ? "Guardando..."
                    : signupLink.status === "active"
                      ? "Desactivar link"
                      : "Activar link"}
                </button>
              </form>
            </div>

            {copyFeedback ? <p className={styles.adminFeedback}>{copyFeedback}</p> : null}
            {state.error ? <p className={styles.formError}>{state.error}</p> : null}
            {state.success ? <p className={styles.formInfo}>{state.success}</p> : null}
          </section>

          <aside className={styles.adminAccessGuide}>
            <div className={styles.adminGuideBlock}>
              <span className={styles.sectionEyebrow}>Uso recomendado</span>
              <ul className={styles.adminGuideList}>
                <li>Enviá este link solo a socios habilitados para jugar.</li>
                <li>Si necesitan pausar nuevas altas, desactiven el link y vuelvan a abrirlo después.</li>
                <li>Si alguien no corresponde, denlo de baja desde Participantes.</li>
              </ul>
            </div>

            <div className={styles.adminGuideBlock}>
              <span className={styles.sectionEyebrow}>Estado operativo</span>
              <div className={styles.adminGuideStats}>
                <div>
                  <strong>{signupLink.status === "active" ? "Abierto" : "Cerrado"}</strong>
                  <span>Registro por link</span>
                </div>
                <div>
                  <strong>{activeUsers}</strong>
                  <span>Jugando hoy</span>
                </div>
                <div>
                  <strong>{disabledUsers}</strong>
                  <span>Bajas aplicadas</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <p className={styles.leaderboardEmpty}>
          Este tenant no usa alta por link en este momento.
        </p>
      )}
    </div>
  );
}

function ParticipantsPanel({
  client,
  users,
  activeUsers,
  invitedUsers,
  disabledUsers,
}: {
  client: CorporateClient;
  users: CompanyUserRecord[];
  activeUsers: number;
  invitedUsers: number;
  disabledUsers: number;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ParticipantStatusFilter>("all");
  const [areaFilter, setAreaFilter] = useState<ParticipantAreaFilter>("all");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalizeSearchValue(deferredQuery);
  const usersWithTemporaryPassword = useMemo(
    () => users.filter((user) => user.mustChangePassword).length,
    [users],
  );
  const areaSummaries = useMemo(() => {
    const counts = new Map<string, number>();

    for (const user of users) {
      const area = user.area?.trim();
      if (!area) continue;
      counts.set(area, (counts.get(area) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => left.value.localeCompare(right.value, "es-AR"));
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter !== "all" && user.status !== statusFilter) {
        return false;
      }

      if (areaFilter !== "all" && user.area !== areaFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = normalizeSearchValue(
        `${user.fullName} ${user.documentId ?? ""} ${user.area ?? ""}`,
      );
      return searchable.includes(normalizedQuery);
    });
  }, [areaFilter, normalizedQuery, statusFilter, users]);

  if (users.length === 0) {
    return (
      <p className={styles.leaderboardEmpty}>
        Todavía no hay participantes registrados para este tenant.
      </p>
    );
  }

  return (
    <div className={styles.adminSectionStack}>
      <div className={styles.adminSummaryGrid}>
        <article className={styles.adminSummaryCard}>
          <span>Participantes</span>
          <strong>{users.length}</strong>
        </article>
        <article className={styles.adminSummaryCard}>
          <span>Activos</span>
          <strong>{activeUsers}</strong>
        </article>
        <article className={styles.adminSummaryCard}>
          <span>Pendientes</span>
          <strong>{invitedUsers}</strong>
        </article>
        <article className={styles.adminSummaryCard}>
          <span>Baja</span>
          <strong>{disabledUsers}</strong>
        </article>
        <article className={styles.adminSummaryCard}>
          <span>Clave pendiente</span>
          <strong>{usersWithTemporaryPassword}</strong>
        </article>
      </div>

      <div className={styles.adminParticipantsToolbar}>
        <label className={styles.adminParticipantsSearch}>
          <span className={styles.leaderboardSearchLabel}>Buscar participante</span>
          <input
            type="search"
            inputMode="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, apellido o DNI"
            className={styles.leaderboardSearchInput}
          />
        </label>

        <div className={styles.adminParticipantsMeta}>
          <strong>{filteredUsers.length}</strong>
          <span>
            {normalizedQuery || statusFilter !== "all" || areaFilter !== "all"
              ? `de ${users.length} visibles`
              : "participantes cargados"}
          </span>
        </div>
      </div>

      <div className={styles.adminParticipantsControlRow}>
        <label className={styles.adminParticipantsSelectWrap}>
          <span className={styles.leaderboardSearchLabel}>{client.areaLabel}</span>
          <select
            value={areaFilter}
            onChange={(event) => setAreaFilter(event.target.value)}
            className={styles.adminParticipantsSelect}
          >
            <option value="all">Todas las sedes</option>
            {areaSummaries.map((area) => (
              <option key={area.value} value={area.value}>
                {area.value} ({area.count})
              </option>
            ))}
          </select>
        </label>

        {areaSummaries.length > 0 ? (
          <div className={styles.adminAreaStats}>
            {areaSummaries.map((area) => (
              <span key={area.value} className={styles.adminAreaStatPill}>
                <strong>{area.count}</strong>
                <span>{area.value}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.adminFilters}>
        {PARTICIPANT_FILTER_LABELS.map((filterOption) => (
          <button
            key={filterOption.id}
            type="button"
            className={`${styles.adminFilterTab} ${
              statusFilter === filterOption.id ? styles.adminFilterTabActive : ""
            }`}
            onClick={() => setStatusFilter(filterOption.id)}
          >
            {filterOption.label}
          </button>
        ))}
      </div>

      {filteredUsers.length === 0 ? (
        <p className={styles.leaderboardEmpty}>
          No encontramos participantes con ese criterio. Ajustá la búsqueda o cambiá el
          filtro.
        </p>
      ) : (
        <div className={styles.adminParticipantsList}>
          {filteredUsers.map((user) => (
            <ParticipantRow
              key={user.id}
              client={client}
              user={user}
              areaLabel={client.areaLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ParticipantRow({
  client,
  user,
  areaLabel,
}: {
  client: CorporateClient;
  user: CompanyUserRecord;
  areaLabel: string;
}) {
  const [resetState, resetAction, isResetPending] =
    useReactActionState<ParticipantAdminState, FormData>(
      resetParticipantPasswordAction,
      {},
    );
  const [statusState, statusAction, isStatusPending] =
    useReactActionState<ParticipantAdminState, FormData>(
      updateParticipantStatusAction,
      {},
    );

  const stateForUser =
    resetState.userId === user.id ? resetState : statusState.userId === user.id ? statusState : {};
  const statusLabel = PARTICIPANT_STATUS_LABELS[user.status];
  const lastLoginLabel =
    user.lastLoginAt === null
      ? user.status === "invited"
        ? "Todavía no entró"
        : "Sin ingreso registrado"
      : formatLastLogin(user.lastLoginAt);
  const areaMetaLabel = formatAreaLabel(areaLabel, user.area);

  function handleStatusSubmit(event: FormEvent<HTMLFormElement>) {
    const actionLabel = user.status === "disabled" ? "reactivar" : "dar de baja";
    const approved = window.confirm(
      `Confirmá que querés ${actionLabel} a ${user.fullName}.`,
    );

    if (!approved) {
      event.preventDefault();
    }
  }

  return (
    <article className={styles.adminParticipantCard}>
      <div className={styles.adminParticipantMain}>
        <div>
          <strong>{user.fullName}</strong>
          <div className={styles.adminParticipantMetaList}>
            <span className={styles.adminParticipantMetaItem}>{areaMetaLabel}</span>
            <span className={styles.adminParticipantMetaItem}>
              DNI {user.documentId ?? "Sin DNI"}
            </span>
            <span className={styles.adminParticipantMetaItem}>{lastLoginLabel}</span>
            {user.mustChangePassword ? (
              <span className={styles.adminParticipantMetaItem}>Clave temporal pendiente</span>
            ) : null}
          </div>
        </div>
        <span
          className={`${styles.adminStatusPill} ${
            user.status === "disabled"
              ? styles.adminStatusPillMuted
              : user.status === "active"
                ? styles.adminStatusPillActive
                : styles.adminStatusPillPending
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className={styles.adminParticipantActions}>
        <form action={resetAction}>
          <input type="hidden" name="slug" value={client.slug} />
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="fullName" value={user.fullName} />
          <button
            type="submit"
            className={styles.adminSecondaryAction}
            disabled={isResetPending}
          >
            {isResetPending ? "..." : "Resetear clave"}
          </button>
        </form>

        <form action={statusAction} onSubmit={handleStatusSubmit}>
          <input type="hidden" name="slug" value={client.slug} />
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="fullName" value={user.fullName} />
          <input
            type="hidden"
            name="status"
            value={user.status === "disabled" ? "active" : "disabled"}
          />
          <button
            type="submit"
            className={
              user.status === "disabled"
                ? styles.adminSecondaryAction
                : styles.adminDangerAction
            }
            disabled={isStatusPending}
          >
            {isStatusPending
              ? "..."
              : user.status === "disabled"
                ? "Reactivar"
                : "Dar de baja"}
          </button>
        </form>
      </div>

      {stateForUser.error ? <p className={styles.formError}>{stateForUser.error}</p> : null}
      {stateForUser.success ? <p className={styles.formInfo}>{stateForUser.success}</p> : null}
      {resetState.userId === user.id && resetState.temporaryPassword ? (
        <p className={styles.adminCredentialNote}>
          Clave temporal visible una sola vez: <code>{resetState.temporaryPassword}</code>
        </p>
      ) : null}
    </article>
  );
}

const INITIAL_STATE: SaveResultState = {};

function ResultRow({
  client,
  match,
  initial,
  resolvedKnockoutTeams,
}: {
  client: CorporateClient;
  match: UnifiedMatch;
  initial: OfficialResultRow | null;
  resolvedKnockoutTeams: ResolvedKnockoutTeams;
}) {
  const resolved = resolvedKnockoutTeams[match.id];
  const effectiveHomeId = match.homeTeamId ?? resolved?.homeId;
  const effectiveAwayId = match.awayTeamId ?? resolved?.awayId;
  const slotUndefined = !effectiveHomeId || !effectiveAwayId;
  const isKnockout = match.stage !== "groups";
  const initialAdvancingTeamId = inferAdvancingTeamFromResult(
    effectiveHomeId,
    effectiveAwayId,
    initial,
  );

  const [state, formAction, isPending] = useReactActionState(
    saveResultAction,
    INITIAL_STATE,
  );
  const [clearState, clearAction, isClearing] = useReactActionState(
    clearResultAction,
    INITIAL_STATE,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const showSavedFlag = state.matchId === match.id && state.message ? state.message : "";
  const showClearedFlag =
    clearState.matchId === match.id && clearState.message ? clearState.message : "";

  const showAdvanceSelect = isKnockout && effectiveHomeId && effectiveAwayId;

  return (
    <div className={styles.adminMatchRow}>
      <div className={styles.adminMatchInfo}>
        <span className={styles.adminMatchTeams}>
          {teamLabel(match, "home", resolvedKnockoutTeams)} <span style={{ opacity: 0.5 }}>vs</span>{" "}
          {teamLabel(match, "away", resolvedKnockoutTeams)}
        </span>
        <span className={styles.adminMatchMeta}>
          {match.id} · {formatDate(match.date)}
        </span>
        {initial ? (
          <span className={styles.adminResultLoadedMeta}>
            Guardado en sistema: {initial.homeScore}-{initial.awayScore} -{" "}
            {formatResultSavedAt(initial.savedAt)}
          </span>
        ) : null}
      </div>

      <form action={formAction} className={styles.adminScoreInputs}>
        <input type="hidden" name="slug" value={client.slug} />
        <input type="hidden" name="matchId" value={match.id} />
        <input
          type="number"
          name="home"
          min={0}
          max={20}
          defaultValue={initial?.homeScore ?? ""}
          placeholder="0"
          aria-label="Goles local"
          disabled={slotUndefined}
          required
        />
        <span className={styles.scoreSep}>:</span>
        <input
          type="number"
          name="away"
          min={0}
          max={20}
          defaultValue={initial?.awayScore ?? ""}
          placeholder="0"
          aria-label="Goles visitante"
          disabled={slotUndefined}
          required
        />
        <button
          type="submit"
          className={styles.adminSaveBtn}
          disabled={slotUndefined || isPending}
        >
          {isPending ? "..." : "Guardar"}
        </button>
        {showAdvanceSelect ? (
          <select
            name="advancingTeamId"
            defaultValue={initialAdvancingTeamId ?? ""}
            className={styles.adminAdvanceSelect}
            aria-label="Equipo que avanza"
            disabled={slotUndefined || isPending}
            style={showAdvanced ? undefined : { display: "none" }}
          >
            <option value="">Avanza...</option>
            <option value={effectiveHomeId}>
              {teamMap[effectiveHomeId]?.shortName ?? effectiveHomeId}
            </option>
            <option value={effectiveAwayId}>
              {teamMap[effectiveAwayId]?.shortName ?? effectiveAwayId}
            </option>
          </select>
        ) : null}
      </form>

      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
        {showAdvanceSelect ? (
          <button
            type="button"
            className={styles.adminFilterTab}
            onClick={() => setShowAdvanced((value) => !value)}
            title="Correccion manual del equipo que avanza"
            style={{ minHeight: "2.4rem", opacity: showAdvanced ? 1 : 0.5 }}
          >
            Ajuste
          </button>
        ) : null}

        {initial ? (
          <form action={clearAction}>
            <input type="hidden" name="slug" value={client.slug} />
            <input type="hidden" name="matchId" value={match.id} />
            <button
              type="submit"
              className={styles.adminFilterTab}
              disabled={isClearing}
              style={{ minHeight: "2.4rem" }}
            >
              Borrar
            </button>
          </form>
        ) : null}

        {(showSavedFlag || showClearedFlag) && (
          <span className={styles.adminSavedFlag}>{showSavedFlag || showClearedFlag}</span>
        )}

        {(state.error && state.matchId === match.id) ||
        (clearState.error && clearState.matchId === match.id) ? (
          <span className={styles.adminSavedFlag} style={{ color: "#c8000a" }}>
            {state.error || clearState.error}
          </span>
        ) : null}

        {slotUndefined ? (
          <span className={styles.adminMatchMeta}>Slot indefinido</span>
        ) : null}
      </div>
    </div>
  );
}
