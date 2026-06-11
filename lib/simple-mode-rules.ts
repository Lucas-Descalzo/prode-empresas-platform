import { groupMatchSchedule } from "@/lib/corporate/group-schedule";
import { normalizeFixtureState } from "@/lib/world-cup-fixture";
import type { FixtureState } from "@/lib/world-cup-types";

const SIMPLE_MODE_KICKOFF_HOUR_UTC = "15:00:00Z";

export const SIMPLE_MODE_PRE_WORLD_CUP_MAX_POINTS = 112;
export const SIMPLE_MODE_KNOCKOUT_MAX_POINTS = 116;
export const SIMPLE_MODE_TOTAL_MAX_POINTS =
  SIMPLE_MODE_PRE_WORLD_CUP_MAX_POINTS + SIMPLE_MODE_KNOCKOUT_MAX_POINTS;

const firstGroupMatchDate = [...groupMatchSchedule]
  .map((match) => match.date)
  .sort()[0];

export const SIMPLE_MODE_CUTOFF_AT = `${firstGroupMatchDate}T${SIMPLE_MODE_KICKOFF_HOUR_UTC}`;
const TM_BOXING_SIMPLE_MODE_CUTOFF_AT = "2026-06-12T19:00:00Z";

export interface SimpleModePointBlock {
  title: string;
  maxPoints: number;
  rows: Array<{
    label: string;
    points: string;
    note?: string;
  }>;
}

export interface SimpleModeFaqItem {
  question: string;
  answer: string[];
}

export const SIMPLE_MODE_POINT_BLOCKS: SimpleModePointBlock[] = [
  {
    title: "Fase de grupos",
    maxPoints: SIMPLE_MODE_PRE_WORLD_CUP_MAX_POINTS,
    rows: [
      {
        label: "Equipo en su posición exacta del grupo (1°, 2°, 3° o 4°)",
        points: "+2",
      },
      {
        label: "Top-2 acertado, pero con 1° y 2° invertidos",
        points: "+1 por equipo",
        note: "Es crédito parcial y ya está incluido dentro del máximo de grupos.",
      },
      {
        label: "Cada mejor tercero que efectivamente avanza a 16avos",
        points: "+2",
      },
    ],
  },
  {
    title: "Eliminatoria",
    maxPoints: SIMPLE_MODE_KNOCKOUT_MAX_POINTS,
    rows: [
      {
        label: "El equipo llega a octavos de final",
        points: "+2",
      },
      {
        label: "El equipo llega a cuartos de final",
        points: "+4",
      },
      {
        label: "El equipo llega a semifinales",
        points: "+6",
      },
      {
        label: "El equipo llega a la final",
        points: "+8",
      },
      {
        label: "Campeón",
        points: "+10",
      },
      {
        label: "Ganador del partido por el 3° puesto",
        points: "+2",
      },
    ],
  },
];

export const SIMPLE_MODE_FAQS: SimpleModeFaqItem[] = [
  {
    question: "¿Hasta cuándo puedo cargar mi prode?",
    answer: [
      "Tenés tiempo hasta el jueves 11 de junio de 2026 a las 12:00 del mediodía (hora de Argentina).",
      "Una vez que se cumple ese horario, las predicciones de grupos y cuadro quedan cerradas y ya no se pueden editar.",
    ],
  },
  {
    question: "¿Puedo modificar mi predicción después de cargarla?",
    answer: [
      "Sí. Podés editar todas las veces que quieras mientras el Mundial no haya empezado.",
      "Cuenta la última versión guardada antes del cierre.",
    ],
  },
  {
    question: "¿Tengo que cargar todo de una vez?",
    answer: [
      "No. Podés avanzar por partes y volver más tarde.",
      "Tu progreso queda guardado, pero para competir tiene que quedar completo antes del cierre.",
    ],
  },
  {
    question: "¿Qué pasa si no completo mi prode antes del primer partido?",
    answer: [
      "Si queda incompleto al inicio del Mundial, no suma puntos.",
      "No hay carga retroactiva porque el juego está pensado para predecir antes de que empiece el torneo.",
    ],
  },
  {
    question: "¿Qué son los mejores terceros?",
    answer: [
      "En el Mundial 2026 pasan a 16avos los dos primeros de cada grupo más los 8 mejores terceros entre los 12 grupos.",
      "Vos elegís cuáles creés que van a ser esos 8 terceros que avanzan. Cada acierto suma 2 puntos.",
    ],
  },
  {
    question: "¿Y si acierto los dos primeros del grupo pero invierto el 1° y el 2°?",
    answer: [
      "Recibís 1 punto por cada uno de esos dos equipos en lugar de 2 puntos por acierto exacto.",
      "Ese crédito parcial solo aplica al top-2 del grupo.",
    ],
  },
  {
    question: "¿Cómo puntúa la eliminatoria?",
    answer: [
      "Se puntúa por equipo y por ronda alcanzada, no por llave exacta.",
      "Si bancaste a un equipo hasta semifinales y en la realidad llega a semifinales, cobrás octavos + cuartos + semifinales aunque haya llegado por el otro lado del cuadro.",
    ],
  },
  {
    question: "¿Qué pasa si puse a un equipo como campeón y termina cayendo antes?",
    answer: [
      "Cobrás todos los escalones que efectivamente alcanzó en la realidad, hasta el máximo de ronda que vos lo bancaste.",
      "Por ejemplo, si lo pusiste campeón y cae en semis, suma 2 + 4 + 6 = 12 puntos.",
    ],
  },
  {
    question: "¿Cuándo se actualiza el ranking?",
    answer: [
      "Los puntos de fase de grupos aparecen cuando termina la fase de grupos.",
      "La eliminatoria se va sumando ronda por ronda a medida que se cargan los resultados oficiales.",
    ],
  },
  {
    question: "¿Cómo se desempata si dos personas terminan con el mismo puntaje?",
    answer: [
      "Primero desempata quien tenga más puntos en fase de grupos.",
      "Si persiste, queda como empate compartido en esa posición.",
    ],
  },
  {
    question: "¿Qué pasa si un partido se define por penales?",
    answer: [
      "En Modo Simple no importa el marcador ni los penales, solo qué equipo avanza a la ronda siguiente.",
      "Por eso el panel operador debe dejar marcado quién avanzó en los cruces empatados.",
    ],
  },
  {
    question: "¿Puedo jugar desde el celular?",
    answer: [
      "Sí. La plataforma funciona en computadora y en mobile.",
      "La carga puede empezarse en un momento y retomarse más tarde antes del cierre.",
    ],
  },
];

const TM_BOXING_FAQS: SimpleModeFaqItem[] = [
  {
    question: "¿Cómo me registro en el prode de TM Boxing?",
    answer: [
      "Usá el link privado que recibiste de TM Boxing. Ingresás con tu DNI y creás tu propia clave.",
      "Si no tenés el link o perdiste el acceso, consultá con el equipo de TM Boxing.",
    ],
  },
  {
    question: "¿Puedo participar si entreno en otra sede?",
    answer: [
      "Sí. El ranking es único para toda la comunidad de TM Boxing, sin importar si entrenás en Centro o Funes.",
      "En la tabla vas a ver de qué sede es cada participante.",
    ],
  },
  {
    question: "¿Hay premios para el ganador?",
    answer: [
      "Los premios los define TM Boxing. Consultá con el equipo del gym para saber qué hay en juego.",
    ],
  },
];

export function getSimpleModeFaqs(slug: string): SimpleModeFaqItem[] {
  if (slug === "tm-boxing") {
    return [...SIMPLE_MODE_FAQS, ...TM_BOXING_FAQS];
  }
  return SIMPLE_MODE_FAQS;
}

export function getSimpleModeCutoffDate(slug?: string) {
  return new Date(
    slug === "tm-boxing" ? TM_BOXING_SIMPLE_MODE_CUTOFF_AT : SIMPLE_MODE_CUTOFF_AT,
  );
}

export function isSimpleModeLocked(now = new Date(), slug?: string) {
  return now.getTime() >= getSimpleModeCutoffDate(slug).getTime();
}

export function isSimpleModePredictionComplete(
  source: Partial<FixtureState> | FixtureState,
) {
  const state = normalizeFixtureState(source);

  return (
    state.qualifiedThirdPlaces.length === 8 &&
    Object.keys(state.knockoutWinners).length === 32
  );
}

export function formatSimpleModeCutoffLabel(slug?: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(getSimpleModeCutoffDate(slug));
}

export function getSimpleModeCountdownLabel(now = new Date(), slug?: string) {
  const diffMs = getSimpleModeCutoffDate(slug).getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Predicción cerrada";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `Faltan ${days}d ${hours}h para el cierre`;
  }

  if (hours > 0) {
    return `Faltan ${hours}h ${minutes}m para el cierre`;
  }

  return `Faltan ${minutes}m para el cierre`;
}
