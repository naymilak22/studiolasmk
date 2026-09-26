import { redirect } from "next/navigation";

import { BookingWizard } from "@/components/booking/booking-wizard";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import type { SavedParty, ServiceOption } from "@/lib/booking";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Naročilo",
};

function savedParty(value: unknown): SavedParty | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const party = value as SavedParty;
  if (!Array.isArray(party.people) || party.people.length === 0) {
    return null;
  }

  return party;
}

export default async function BookPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/book");
  }

  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const [{ data: services }, { data: hours }, { data: blackouts }, { data: bookingProfile }] =
    await Promise.all([
      supabase
        .from("services")
        .select("id, name, duration_minutes, category, audience")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("working_hours").select("weekday, is_closed").eq("is_closed", true),
      supabase.from("blackout_days").select("start_date, end_date, note"),
      supabase.from("profiles").select("phone, last_booking").eq("id", user.id).maybeSingle(),
    ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <BookingWizard
        services={(services ?? []) as ServiceOption[]}
        phone={bookingProfile?.phone ?? profile?.phone ?? ""}
        savedParty={savedParty(bookingProfile?.last_booking)}
        closedWeekdays={(hours ?? []).map((hour) => hour.weekday)}
        blackouts={blackouts ?? []}
      />
    </main>
  );
}
