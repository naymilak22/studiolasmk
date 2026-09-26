"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { mailColumns } from "@/lib/email/appointment";
import { mailFromRow, sendCustomerCancelledAlert, sendCustomerDecision } from "@/lib/email/send";
import { createClient } from "@/lib/supabase/server";

export async function cancelAppointment(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/profile");
  }

  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("appointments")
    .select(mailColumns)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/profile");

  if (error?.message.includes("24 ur")) {
    redirect("/profile?notice=locked");
  }

  if (error) {
    redirect("/profile?notice=error");
  }

  const appointment = mailFromRow(existing);
  const customerMail = appointment ? await sendCustomerDecision(appointment, "cancelled") : "none";
  if (appointment) {
    await sendCustomerCancelledAlert(appointment);
  }

  redirect(customerMail === "sent" ? "/profile?notice=cancelled" : "/profile?notice=cancelled-nomail");
}
