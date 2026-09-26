"use client";

import { addDays, formatSalonDate, salonDateString, weekdayIndex } from "@/lib/salon-time";

const WEEK_HEADERS = ["Po", "To", "Sr", "Če", "Pe", "So", "Ne"];

type DateCalendarProps = {
  today: string;
  month: string;
  selected: string | null;
  closedWeekdays: number[];
  blackouts: { start_date: string; end_date: string; note?: string | null }[];
  onMonth: (month: string) => void;
  onSelect: (date: string) => void;
};

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("sl-SI", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function daysInMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  const value = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
  return value;
}

export function DateCalendar({
  today,
  month,
  selected,
  closedWeekdays,
  blackouts,
  onMonth,
  onSelect,
}: DateCalendarProps) {
  const count = daysInMonth(month);
  const firstWeekday = weekdayIndex(`${month}-01`);
  const leading = (firstWeekday + 6) % 7;
  const cells = [...Array(leading).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  const horizon = addDays(today, 90);
  const currentMonth = today.slice(0, 7);

  function disabledReason(iso: string) {
    if (iso < today || iso > horizon) {
      return "Ta dan ni na voljo.";
    }
    if (closedWeekdays.includes(weekdayIndex(iso))) {
      return "Salon je ta dan zaprt.";
    }
    if (blackouts.some((range) => iso >= range.start_date.slice(0, 10) && iso <= range.end_date.slice(0, 10))) {
      return "Salon je ta dan zaprt.";
    }
    return null;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="rounded-full px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-40"
          onClick={() => onMonth(shiftMonth(month, -1))}
          disabled={month <= currentMonth}
        >
          Prejšnji
        </button>
        <p className="text-sm font-medium capitalize">{monthLabel(month)}</p>
        <button
          type="button"
          className="rounded-full px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-40"
          onClick={() => onMonth(shiftMonth(month, 1))}
          disabled={shiftMonth(month, 1) > horizon.slice(0, 7)}
        >
          Naslednji
        </button>
      </div>
      {blackouts.length > 0 ? (
        <ul className="mb-4 flex flex-col gap-1 text-sm text-muted-foreground">
          {blackouts.map((range) => (
            <li key={`${range.start_date}-${range.end_date}`}>
              Zaprto: {formatSalonDate(range.start_date)} – {formatSalonDate(range.end_date)}
              {range.note ? ` (${range.note})` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEK_HEADERS.map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} />;
          }
          const iso = `${month}-${String(day).padStart(2, "0")}`;
          const reason = disabledReason(iso);
          const isSelected = iso === selected;
          return (
            <button
              key={iso}
              type="button"
              disabled={Boolean(reason)}
              aria-label={reason ? `${iso}. ${reason}` : iso}
              aria-pressed={isSelected}
              onClick={() => onSelect(iso)}
              className={`h-10 rounded-xl text-sm ${
                reason
                  ? "cursor-not-allowed bg-muted text-muted-foreground/50 line-through"
                  : isSelected
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function initialMonth(today = salonDateString()) {
  return today.slice(0, 7);
}
