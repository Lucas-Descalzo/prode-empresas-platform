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
    title: "Pre-Mundial",
    maxPoints: SIMPLE_MODE_PRE_WORLD_CUP_MAX_POINTS,
    rows: [
      {
        label: "Equipo en su posicion exacta del grupo (1.o, 2.o, 3.o o 4.o)",
        points: "+2",
      },
      {
        label: "Top-2 acertado, pero con 1.o y 2.o invertidos",
        points: "+1 por equipo",
        note: "Es credito parcial y ya esta incluido dentro del maximo de grupos.",
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
        label: "Campeon",
        points: "+10",
      },
      {
        label: "Ganador del partido por el 3.er puesto",
        points: "+2",
      },
    ],
  },
];

export const SIMPLE_MODE_FAQS: SimpleModeFaqItem[] = [
  {
    question: "¿Hasta cuando puedo cargar mi prode?",
    answer: [
      "Tenes tiempo hasta el inicio del primer partido del Mundial, el 11 de junio de 2026.",
      "Una vez que arranca el torneo, las predicciones de grupos y cuadro quedan cerradas.",
    ],
  },
  {
    question: "¿Puedo modificar mi prediccion despues de cargarla?",
    answer: [
      "Si. Podes editar todas las veces que quieras mientras el Mundial no haya empezado.",
      "Cuenta la ultima version guardada antes del cierre.",
    ],
  },
  {
    question: "¿Tengo que cargar todo de una vez?",
    answer: [
      "No. Podes avanzar por partes y volver mas tarde.",
      "Tu progreso queda guardado, pero para competir tiene que quedar completo antes del cierre.",
    ],
  },
  {
    question: "¿Que pasa si no completo mi prode antes del primer partido?",
    answer: [
      "Si queda incompleto al inicio del Mundial, no suma puntos.",
      "No hay carga retroactiva porque el juego esta pensado para predecir antes de que empiece el torneo.",
    ],
  },
  {
    question: "¿Que son los mejores terceros?",
    answer: [
      "En el Mundial 2026 pasan a 16avos los dos primeros de cada grupo mas los 8 mejores terceros entre los 12 grupos.",
      "Vos elegis cuales crees que van a ser esos 8 terceros que avanzan. Cada acierto suma 2 puntos.",
    ],
  },
  {
    question: "¿Y si acierto los dos primeros del grupo pero invierto el 1.o y el 2.o?",
    answer: [
      "Recibis 1 punto por cada uno de esos dos equipos en lugar de 2 puntos por acierto exacto.",
      "Ese credito parcial solo aplica al top-2 del grupo.",
    ],
  },
  {
    question: "¿Como puntua la eliminatoria?",
    answer: [
      "Se puntua por equipo y por ronda alcanzada, no por llave exacta.",
      "Si bancaste a un equipo hasta semifinales y en la realidad llega a semifinales, cobras octavos + cuartos + semifinales aunque haya llegado por el otro lado del cuadro.",
    ],
  },
  {
    question: "¿Que pasa si puse a un equipo como campeon y termina cayendo antes?",
    answer: [
      "Cobras todos los escalones que efectivamente alcanzo en la realidad, hasta el maximo de ronda que vos lo bancaste.",
      "Por ejemplo, si lo pusiste campeon y cae en semis, suma 2 + 4 + 6 = 12 puntos.",
    ],
  },
  {
    question: "¿Cuando se actualiza el ranking?",
    answer: [
      "Los puntos del pre-Mundial aparecen cuando termina la fase de grupos.",
      "La eliminatoria se va sumando ronda por ronda a medida que se cargan los resultados oficiales.",
    ],
  },
  {
    question: "¿Como se desempata si dos personas terminan con el mismo puntaje?",
    answer: [
      "Primero desempata quien tenga mas puntos del pre-Mundial.",
      "Si persiste, queda como empate compartido en esa posicion.",
    ],
  },
  {
    question: "¿Que pasa si un partido se define por penales?",
    answer: [
      "En Modo Simple no importa el marcador ni los penales, solo que equipo avanza a la ronda siguiente.",
      "Por eso el panel operador debe dejar marcado quien avanzo en los cruces empatados.",
    ],
  },
  {
    question: "¿Puedo jugar desde el celular?",
    answer: [
      "Si. La plataforma funciona en computadora y en mobile.",
      "La carga puede empezarse en un momento y retomarse mas tarde antes del cierre.",
    ],
  },
];

export function getSimpleModeCutoffDate() {
  return new Date(SIMPLE_MODE_CUTOFF_AT);
}

export function isSimpleModeLocked(now = new Date()) {
  return now.getTime() >= getSimpleModeCutoffDate().getTime();
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

export function formatSimpleModeCutoffLabel() {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(getSimpleModeCutoffDate());
}

export function getSimpleModeCountdownLabel(now = new Date()) {
  const diffMs = getSimpleModeCutoffDate().getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Prediccion cerrada";
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
