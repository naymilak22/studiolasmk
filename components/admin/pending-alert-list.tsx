"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { listPendingAppointments, setAppointmentStatus } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { formatAppointment } from "@/lib/salon-time";

export type PendingAlert = {
  id: string;
  customer_name: string | null;
  phone: string | null;
  start_time: string;
  total_duration: number;
};

export function PendingAlertList({ appointments: initial }: { appointments: PendingAlert[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [appointments, setAppointments] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const incoming = initial.map((appointment) => appointment.id).join(",");

  useEffect(() => {
    setAppointments(initial);
  }, [incoming, initial]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const rows = await listPendingAppointments();
      if (!ignore) {
        setAppointments(rows);
      }
    }

    load();
    const timer = window.setInterval(load, 15000);
    window.addEventListener("focus", load);

    return () => {
      ignore = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [pathname]);

  if (appointments.length === 0) {
    return null;
  }

  function decide(id: string, status: "approved" | "cancelled") {
    setError("");
    startTransition(async () => {
      const result = await setAppointmentStatus(id, status);
      if (!result.ok) {
        setError("Dejanja ni bilo mogoče shraniti. Pasica ostane, dokler termin ni rešen.");
        return;
      }
      setAppointments((current) => current.filter((item) => item.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="border-b border-primary/15 bg-[#fdecea]">
      <ul className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:px-6">
        {appointments.map((appointment) => (
          <li
            key={appointment.id}
            className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">V čakanju</p>
              <p className="mt-1 truncate text-sm font-medium">
                {appointment.customer_name || appointment.phone || "Novo naročilo"}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatAppointment(appointment.start_time)} · {appointment.total_duration} min
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                className="h-10 flex-1 rounded-full px-4 sm:flex-none"
                disabled={pending}
                onClick={() => decide(appointment.id, "approved")}
              >
                Potrdi
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 rounded-full px-4 sm:flex-none"
                disabled={pending}
                onClick={() => decide(appointment.id, "cancelled")}
              >
                Prekliči
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error ? <p className="mx-auto max-w-6xl px-4 pb-3 text-sm text-foreground sm:px-6">{error}</p> : null}
    </div>
  );
}
