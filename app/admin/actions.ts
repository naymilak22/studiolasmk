"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth";
import { mailColumns, type EmailDelivery } from "@/lib/email/appointment";
import { mailFromRow, sendCustomerDecision, sendCustomerUpdate } from "@/lib/email/send";
import { createClient } from "@/lib/supabase/server";

export type AdminActionResult = {
  ok?: boolean;
  error?: "overlap" | "save" | "invalid";
  email?: EmailDelivery;
};

export async function listPendingAppointments() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("id, customer_name, phone, start_time, total_duration")
    .eq("status", "pending")
    .order("start_time");

  return data ?? [];
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/");
  }
}

function saved(error: { code?: string } | null): AdminActionResult {
  if (!error) {
    revalidatePath("/admin");
    return { ok: true };
  }
  if (error.code === "23P01") {
    return { error: "overlap" };
  }
  return { error: "save" };
}

export async function moveAppointment(
  id: string,
  startTime: string,
  totalDuration: number,
  allowOverlap: boolean,
): Promise<AdminActionResult> {
  await requireAdmin();
  if (totalDuration < 15) {
    return { error: "invalid" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("appointments")
    .select(mailColumns)
    .eq("id", id)
    .maybeSingle();
  const { data, error } = await supabase
    .from("appointments")
    .update({
      start_time: startTime,
      total_duration: totalDuration,
      allow_overlap: allowOverlap,
    })
    .eq("id", id)
    .select(mailColumns)
    .maybeSingle();
  const result = saved(error);
  if (!result.ok) {
    return result;
  }

  revalidatePath("/profile");
  const before = mailFromRow(existing);
  const after = mailFromRow(data);
  if (!before || !after) {
    return { ...result, email: "none" };
  }

  const sameStart = new Date(before.startTime).getTime() === new Date(after.startTime).getTime();
  const sameDuration = before.totalDuration === after.totalDuration;
  if (sameStart && sameDuration) {
    return { ...result, email: "none" };
  }

  const email = await sendCustomerUpdate(after, {
    startTime: before.startTime,
    totalDuration: before.totalDuration,
  });
  return { ...result, email };
}

export async function setAppointmentStatus(
  id: string,
  status: "approved" | "cancelled",
): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .select(mailColumns)
    .maybeSingle();
  const result = saved(error);
  if (!result.ok) {
    return result;
  }

  revalidatePath("/profile");
  const appointment = mailFromRow(data);
  const email = appointment ? await sendCustomerDecision(appointment, status) : "none";
  return { ...result, email };
}

export async function deleteAppointment(id: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  const result = saved(error);
  if (result.ok) {
    revalidatePath("/profile");
  }
  return result;
}

export async function createManualAppointment(input: {
  customerName: string;
  phone: string;
  startTime: string;
  totalDuration: number;
  description: string;
  allowOverlap: boolean;
}): Promise<AdminActionResult> {
  await requireAdmin();
  const name = input.customerName.trim();
  const description = input.description.trim() || "Ročni vnos";
  if (!name || input.totalDuration < 15) {
    return { error: "invalid" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").insert({
    customer_name: name,
    phone: input.phone.trim() || null,
    party_count: 1,
    details_json: [
      {
        gender: "female",
        service_id: null,
        service_name: null,
        custom_description: description,
        duration_minutes: input.totalDuration,
      },
    ],
    total_duration: input.totalDuration,
    start_time: input.startTime,
    end_time: input.startTime,
    status: "approved",
    source: "manual",
    allow_overlap: input.allowOverlap,
  });

  return saved(error);
}

export async function saveWorkingHours(
  days: { weekday: number; isClosed: boolean; opensAt: string; closesAt: string }[],
): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  for (const day of days) {
    const { error } = await supabase
      .from("working_hours")
      .update({
        is_closed: day.isClosed,
        opens_at: day.isClosed ? null : day.opensAt,
        closes_at: day.isClosed ? null : day.closesAt,
      })
      .eq("weekday", day.weekday);

    if (error) {
      return { error: "save" };
    }
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function createBlackout(input: {
  startDate: string;
  endDate: string;
  note: string;
}): Promise<AdminActionResult> {
  await requireAdmin();
  if (!input.startDate || !input.endDate || input.endDate < input.startDate) {
    return { error: "invalid" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("blackout_days").insert({
    start_date: input.startDate,
    end_date: input.endDate,
    note: input.note.trim() || null,
  });

  if (!error) {
    revalidatePath("/admin");
    revalidatePath("/book");
  }

  return saved(error);
}

export async function deleteBlackout(id: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("blackout_days").delete().eq("id", id);
  if (!error) {
    revalidatePath("/admin");
    revalidatePath("/book");
  }
  return saved(error);
}
