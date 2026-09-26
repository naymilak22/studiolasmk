import { listPendingAppointments } from "@/app/admin/actions";
import { PendingAlertList } from "@/components/admin/pending-alert-list";
import { getCurrentProfile } from "@/lib/auth";

export async function PendingAlerts() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") {
    return null;
  }

  const appointments = await listPendingAppointments();
  return <PendingAlertList appointments={appointments} />;
}
