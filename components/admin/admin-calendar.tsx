"use client";

import dynamic from "next/dynamic";

import type { CalendarAppointment } from "@/components/admin/salon-calendar";

const SalonCalendar = dynamic(
  () => import("@/components/admin/salon-calendar").then((mod) => mod.SalonCalendar),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted-foreground">Nalagam koledar…</p>,
  },
);

export function AdminCalendar({
  appointments,
  blackouts,
}: {
  appointments: CalendarAppointment[];
  blackouts: { id: string; start_date: string; end_date: string; note: string | null }[];
}) {
  return <SalonCalendar appointments={appointments} blackouts={blackouts} />;
}
