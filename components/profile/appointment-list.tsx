import { cancelAppointment } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { genderLabel, type PartyDetail } from "@/lib/booking";
import { SALON } from "@/lib/salon";
import { formatAppointment } from "@/lib/salon-time";

export type AppointmentRow = {
  id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "cancelled";
  party_count: number;
  total_duration: number;
  details_json: PartyDetail[];
};

const statusLabel = {
  pending: "V čakanju",
  approved: "Potrjeno",
  cancelled: "Preklicano",
} as const;

function partyWord(count: number) {
  if (count === 1) return "oseba";
  if (count === 2) return "osebi";
  if (count === 3 || count === 4) return "osebe";
  return "oseb";
}

function canChange(startTime: string, status: AppointmentRow["status"]) {
  if (status === "cancelled") {
    return false;
  }
  return new Date(startTime).getTime() - Date.now() > 24 * 60 * 60 * 1000;
}

export function AppointmentList({ appointments }: { appointments: AppointmentRow[] }) {
  const upcoming = appointments.filter(
    (appointment) => appointment.status !== "cancelled" && new Date(appointment.start_time) > new Date(),
  );
  const needsCall = upcoming.some((appointment) => !canChange(appointment.start_time, appointment.status));

  if (appointments.length === 0) {
    return <p className="mt-10 text-sm text-muted-foreground">Nimate še terminov.</p>;
  }

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold tracking-tight">Termini</h2>
      {needsCall ? (
        <p className="mt-4 rounded-2xl bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground" role="status">
          Termin je čez manj kot 24 ur. Za spremembo ali preklic pokličite{" "}
          <a href={`tel:${SALON.phoneTel}`} className="font-medium underline">
            {SALON.phoneDisplay}
          </a>
          .
        </p>
      ) : null}
      <ul className="mt-4 flex flex-col gap-3">
        {appointments.map((appointment) => (
          <li key={appointment.id} className="rounded-2xl border px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{formatAppointment(appointment.start_time)}</p>
              <span className="text-xs text-muted-foreground">{statusLabel[appointment.status]}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {appointment.party_count} {partyWord(appointment.party_count)} · {appointment.total_duration} min
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {appointment.details_json
                .map(
                  (person) =>
                    `${genderLabel[person.gender]}: ${person.service_name ?? person.custom_description ?? "Storitev"}`,
                )
                .join(" · ")}
            </p>
            {canChange(appointment.start_time, appointment.status) ? (
              <form action={cancelAppointment} className="mt-4">
                <input type="hidden" name="id" value={appointment.id} />
                <Button type="submit" variant="outline" className="rounded-full">
                  Prekliči
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
