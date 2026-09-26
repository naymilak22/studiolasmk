import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { ServiceOption } from "@/lib/booking";
import { SALON } from "@/lib/salon";
import { formatClock, WEEKDAY_NAMES } from "@/lib/salon-time";

export const metadata = {
  description: "Frizerski salon Studio Las MK v Gibini pri Ljutomeru. Striženje, barvanje in urejanje las.",
};

type WorkingHour = {
  weekday: number;
  is_closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: services }, { data: hours }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_minutes, category, audience")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("working_hours").select("weekday, is_closed, opens_at, closes_at").order("weekday"),
  ]);

  const serviceList = (services ?? []) as ServiceOption[];
  const categories = [...new Set(serviceList.map((service) => service.category))];

  return (
    <main>
      <section className="bg-muted">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">Studio Las MK</p>
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Frizerski studio v Gibini
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Striženje, barvanje in urejanje las za ženske, moške in otroke. Salon vodi {SALON.owner}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-11 rounded-full px-6">
              <Link href="/book">Naroči termin</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full px-6">
              <Link href="/#storitve">Storitve</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="o-nas" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">O nas</p>
        <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight">Salon za lase, v mirnem tempu.</h2>
        <div className="mt-4 max-w-2xl space-y-4 text-base leading-7 text-muted-foreground">
          <p>
            Studio Las MK je frizerski salon v Gibini pri Ljutomeru. Tu se striže, barva in ureja lase za
            vso družino — od kratkega moškega striženja do barvanja, pramenov in fen frizure.
          </p>
          <p>
            Delo poteka v majhnem studiu, z osebnim pristopom in s časom, ki ga frizura potrebuje. Salon
            vodi {SALON.owner}
          </p>
        </div>
      </section>

      <section id="storitve" className="bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">Storitve</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Kaj lahko naročite</h2>
          <div className="mt-10 flex flex-col gap-10">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-foreground">{category}</h3>
                <ul className="mt-3 divide-y divide-border rounded-2xl border bg-background">
                  {serviceList
                    .filter((service) => service.category === category)
                    .map((service) => (
                      <li key={service.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                        <span className="min-w-0">{service.name}</span>
                        <span className="shrink-0 text-muted-foreground">{service.duration_minutes} min</span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="delovni-cas" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">Delovni čas</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Kdaj smo odprti</h2>
        <ul className="mt-8 max-w-md divide-y divide-border rounded-2xl border">
          {((hours ?? []) as WorkingHour[]).map((hour) => (
            <li key={hour.weekday} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{WEEKDAY_NAMES[hour.weekday]}</span>
              <span className="text-muted-foreground">
                {hour.is_closed || !hour.opens_at || !hour.closes_at
                  ? "Zaprto"
                  : `${formatClock(hour.opens_at)}–${formatClock(hour.closes_at)}`}
              </span>
            </li>
          ))}
        </ul>
        <div id="kje-smo" className="mt-12 max-w-md rounded-2xl border px-4 py-4 text-sm leading-6">
          <p className="font-medium text-foreground">{SALON.address}</p>
          <p className="text-muted-foreground">Gibina, Razkrižje</p>
          <a href={`tel:${SALON.phoneTel}`} className="mt-2 inline-block font-medium text-primary">
            {SALON.phoneDisplay}
          </a>
          <a
            href={SALON.mapsUrl}
            className="mt-1 block text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Navodila za pot
          </a>
        </div>
        <Button asChild className="mt-8 h-11 rounded-full px-6">
          <Link href="/book">Naroči termin</Link>
        </Button>
      </section>
    </main>
  );
}
