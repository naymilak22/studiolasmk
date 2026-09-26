import { AdminCalendar } from "@/components/admin/admin-calendar";
import { HoursManager, type BlackoutRow, type WorkingHourRow } from "@/components/admin/hours-manager";
import type { CalendarAppointment } from "@/components/admin/salon-calendar";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Salon",
};

export default async function AdminPage() {
  const supabase = await createClient();
  const [{ data: appointments }, { data: hours }, { data: blackouts }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, customer_name, phone, party_count, details_json, total_duration, start_time, end_time, status, source, allow_overlap, notes",
      )
      .neq("status", "cancelled")
      .order("start_time"),
    supabase.from("working_hours").select("weekday, is_closed, opens_at, closes_at").order("weekday"),
    supabase.from("blackout_days").select("id, start_date, end_date, note").order("start_date"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <div>
        <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">Salon</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Koledar</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Termin premaknete, raztegnete ali uredite. Stranka dobi eno e-pošto z novim časom.
          Potrditev in preklic prav tako pošljeta e-pošto. Izbriši odstrani termin brez obvestila.
        </p>
      </div>
      <AdminCalendar
        appointments={(appointments ?? []) as CalendarAppointment[]}
        blackouts={(blackouts ?? []) as { id: string; start_date: string; end_date: string; note: string | null }[]}
      />
      <HoursManager hours={(hours ?? []) as WorkingHourRow[]} blackouts={(blackouts ?? []) as BlackoutRow[]} />
    </main>
  );
}
