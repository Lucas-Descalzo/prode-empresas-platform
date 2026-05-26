import type { Metadata } from "next";
import { CalendarPage } from "@/components/calendar-page";

export const metadata: Metadata = {
  title: "Calendario — Fixture Mundial 2026",
  description:
    "Fechas, estadios y ciudades de todos los partidos del Mundial 2026.",
};

export default function Page() {
  return <CalendarPage />;
}
