import { Resend } from "resend";

import { asMailAppointment, type EmailDelivery, type MailAppointment } from "@/lib/email/appointment";
import { SalonEmail } from "@/lib/email/salon-email";
import { formatAppointment } from "@/lib/salon-time";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function adminRecipients() {
  const explicit = (process.env.ADMIN_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (explicit.length > 0) {
    return explicit;
  }

  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function customerAddress(appointment: MailAppointment) {
  const email = appointment.customerEmail?.trim() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

async function deliver(input: {
  to: string[];
  subject: string;
  replyTo?: string;
  preview: string;
  title: string;
  intro: string;
  appointment: MailAppointment;
  actionLabel: string;
  actionHref: string;
}): Promise<EmailDelivery> {
  if (input.to.length === 0) {
    return "none";
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    console.error("Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
    return "failed";
  }

  const resend = new Resend(apiKey);
  let sent = false;

  for (const to of input.to) {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: input.subject,
      replyTo: input.replyTo,
      react: SalonEmail({
        preview: input.preview,
        title: input.title,
        intro: input.intro,
        appointment: input.appointment,
        actionLabel: input.actionLabel,
        actionHref: input.actionHref,
      }),
    });

    if (error) {
      console.error("Resend:", error.message);
      continue;
    }

    sent = true;
  }

  return sent ? "sent" : "failed";
}

export async function sendNewBookingAlert(appointment: MailAppointment) {
  const replyTo = customerAddress(appointment) ?? undefined;
  return deliver({
    to: adminRecipients(),
    subject: "Novo naročilo — Studio Las MK",
    replyTo,
    preview: "Novo naročilo čaka na potrditev.",
    title: "Novo naročilo",
    intro: "Stranka je oddala termin. Potrdite ga ali prekličite v koledarju.",
    appointment,
    actionLabel: "Odpri koledar",
    actionHref: `${siteUrl()}/admin`,
  });
}

export async function sendCustomerDecision(appointment: MailAppointment, status: "approved" | "cancelled") {
  const to = customerAddress(appointment);
  const confirmed = status === "approved";
  return deliver({
    to: to ? [to] : [],
    subject: confirmed ? "Termin je potrjen — Studio Las MK" : "Termin je preklican — Studio Las MK",
    preview: confirmed ? "Vaš termin je potrjen." : "Vaš termin je preklican.",
    title: confirmed ? "Termin je potrjen" : "Termin je preklican",
    intro: confirmed
      ? "Salon je potrdil vaš termin. Veselimo se obiska."
      : "Ta termin je preklican. Za nov termin se lahko znova naročite na spletu.",
    appointment,
    actionLabel: "Odpri profil",
    actionHref: `${siteUrl()}/profile`,
  });
}

export async function sendCustomerUpdate(
  appointment: MailAppointment,
  previous: { startTime: string; totalDuration: number },
) {
  const to = customerAddress(appointment);
  const timeChanged = new Date(previous.startTime).getTime() !== new Date(appointment.startTime).getTime();
  const durationChanged = previous.totalDuration !== appointment.totalDuration;
  const previousWhen = formatAppointment(previous.startTime);
  let intro = "Vaš termin je spremenjen. Novi podatki so spodaj.";

  if (timeChanged && durationChanged) {
    intro = `Vaš termin je prestavljen in trajanje je spremenjeno. Prej je bil ${previousWhen}, ${previous.totalDuration} min. Novi podatki so spodaj.`;
  } else if (timeChanged) {
    intro = `Vaš termin je prestavljen. Prej je bil ${previousWhen}. Novi čas je spodaj.`;
  } else if (durationChanged) {
    intro = `Trajanje vašega termina je spremenjeno s ${previous.totalDuration} na ${appointment.totalDuration} min. Novi podatki so spodaj.`;
  }

  return deliver({
    to: to ? [to] : [],
    subject: "Termin je spremenjen — Studio Las MK",
    preview: "Ura vašega termina je spremenjena.",
    title: "Termin je spremenjen",
    intro,
    appointment,
    actionLabel: "Odpri profil",
    actionHref: `${siteUrl()}/profile`,
  });
}

export async function sendCustomerCancelledAlert(appointment: MailAppointment) {
  const replyTo = customerAddress(appointment) ?? undefined;
  return deliver({
    to: adminRecipients(),
    subject: "Preklic naročila — Studio Las MK",
    replyTo,
    preview: "Stranka je preklicala termin.",
    title: "Stranka je preklicala termin",
    intro: "Termin je sproščen in ga lahko znova ponudite.",
    appointment,
    actionLabel: "Odpri koledar",
    actionHref: `${siteUrl()}/admin`,
  });
}

export function mailFromRow(row: Parameters<typeof asMailAppointment>[0] | null) {
  return row ? asMailAppointment(row) : null;
}
