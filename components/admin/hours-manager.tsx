"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createBlackout, deleteBlackout, saveWorkingHours } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { WEEKDAY_NAMES } from "@/lib/salon-time";

export type WorkingHourRow = {
  weekday: number;
  is_closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

export type BlackoutRow = {
  id: string;
  start_date: string;
  end_date: string;
  note: string | null;
};

const fieldClassName =
  "h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

function clock(value: string | null) {
  return value ? value.slice(0, 5) : "08:00";
}

export function HoursManager({
  hours,
  blackouts,
}: {
  hours: WorkingHourRow[];
  blackouts: BlackoutRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(() =>
    hours.map((hour) => ({
      weekday: hour.weekday,
      isClosed: hour.is_closed,
      opensAt: clock(hour.opens_at),
      closesAt: clock(hour.closes_at),
    })),
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");

  function saveHours() {
    setMessage("");
    startTransition(async () => {
      const result = await saveWorkingHours(days);
      setMessage(result.ok ? "Delovni čas je shranjen." : "Delovnega časa ni bilo mogoče shraniti.");
      router.refresh();
    });
  }

  function addClosure() {
    setMessage("");
    startTransition(async () => {
      const result = await createBlackout({ startDate, endDate, note });
      if (result.error === "invalid") {
        setMessage("Konec dopusta mora biti na isti dan ali pozneje.");
        return;
      }
      if (!result.ok) {
        setMessage("Dopusta ni bilo mogoče dodati.");
        return;
      }
      setStartDate("");
      setEndDate("");
      setNote("");
      setMessage("Dopust je dodan. Stranke teh dni ne morejo naročiti.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border bg-background p-5">
        <h2 className="text-lg font-semibold tracking-tight">Delovni čas</h2>
        <div className="mt-4 flex flex-col gap-3">
          {days.map((day, index) => (
            <div key={day.weekday} className="flex flex-col gap-2 text-sm sm:grid sm:grid-cols-[8rem_auto_minmax(0,1fr)] sm:items-center">
              <span>{WEEKDAY_NAMES[day.weekday]}</span>
              <label className="flex items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={day.isClosed}
                  onChange={(event) =>
                    setDays((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, isClosed: event.target.checked } : item,
                      ),
                    )
                  }
                />
                Zaprto
              </label>
              <div className="flex min-w-0 gap-2">
                <input
                  type="time"
                  disabled={day.isClosed}
                  value={day.opensAt}
                  onChange={(event) =>
                    setDays((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, opensAt: event.target.value } : item,
                      ),
                    )
                  }
                  className={`${fieldClassName} min-w-0 flex-1`}
                />
                <input
                  type="time"
                  disabled={day.isClosed}
                  value={day.closesAt}
                  onChange={(event) =>
                    setDays((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, closesAt: event.target.value } : item,
                      ),
                    )
                  }
                  className={`${fieldClassName} min-w-0 flex-1`}
                />
              </div>
            </div>
          ))}
        </div>
        <Button type="button" className="mt-4 h-10 rounded-full px-5" disabled={pending} onClick={saveHours}>
          Shrani ure
        </Button>
      </section>

      <section className="rounded-2xl border bg-background p-5">
        <h2 className="text-lg font-semibold tracking-tight">Dopust in zaprti dnevi</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Od
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={fieldClassName} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Do
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={fieldClassName} />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            Opomba
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Letni dopust"
              className={fieldClassName}
            />
          </label>
        </div>
        <Button type="button" className="mt-4 h-10 rounded-full px-5" disabled={pending} onClick={addClosure}>
          Dodaj zaprtje
        </Button>
        <ul className="mt-4 flex flex-col gap-2">
          {blackouts.map((day) => (
            <li key={day.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2 text-sm">
              <span>
                {day.start_date.slice(0, 10)} – {day.end_date.slice(0, 10)}
                {day.note ? ` · ${day.note}` : ""}
              </span>
              <button
                type="button"
                className="text-primary"
                onClick={() =>
                  startTransition(async () => {
                    await deleteBlackout(day.id);
                    router.refresh();
                  })
                }
              >
                Odstrani
              </button>
            </li>
          ))}
        </ul>
      </section>
      {message ? (
        <p className="text-sm text-muted-foreground lg:col-span-2" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
