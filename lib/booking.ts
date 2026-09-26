export type Gender = "male" | "female" | "child";

export type ServiceOption = {
  id: string;
  name: string;
  duration_minutes: number;
  category: string;
  audience: Gender | "any";
};

export type PersonInput = {
  gender: Gender;
  serviceId: string | null;
  customDescription: string;
};

export type PartyDetail = {
  gender: Gender;
  service_id: string | null;
  service_name: string | null;
  custom_description: string | null;
  duration_minutes: number;
};

export type SavedParty = {
  party_count: number;
  phone: string;
  people: PartyDetail[];
};

export const CUSTOM_SERVICE_MINUTES = 30;
export const MAX_PARTY = 6;

export const genderLabel: Record<Gender, string> = {
  male: "Moški",
  female: "Ženska",
  child: "Otrok",
};

export function emptyPerson(): PersonInput {
  return { gender: "female", serviceId: null, customDescription: "" };
}

export function servicesForGender(services: ServiceOption[], gender: Gender) {
  return services.filter((service) => service.audience === "any" || service.audience === gender);
}

export function describeParty(
  people: PersonInput[],
  services: ServiceOption[],
): { error: string } | { details: PartyDetail[]; total: number } {
  const details: PartyDetail[] = [];

  for (const person of people) {
    const custom = person.customDescription.trim();
    const service = person.serviceId
      ? services.find((item) => item.id === person.serviceId)
      : undefined;

    if (service && (service.audience === "any" || service.audience === person.gender)) {
      details.push({
        gender: person.gender,
        service_id: service.id,
        service_name: service.name,
        custom_description: custom || null,
        duration_minutes: service.duration_minutes,
      });
      continue;
    }

    if (custom.length >= 3) {
      details.push({
        gender: person.gender,
        service_id: null,
        service_name: null,
        custom_description: custom,
        duration_minutes: CUSTOM_SERVICE_MINUTES,
      });
      continue;
    }

    return { error: "Za vsako osebo izberite storitev ali vpišite kratek opis." };
  }

  const total = details.reduce((sum, item) => sum + item.duration_minutes, 0);
  return { details, total };
}
