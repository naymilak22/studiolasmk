export const SALON_TIME_ZONE = "Europe/Ljubljana";

export const WEEKDAY_NAMES = [
  "Nedelja",
  "Ponedeljek",
  "Torek",
  "Sreda",
  "Četrtek",
  "Petek",
  "Sobota",
] as const;

export function salonDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SALON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function weekdayIndex(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function formatClock(value: string) {
  const [hour, minute] = value.slice(0, 5).split(":");
  return `${Number(hour)}.${minute}`;
}

export function formatSalonDate(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("sl-SI", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatSlotTime(value: string) {
  return new Intl.DateTimeFormat("sl-SI", {
    timeZone: SALON_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function salonLocalToIso(date: string, time: string) {
  const utcGuess = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcGuess);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const hour = read("hour") === "24" ? "00" : read("hour");
  const zonedAsUtc = Date.UTC(
    Number(read("year")),
    Number(read("month")) - 1,
    Number(read("day")),
    Number(hour),
    Number(read("minute")),
    Number(read("second")),
  );

  return new Date(utcGuess.getTime() - (zonedAsUtc - utcGuess.getTime())).toISOString();
}

export function salonTimeInput(value: string) {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: SALON_TIME_ZONE,
  }).format(new Date(value));
  return formatted === "24:00" ? "00:00" : formatted;
}

export function formatAppointment(value: string) {
  return new Intl.DateTimeFormat("sl-SI", {
    timeZone: SALON_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
