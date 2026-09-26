"use server";

import { sendNewBookingAlert } from "@/lib/email/send";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  describeParty,
  MAX_PARTY,
  type Gender,
  type PersonInput,
  type ServiceOption,
} from "@/lib/booking";

export type SlotResult = { slots?: string[]; error?: string };
export type BookingResult = { ok?: boolean; error?: string; notified?: boolean };

function isGender(value: string): value is Gender {
  return value === "male" || value === "female" || value === "child";
}

async function closureMessage(date: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blackout_days")
    .select("note")
    .lte("start_date", date)
    .gte("end_date", date)
    .limit(1);

  const note = data?.[0]?.note?.trim();
  if (!data?.length) {
    return null;
  }

  return note ? `Salon je ta dan zaprt (${note}).` : "Salon je ta dan zaprt.";
}

async function loadServices() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, category, audience")
    .eq("is_active", true);

  if (error || !data) {
    return [];
  }

  return data as ServiceOption[];
}

export async function getAvailableSlots(date: string, people: PersonInput[]): Promise<SlotResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Za izbiro termina se prijavite." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Izberite veljaven dan." };
  }

  const closed = await closureMessage(date);
  if (closed) {
    return { error: closed };
  }

  const services = await loadServices();
  const party = describeParty(people, services);
  if ("error" in party) {
    return { error: party.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("available_start_times", {
    p_date: date,
    p_duration_minutes: party.total,
  });

  if (error) {
    return { error: "Terminov trenutno ni mogoče naložiti." };
  }

  const slots = (data ?? [])
    .map((row: { start_time?: string } | string) =>
      typeof row === "string" ? row : row.start_time,
    )
    .filter((value: string | undefined): value is string => Boolean(value));

  return { slots };
}

export async function createBooking(input: {
  phone: string;
  people: PersonInput[];
  startTime: string;
}): Promise<BookingResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Za naročilo se prijavite." };
  }

  const phone = input.phone.trim();
  if (phone.length < 6) {
    return { error: "Vpišite telefonsko številko." };
  }

  if (input.people.length < 1 || input.people.length > MAX_PARTY) {
    return { error: "Število oseb ni veljavno." };
  }

  if (!input.people.every((person) => isGender(person.gender))) {
    return { error: "Izberite spol za vsako osebo." };
  }

  const services = await loadServices();
  const party = describeParty(input.people, services);
  if ("error" in party) {
    return { error: party.error };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Ljubljana",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(input.startTime));

  const closed = await closureMessage(day);
  if (closed) {
    return { error: closed };
  }

  const { data: openSlots, error: slotsError } = await supabase.rpc("available_start_times", {
    p_date: day,
    p_duration_minutes: party.total,
  });

  if (slotsError) {
    return { error: "Termina ni bilo mogoče preveriti." };
  }

  const requested = new Date(input.startTime).getTime();
  const stillOpen = (openSlots ?? []).some((row: { start_time?: string } | string) => {
    const value = typeof row === "string" ? row : row.start_time;
    return value ? new Date(value).getTime() === requested : false;
  });

  if (!stillOpen) {
    return { error: "Ta termin ni več prost. Izberite drugega." };
  }

  const { error: insertError } = await supabase.from("appointments").insert({
    user_id: user.id,
    customer_name: profile?.full_name ?? null,
    customer_email: profile?.email ?? user.email,
    phone,
    party_count: party.details.length,
    details_json: party.details,
    total_duration: party.total,
    start_time: new Date(requested).toISOString(),
    end_time: new Date(requested).toISOString(),
    status: "pending",
    source: "online",
    allow_overlap: false,
  });

  if (insertError) {
    if (insertError.code === "23P01") {
      return { error: "Ta termin ni več prost. Izberite drugega." };
    }
    return { error: "Naročila ni bilo mogoče oddati." };
  }

  await supabase
    .from("profiles")
    .update({
      phone,
      last_booking: {
        party_count: party.details.length,
        phone,
        people: party.details,
      },
    })
    .eq("id", user.id);

  const notified = await sendNewBookingAlert({
    customerName: profile?.full_name ?? null,
    customerEmail: profile?.email ?? user.email ?? null,
    phone,
    startTime: new Date(requested).toISOString(),
    totalDuration: party.total,
    partyCount: party.details.length,
    details: party.details,
  });

  return { ok: true, notified: notified === "sent" };
}
