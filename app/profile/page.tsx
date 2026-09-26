import { redirect } from "next/navigation";

import { AppointmentList, type AppointmentRow } from "@/components/profile/appointment-list";
import { ProfileForm } from "@/components/profile/profile-form";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Profil",
};

const notices = {
  cancelled: "Termin je preklican. Potrditev je poslana na vaš e-poštni naslov.",
  "cancelled-nomail": "Termin je preklican. E-pošte ni bilo mogoče poslati.",
  locked: "Termin je čez manj kot 24 ur. Za spremembo ali preklic pokličite (02) 589 14 15.",
  error: "Termina ni bilo mogoče preklicati.",
} as const;

type ProfilePageProps = {
  searchParams: Promise<{ notice?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const profile = await getCurrentProfile();
  const params = await searchParams;

  if (!profile) {
    redirect("/login?next=/profile");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("id, start_time, end_time, status, party_count, total_duration, details_json")
    .eq("user_id", profile.id)
    .order("start_time", { ascending: false });

  const notice = params.notice && params.notice in notices ? notices[params.notice as keyof typeof notices] : null;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-12 sm:px-6">
      <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">Račun</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Profil</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Telefon se samodejno vpiše ob naslednjem naročilu.
      </p>
      {notice ? (
        <p className="mt-4 rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground" role="status">
          {notice}
        </p>
      ) : null}
      <ProfileForm
        email={profile.email ?? ""}
        fullName={profile.full_name ?? ""}
        phone={profile.phone ?? ""}
      />
      <AppointmentList appointments={(data ?? []) as AppointmentRow[]} />
    </main>
  );
}
