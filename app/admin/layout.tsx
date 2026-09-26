import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentProfile } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login?next=/admin");
  }

  if (profile.role !== "admin") {
    redirect("/");
  }

  return children;
}
