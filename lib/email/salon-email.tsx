import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { serviceLines, type MailAppointment } from "@/lib/email/appointment";
import { formatAppointment } from "@/lib/salon-time";

const font = "Helvetica, Arial, sans-serif";

export function SalonEmail({
  preview,
  title,
  intro,
  appointment,
  actionLabel,
  actionHref,
}: {
  preview: string;
  title: string;
  intro: string;
  appointment: MailAppointment;
  actionLabel: string;
  actionHref: string;
}) {
  const lines = serviceLines(appointment);

  return (
    <Html lang="sl">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: font, margin: 0, padding: "32px 12px" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            margin: "0 auto",
            maxWidth: "520px",
            padding: "32px",
          }}
        >
          <Text
            style={{
              color: "#e53935",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.18em",
              margin: "0 0 16px",
              textTransform: "uppercase",
            }}
          >
            Studio Las MK
          </Text>
          <Heading style={{ color: "#111827", fontSize: "24px", fontWeight: 600, margin: "0 0 12px" }}>
            {title}
          </Heading>
          <Text style={{ color: "#4b5563", fontSize: "15px", lineHeight: "24px", margin: "0 0 20px" }}>
            {intro}
          </Text>
          <Section style={{ backgroundColor: "#f9fafb", borderRadius: "12px", padding: "16px 18px" }}>
            <Text style={{ color: "#111827", fontSize: "15px", fontWeight: 600, margin: "0 0 8px" }}>
              {formatAppointment(appointment.startTime)}
            </Text>
            <Text style={{ color: "#4b5563", fontSize: "14px", lineHeight: "22px", margin: 0 }}>
              {appointment.customerName || "Stranka"}
              {appointment.phone ? ` · ${appointment.phone}` : ""}
              {` · ${appointment.totalDuration} min`}
            </Text>
            {lines.map((line, index) => (
              <Text
                key={`${line}-${index}`}
                style={{ color: "#4b5563", fontSize: "14px", lineHeight: "22px", margin: "4px 0 0" }}
              >
                {line}
              </Text>
            ))}
          </Section>
          <Button
            href={actionHref}
            style={{
              backgroundColor: "#e53935",
              borderRadius: "999px",
              color: "#ffffff",
              display: "inline-block",
              fontSize: "14px",
              fontWeight: 600,
              marginTop: "24px",
              padding: "12px 20px",
              textDecoration: "none",
            }}
          >
            {actionLabel}
          </Button>
          <Hr style={{ borderColor: "#e5e7eb", margin: "28px 0 16px" }} />
          <Text style={{ color: "#4b5563", fontSize: "12px", lineHeight: "18px", margin: 0 }}>
            Studio Las MK · Gibina 55 B, Ljutomer · torek–sobota, 8.00–19.00
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
