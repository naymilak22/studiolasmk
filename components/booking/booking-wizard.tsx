"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createBooking, getAvailableSlots } from "@/app/book/actions";
import { DateCalendar, initialMonth } from "@/components/booking/date-calendar";
import { Button } from "@/components/ui/button";
import {
  CUSTOM_SERVICE_MINUTES,
  describeParty,
  emptyPerson,
  genderLabel,
  MAX_PARTY,
  servicesForGender,
  type Gender,
  type PersonInput,
  type SavedParty,
  type ServiceOption,
} from "@/lib/booking";
import { formatAppointment, formatSlotTime, salonDateString } from "@/lib/salon-time";

const fieldClassName =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

type BookingWizardProps = {
  services: ServiceOption[];
  phone: string;
  savedParty: SavedParty | null;
  closedWeekdays: number[];
  blackouts: { start_date: string; end_date: string; note?: string | null }[];
};

const steps = ["Osebe", "Termin", "Potrditev"];

export function BookingWizard({
  services,
  phone: initialPhone,
  savedParty,
  closedWeekdays,
  blackouts,
}: BookingWizardProps) {
  const today = salonDateString();
  const [step, setStep] = useState(0);
  const [partyCount, setPartyCount] = useState(1);
  const [people, setPeople] = useState<PersonInput[]>([emptyPerson()]);
  const [phone, setPhone] = useState(initialPhone);
  const [useSaved, setUseSaved] = useState(false);
  const [formError, setFormError] = useState("");
  const [month, setMonth] = useState(initialMonth(today));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slotMessage, setSlotMessage] = useState("");
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [notified, setNotified] = useState(false);
  const [pending, startTransition] = useTransition();

  const preview = describeParty(people, services);
  const totalMinutes = "total" in preview ? preview.total : 0;

  function resizeParty(count: number) {
    setPartyCount(count);
    setPeople((current) =>
      Array.from({ length: count }, (_, index) => current[index] ?? emptyPerson()),
    );
    setUseSaved(false);
  }

  function updatePerson(index: number, patch: Partial<PersonInput>) {
    setPeople((current) =>
      current.map((person, personIndex) => {
        if (personIndex !== index) {
          return person;
        }
        const next = { ...person, ...patch };
        if (patch.gender && next.serviceId) {
          const allowed = servicesForGender(services, next.gender).some(
            (service) => service.id === next.serviceId,
          );
          if (!allowed) {
            next.serviceId = null;
          }
        }
        return next;
      }),
    );
    setUseSaved(false);
  }

  function applySaved(checked: boolean) {
    setUseSaved(checked);
    if (!checked || !savedParty) {
      return;
    }
    const count = Math.min(savedParty.party_count, MAX_PARTY);
    setPartyCount(count);
    setPeople(
      savedParty.people.slice(0, count).map((person) => ({
        gender: person.gender,
        serviceId: services.some((service) => service.id === person.service_id)
          ? person.service_id
          : null,
        customDescription: person.custom_description ?? person.service_name ?? "",
      })),
    );
    if (savedParty.phone) {
      setPhone(savedParty.phone);
    }
  }

  function continueToTime() {
    const party = describeParty(people, services);
    if ("error" in party && party.error) {
      setFormError(party.error);
      return;
    }
    if (phone.trim().length < 6) {
      setFormError("Vpišite telefonsko številko.");
      return;
    }
    setFormError("");
    setStep(1);
  }

  function chooseDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlotMessage("");
    setSlots([]);
    startTransition(async () => {
      const result = await getAvailableSlots(date, people);
      if (result.error) {
        setSlotMessage(result.error);
        return;
      }
      setSlots(result.slots ?? []);
      if ((result.slots ?? []).length === 0) {
        setSlotMessage("Ta dan ni prostega termina za izbrano trajanje.");
      }
    });
  }

  function confirmBooking() {
    if (!selectedSlot) {
      setFormError("Izberite uro.");
      return;
    }
    setFormError("");
    startTransition(async () => {
      const result = await createBooking({ phone, people, startTime: selectedSlot });
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setNotified(Boolean(result.notified));
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border bg-background px-6 py-10 text-center shadow-sm">
        <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">Naročilo</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Termin je oddan</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {notified
            ? "Naročilo čaka na potrditev. Salon smo obvestili po e-pošti. Ko bo termin potrjen, dobite sporočilo."
            : "Naročilo čaka na potrditev. E-pošte salonu ni bilo mogoče poslati. Stanje lahko spremljate v profilu."}
        </p>
        <Button asChild className="mt-8 h-11 rounded-full px-6">
          <Link href="/profile">Odpri profil</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <ol className="mb-8 flex gap-2" aria-label="Koraki naročanja">
        {steps.map((label, index) => (
          <li
            key={label}
            className={`flex-1 rounded-full px-3 py-2 text-center text-xs font-medium ${
              index === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
            aria-current={index === step ? "step" : undefined}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <section className="rounded-2xl border bg-background p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Kdo prihaja?</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Za vsako osebo izberite storitev. Opis po meri traja {CUSTOM_SERVICE_MINUTES} minut.
          </p>

          {savedParty ? (
            <label className="mt-6 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={useSaved}
                onChange={(event) => applySaved(event.target.checked)}
              />
              Uporabi moje zadnje naročilo
            </label>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-4">
            <span className="text-sm font-medium">Število oseb</span>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Manj oseb"
                onClick={() => resizeParty(Math.max(1, partyCount - 1))}
                disabled={partyCount <= 1}
              >
                −
              </Button>
              <span className="w-6 text-center text-sm font-medium">{partyCount}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Več oseb"
                onClick={() => resizeParty(Math.min(MAX_PARTY, partyCount + 1))}
                disabled={partyCount >= MAX_PARTY}
              >
                +
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-5">
            {people.map((person, index) => {
              const options = servicesForGender(services, person.gender);
              return (
                <fieldset key={index} className="rounded-2xl border p-4">
                  <legend className="px-1 text-sm font-medium">Oseba {index + 1}</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm">
                      Spol
                      <select
                        className={fieldClassName}
                        value={person.gender}
                        onChange={(event) =>
                          updatePerson(index, { gender: event.target.value as Gender })
                        }
                      >
                        {(Object.keys(genderLabel) as Gender[]).map((gender) => (
                          <option key={gender} value={gender}>
                            {genderLabel[gender]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      Storitev
                      <select
                        className={fieldClassName}
                        value={person.serviceId ?? ""}
                        onChange={(event) =>
                          updatePerson(index, { serviceId: event.target.value || null })
                        }
                      >
                        <option value="">Opis po meri</option>
                        {options.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} · {service.duration_minutes} min
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {person.serviceId ? null : (
                    <label className="mt-3 flex flex-col gap-2 text-sm">
                      Opis
                      <textarea
                        className="min-h-24 rounded-xl border border-input px-3 py-2 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
                        value={person.customDescription}
                        onChange={(event) =>
                          updatePerson(index, { customDescription: event.target.value })
                        }
                      />
                    </label>
                  )}
                </fieldset>
              );
            })}
          </div>

          <label className="mt-6 flex flex-col gap-2 text-sm font-medium">
            Telefon
            <input
              className={fieldClassName}
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <p className="mt-4 text-sm text-muted-foreground">Skupaj {totalMinutes} min</p>
          {formError ? (
            <p className="mt-3 text-sm text-primary" role="alert">
              {formError}
            </p>
          ) : null}
          <Button type="button" className="mt-6 h-11 rounded-full px-6" onClick={continueToTime}>
            Naprej
          </Button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="rounded-2xl border bg-background p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Izberite dan in uro</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Potrebujemo {totalMinutes} minut. Prikazani so samo prihodnji prosti začetki.
          </p>
          <div className="mt-6">
            <DateCalendar
              today={today}
              month={month}
              selected={selectedDate}
              closedWeekdays={closedWeekdays}
              blackouts={blackouts}
              onMonth={setMonth}
              onSelect={chooseDate}
            />
          </div>
          <div className="mt-6">
            {pending ? <p className="text-sm text-muted-foreground">Nalagam ure…</p> : null}
            {slotMessage ? (
              <p className="text-sm text-muted-foreground" role="status">
                {slotMessage}
              </p>
            ) : null}
            {slots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    aria-pressed={slot === selectedSlot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`h-11 rounded-xl border text-sm ${
                      slot === selectedSlot
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {formatSlotTime(slot)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {formError ? (
            <p className="mt-3 text-sm text-primary" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="mt-6 flex gap-3">
            <Button type="button" variant="outline" className="h-11 rounded-full px-6" onClick={() => setStep(0)}>
              Nazaj
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full px-6"
              disabled={!selectedSlot}
              onClick={() => {
                setFormError("");
                setStep(2);
              }}
            >
              Naprej
            </Button>
          </div>
        </section>
      ) : null}

      {step === 2 && selectedSlot ? (
        <section className="rounded-2xl border bg-background p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Potrditev</h1>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Začetek</dt>
              <dd className="text-right font-medium">{formatAppointment(selectedSlot)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Trajanje</dt>
              <dd className="font-medium">{totalMinutes} min</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Telefon</dt>
              <dd className="font-medium">{phone}</dd>
            </div>
          </dl>
          <ul className="mt-6 flex flex-col gap-2 text-sm">
            {people.map((person, index) => {
              const service = services.find((item) => item.id === person.serviceId);
              return (
                <li key={index} className="rounded-xl bg-muted px-3 py-2">
                  {genderLabel[person.gender]} · {service?.name ?? person.customDescription}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Naročilo bo v statusu čakanja, dokler ga salon ne potrdi.
          </p>
          {formError ? (
            <p className="mt-3 text-sm text-primary" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="mt-6 flex gap-3">
            <Button type="button" variant="outline" className="h-11 rounded-full px-6" onClick={() => setStep(1)}>
              Nazaj
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full px-6"
              disabled={pending}
              onClick={confirmBooking}
            >
              {pending ? "Oddajam…" : "Oddaj naročilo"}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
