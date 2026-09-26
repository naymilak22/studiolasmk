import { genderLabel, type Gender, type PartyDetail } from "@/lib/booking";

export type MailAppointment = {
  customerName: string | null;
  customerEmail: string | null;
  phone: string | null;
  startTime: string;
  totalDuration: number;
  partyCount: number;
  details: PartyDetail[];
};

export type EmailDelivery = "sent" | "failed" | "none";

const genders = new Set<Gender>(["male", "female", "child"]);

export const mailColumns =
  "customer_name, customer_email, phone, start_time, total_duration, party_count, details_json";

export function asMailAppointment(row: {
  customer_name: string | null;
  customer_email: string | null;
  phone: string | null;
  start_time: string;
  total_duration: number;
  party_count: number;
  details_json: unknown;
}): MailAppointment {
  const details = Array.isArray(row.details_json)
    ? row.details_json.flatMap((item) => {
        if (!item || typeof item !== "object") {
          return [];
        }
        const person = item as Partial<PartyDetail>;
        if (!person.gender || !genders.has(person.gender)) {
          return [];
        }
        return [
          {
            gender: person.gender,
            service_id: person.service_id ?? null,
            service_name: person.service_name ?? null,
            custom_description: person.custom_description ?? null,
            duration_minutes: Number(person.duration_minutes) || 0,
          },
        ];
      })
    : [];

  return {
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    phone: row.phone,
    startTime: row.start_time,
    totalDuration: row.total_duration,
    partyCount: row.party_count,
    details,
  };
}

export function serviceLines(appointment: MailAppointment) {
  return appointment.details.map((person) => {
    const who = genderLabel[person.gender];
    const what = person.service_name || person.custom_description || "Storitev";
    return `${who}: ${what}`;
  });
}
