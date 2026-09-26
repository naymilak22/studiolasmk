import Link from "next/link";

import { SALON } from "@/lib/salon";
import { formatClock } from "@/lib/salon-time";
import { createClient } from "@/lib/supabase/server";

type WorkingHour = {
  weekday: number;
  is_closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

function hoursLine(hours: WorkingHour[]) {
  const open = hours.filter((hour) => !hour.is_closed && hour.opens_at && hour.closes_at);
  const sameWindow = open.every(
    (hour) => hour.opens_at === open[0]?.opens_at && hour.closes_at === open[0]?.closes_at,
  );
  const tuesdayToSaturday = open.map((hour) => hour.weekday).join(",") === "2,3,4,5,6";

  if (open.length > 0 && sameWindow && tuesdayToSaturday && open[0].opens_at && open[0].closes_at) {
    return `Torek–sobota, ${formatClock(open[0].opens_at)}–${formatClock(open[0].closes_at)}`;
  }

  return "Torek–sobota, 8.00–19.00";
}

export async function SiteFooter() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("working_hours")
    .select("weekday, is_closed, opens_at, closes_at")
    .order("weekday");
  const hours = (data ?? []) as WorkingHour[];

  return (
    <footer className="border-t border-border/80 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Studio Las MK</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{SALON.owner}</p>
          <p className="text-sm leading-6 text-muted-foreground">{SALON.address}</p>
        </div>
        <div className="text-sm leading-6 text-muted-foreground">
          <p>{hoursLine(hours)}</p>
          <p>Nedelja in ponedeljek zaprto</p>
          <a href={`tel:${SALON.phoneTel}`} className="mt-2 inline-block text-primary hover:underline">
            {SALON.phoneDisplay}
          </a>
          <Link href="/book" className="mt-1 block text-primary hover:underline">
            Naroči termin
          </Link>
        </div>
      </div>
    </footer>
  );
}
