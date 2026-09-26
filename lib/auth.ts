import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: "client" | "admin";
};

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/profile";
  }

  return value;
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.toLowerCase());
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const profile = data as Profile;

  if (profile.role !== "admin" && isAdminEmail(user.email)) {
    const service = createServiceClient();
    const { error } = await service.from("profiles").update({ role: "admin" }).eq("id", user.id);
    if (!error) {
      profile.role = "admin";
    }
  }

  return profile;
}
