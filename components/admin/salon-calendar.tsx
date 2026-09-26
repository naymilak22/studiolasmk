"use client";

import slLocale from "@fullcalendar/core/locales/sl";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createManualAppointment,
  deleteAppointment,
  moveAppointment,
  setAppointmentStatus,
  type AdminActionResult,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { genderLabel, type PartyDetail } from "@/lib/booking";
import { addDays, formatAppointment, salonDateString, salonLocalToIso, salonTimeInput } from "@/lib/salon-time";

export type CalendarAppointment = {
  id: string;
  customer_name: string | null;
  phone: string | null;
  party_count: number;
  details_json: PartyDetail[];
  total_duration: number;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "cancelled";
  source: "online" | "manual";
  allow_overlap: boolean;
  notes: string | null;
};

function moveMessage(result: AdminActionResult) {
  if (!result.ok) {
    return "Termina ni bilo mogoče premakniti.";
  }
  if (result.email === "sent") {
    return "Ura je spremenjena. Stranka je obveščena po e-pošti.";
  }
  if (result.email === "failed") {
    return "Ura je spremenjena. E-pošte ni bilo mogoče poslati.";
  }
  return "Ura je spremenjena.";
}

function resultMessage(result: AdminActionResult, done: string, failed: string) {
  if (!result.ok) {
    return `Termina ni bilo mogoče ${failed}.`;
  }
  if (result.email === "sent") {
    return `Termin je ${done}. Stranka je obveščena po e-pošti.`;
  }
  if (result.email === "failed") {
    return `Termin je ${done}. E-pošte ni bilo mogoče poslati.`;
  }
  return `Termin je ${done}.`;
}

const fieldClassName =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

const statusLabel = {
  pending: "V čakanju",
  approved: "Potrjeno",
  cancelled: "Preklicano",
} as const;

function eventColors(appointment: CalendarAppointment) {
  if (appointment.source === "manual") {
    return { backgroundColor: "#111827", borderColor: "#111827", textColor: "#ffffff" };
  }
  if (appointment.status === "pending") {
    return { backgroundColor: "#fdecea", borderColor: "#e53935", textColor: "#7f1d1d" };
  }
  return { backgroundColor: "#e53935", borderColor: "#e53935", textColor: "#ffffff" };
}

function titleFor(appointment: CalendarAppointment) {
  return appointment.customer_name || appointment.phone || "Termin";
}

export function SalonCalendar({
  appointments,
  blackouts,
}: {
  appointments: CalendarAppointment[];
  blackouts: { id: string; start_date: string; end_date: string; note: string | null }[];
}) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const compactRef = useRef<boolean | null>(null);
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [overlap, setOverlap] = useState<{ id: string; start: string; duration: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ date: salonDateString(), time: "09:00", duration: 60 });
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({
    customerName: "",
    phone: "",
    date: salonDateString(),
    time: "09:00",
    duration: 60,
    description: "",
    allowOverlap: false,
  });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      const next = media.matches;
      const first = compactRef.current === null;
      if (compactRef.current === next) {
        return;
      }
      compactRef.current = next;
      setCompact(next);
      if (!first) {
        calendarRef.current?.getApi().changeView(next ? "timeGridDay" : "timeGridWeek");
      }
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const selected = appointments.find((appointment) => appointment.id === selectedId) ?? null;
  const events = [
    ...blackouts.map((day) => ({
      id: `blackout-${day.id}`,
      title: day.note || "Zaprto",
      start: day.start_date.slice(0, 10),
      end: addDays(day.end_date.slice(0, 10), 1),
      display: "background" as const,
      backgroundColor: "#f3f4f6",
      editable: false,
    })),
    ...appointments.map((appointment) => ({
      id: appointment.id,
      title: titleFor(appointment),
      start: appointment.start_time,
      end: appointment.end_time,
      ...eventColors(appointment),
      extendedProps: { allowOverlap: appointment.allow_overlap },
    })),
  ];

  function applyMove(info: { event: { id: string; start: Date | null; end: Date | null }; revert: () => void }, allowOverlap: boolean) {
    const start = info.event.start;
    const end = info.event.end;
    if (!start || !end) {
      info.revert();
      return;
    }
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    startTransition(async () => {
      const result = await moveAppointment(info.event.id, start.toISOString(), duration, allowOverlap);
      if (result.error === "overlap") {
        info.revert();
        setOverlap({ id: info.event.id, start: start.toISOString(), duration });
        setMessage("Termin se prekriva z drugim. Lahko ga shranite kot vzporednega.");
        return;
      }
      if (result.error) {
        info.revert();
        setMessage("Termina ni bilo mogoče premakniti.");
        return;
      }
      setOverlap(null);
      setMessage(moveMessage(result));
      router.refresh();
    });
  }

  function onMove(info: EventDropArg | EventResizeDoneArg) {
    const current = appointments.find((appointment) => appointment.id === info.event.id);
    applyMove(info, current?.allow_overlap ?? false);
  }

  function openManual(selection?: DateSelectArg) {
    const start = selection?.start;
    setManual((current) => ({
      ...current,
      date: start ? salonDateString(start) : current.date,
      time: start
        ? new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
            timeZone: "Europe/Ljubljana",
          }).format(start)
        : current.time,
      duration: selection
        ? Math.max(30, Math.round((selection.end.getTime() - selection.start.getTime()) / 60000))
        : current.duration,
    }));
    setManualOpen(true);
    selection?.view.calendar.unselect();
  }

  function saveManual() {
    setMessage("");
    startTransition(async () => {
      const result = await createManualAppointment({
        customerName: manual.customerName,
        phone: manual.phone,
        startTime: salonLocalToIso(manual.date, manual.time),
        totalDuration: Number(manual.duration),
        description: manual.description,
        allowOverlap: manual.allowOverlap,
      });
      if (result.error === "overlap") {
        setMessage("Ta ura je zasedena. Označite vzporedni termin ali izberite drugo uro.");
        return;
      }
      if (result.error === "invalid") {
        setMessage("Vpišite ime in trajanje vsaj 15 minut.");
        return;
      }
      if (!result.ok) {
        setMessage("Ročnega termina ni bilo mogoče dodati.");
        return;
      }
      setManualOpen(false);
      setManual((current) => ({ ...current, customerName: "", phone: "", description: "" }));
      setMessage("Ročni termin je v koledarju.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <i className="inline-block size-3 rounded-full bg-[#fdecea] ring-1 ring-[#e53935]" /> V čakanju
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="inline-block size-3 rounded-full bg-[#e53935]" /> Potrjeno
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="inline-block size-3 rounded-full bg-[#111827]" /> Ročno
          </span>
        </div>
        <Button type="button" className="h-10 rounded-full px-5" onClick={() => openManual()}>
          Nov termin
        </Button>
      </div>

      {message ? (
        <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-foreground" role="status">
          {message}
        </p>
      ) : null}
      {overlap ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm">
          <span>Shranim prekrivanje? Stranka dobi e-pošto o novi uri.</span>
          <Button
            type="button"
            className="h-9 rounded-full"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await moveAppointment(overlap.id, overlap.start, overlap.duration, true);
                setOverlap(null);
                setMessage(result.ok ? moveMessage(result) : "Termina ni bilo mogoče shraniti.");
                router.refresh();
              })
            }
          >
            Shrani vzporedno
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => setOverlap(null)}>
            Opusti
          </Button>
        </div>
      ) : null}

      <div className="salon-calendar rounded-2xl border bg-background p-3 sm:p-5">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          locale={slLocale}
          initialView={compact ? "timeGridDay" : "timeGridWeek"}
          firstDay={1}
          headerToolbar={
            compact
              ? { left: "prev,next", center: "title", right: "today" }
              : { left: "prev,next today", center: "title", right: "timeGridDay,timeGridWeek,dayGridMonth" }
          }
          footerToolbar={
            compact ? { left: "timeGridDay,timeGridWeek,dayGridMonth", center: "", right: "" } : false
          }
          buttonText={{ today: "Danes", day: "Dan", week: "Teden", month: "Mesec" }}
          slotMinTime="08:00:00"
          slotMaxTime="19:00:00"
          allDaySlot={false}
          nowIndicator
          height="auto"
          editable
          selectable
          selectMirror
          events={events}
          eventDrop={onMove}
          eventResize={onMove}
          eventClick={(info: EventClickArg) => {
            if (info.event.display === "background") {
              return;
            }
            setSelectedId(info.event.id);
            setEditing(false);
          }}
          select={(selection) => openManual(selection)}
        />
      </div>

      {selected ? (
        <section className="rounded-2xl border bg-background p-5" aria-label="Podrobnosti termina">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
                {selected.source === "manual" ? "Ročni vnos" : statusLabel[selected.status]}
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">{titleFor(selected)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{formatAppointment(selected.start_time)}</p>
            </div>
            <button type="button" className="text-sm text-muted-foreground" onClick={() => setSelectedId(null)}>
              Zapri
            </button>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Telefon</dt>
              <dd>{selected.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Trajanje</dt>
              <dd>{selected.total_duration} min</dd>
            </div>
          </dl>
          <ul className="mt-4 flex flex-col gap-1 text-sm">
            {selected.details_json.map((person, index) => (
              <li key={index}>
                {genderLabel[person.gender] ?? "Oseba"}: {person.service_name ?? person.custom_description ?? "Storitev"}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            {selected.status === "pending" ? (
              <Button
                type="button"
                className="h-10 rounded-full px-4"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await setAppointmentStatus(selected.id, "approved");
                    setMessage(resultMessage(result, "potrjen", "potrditi"));
                    router.refresh();
                  })
                }
              >
                Potrdi
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-4"
              disabled={pending}
              onClick={() => {
                setEdit({
                  date: salonDateString(new Date(selected.start_time)),
                  time: salonTimeInput(selected.start_time),
                  duration: selected.total_duration,
                });
                setEditing(true);
              }}
            >
              Uredi
            </Button>
            {selected.status !== "cancelled" ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-4"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await setAppointmentStatus(selected.id, "cancelled");
                    setSelectedId(null);
                    setMessage(resultMessage(result, "preklican", "preklicati"));
                    router.refresh();
                  })
                }
              >
                Prekliči
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="h-10 rounded-full px-4"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteAppointment(selected.id);
                  setSelectedId(null);
                  setMessage(result.ok ? "Termin je izbrisan. Stranka ni obveščena." : "Termina ni bilo mogoče izbrisati.");
                  router.refresh();
                })
              }
            >
              Izbriši
            </Button>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Potrdi sprejme termin in pošlje potrditev. Prekliči ga označi kot preklicanega in o tem obvesti stranko;
            v profilu ostane zapisan. Uredi spremeni datum, uro ali trajanje in pošlje e-pošto z novim časom. Izbriši
            odstrani termin brez e-pošte.
          </p>
          {editing ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                Datum
                <input
                  type="date"
                  className={fieldClassName}
                  value={edit.date}
                  onChange={(event) => setEdit({ ...edit, date: event.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Ura
                <input
                  type="time"
                  className={fieldClassName}
                  value={edit.time}
                  onChange={(event) => setEdit({ ...edit, time: event.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Trajanje (min)
                <input
                  type="number"
                  min={15}
                  step={15}
                  className={fieldClassName}
                  value={edit.duration}
                  onChange={(event) => setEdit({ ...edit, duration: Number(event.target.value) })}
                />
              </label>
              <div className="flex gap-2 sm:col-span-3">
                <Button
                  type="button"
                  className="h-10 rounded-full px-5"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await moveAppointment(
                        selected.id,
                        salonLocalToIso(edit.date, edit.time),
                        Number(edit.duration),
                        selected.allow_overlap,
                      );
                      if (result.error === "overlap") {
                        setMessage("Ta ura je zasedena. Premaknite termin na prosto uro ali ga raztegnite čez drugega in shranite vzporedno.");
                        return;
                      }
                      if (result.error === "invalid") {
                        setMessage("Trajanje mora biti vsaj 15 minut.");
                        return;
                      }
                      setEditing(false);
                      setMessage(moveMessage(result));
                      router.refresh();
                    })
                  }
                >
                  Shrani spremembo
                </Button>
                <Button type="button" variant="outline" className="h-10 rounded-full px-5" onClick={() => setEditing(false)}>
                  Zapri
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {manualOpen ? (
        <section className="rounded-2xl border bg-background p-5">
          <h2 className="text-lg font-semibold tracking-tight">Nov ročni termin</h2>
          <p className="mt-1 text-sm text-muted-foreground">Za klic ali stranko na vratih. Takoj zasede uro.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Ime
              <input className={fieldClassName} value={manual.customerName} onChange={(event) => setManual({ ...manual, customerName: event.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Telefon
              <input className={fieldClassName} value={manual.phone} onChange={(event) => setManual({ ...manual, phone: event.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Datum
              <input type="date" className={fieldClassName} value={manual.date} onChange={(event) => setManual({ ...manual, date: event.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Ura
              <input type="time" className={fieldClassName} value={manual.time} onChange={(event) => setManual({ ...manual, time: event.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Trajanje (min)
              <input type="number" min={15} step={15} className={fieldClassName} value={manual.duration} onChange={(event) => setManual({ ...manual, duration: Number(event.target.value) })} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Opis
              <input className={fieldClassName} value={manual.description} onChange={(event) => setManual({ ...manual, description: event.target.value })} />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={manual.allowOverlap} onChange={(event) => setManual({ ...manual, allowOverlap: event.target.checked })} />
            Vzporedni termin, tudi če se ura prekriva
          </label>
          <div className="mt-4 flex gap-2">
            <Button type="button" className="h-10 rounded-full px-5" disabled={pending} onClick={saveManual}>
              Shrani
            </Button>
            <Button type="button" variant="outline" className="h-10 rounded-full px-5" onClick={() => setManualOpen(false)}>
              Zapri
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
