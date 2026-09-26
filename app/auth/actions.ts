"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = {
  error?: string;
  ok?: boolean;
};

export async function updateProfile(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      phone: phone || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Podatkov ni bilo mogoče shraniti." };
  }

  revalidatePath("/profile");
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
