import { headers } from "next/headers";
import { auth } from "@/app/libs/auth";

export type CorrespondantInput = {
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  speciality?: string | null;
  patientslist?: string[];
  notes?: string | null;
};

export type NewCorrespondantInput = CorrespondantInput & {
  name: string;
  email: string;
  patientslist: string[];
};

const allowedFields = new Set([
  "name",
  "email",
  "phone",
  "address",
  "speciality",
  "patientslist",
  "notes",
]);

export async function getAuthenticatedUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export function parseCorrespondantInput(
  request: Request,
  partial: false,
): Promise<{ data: NewCorrespondantInput } | { error: string }>;
export function parseCorrespondantInput(
  request: Request,
  partial: true,
): Promise<{ data: CorrespondantInput } | { error: string }>;
export async function parseCorrespondantInput(
  request: Request,
  partial: boolean,
): Promise<
  { data: CorrespondantInput | NewCorrespondantInput } | { error: string }
> {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { error: "Le corps de la requête doit être un JSON valide." };
    }
    throw error;
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Le corps de la requête doit être un objet JSON." };
  }

  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => !allowedFields.has(key))) {
    return { error: "La requête contient un champ non autorisé." };
  }

  const data: CorrespondantInput = {};

  if (!partial || "name" in input) {
    if (typeof input.name !== "string" || !input.name.trim()) {
      return { error: "Le nom est obligatoire." };
    }
    if (input.name.trim().length > 120) {
      return { error: "Le nom ne peut pas dépasser 120 caractères." };
    }
    data.name = input.name.trim();
  }

  if (!partial || "email" in input) {
    if (
      typeof input.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
    ) {
      return { error: "Une adresse e-mail valide est obligatoire." };
    }
    if (input.email.trim().length > 254) {
      return { error: "L’adresse e-mail ne peut pas dépasser 254 caractères." };
    }
    data.email = input.email.trim().toLowerCase();
  }

  for (const field of ["phone", "address", "speciality", "notes"] as const) {
    if (!(field in input)) {
      continue;
    }

    const value = input[field];
    if (value !== null && typeof value !== "string") {
      return { error: `Le champ ${field} doit être une chaîne ou null.` };
    }
    const maxLength = field === "speciality" ? 120 : 2000;
    if (typeof value === "string" && value.length > maxLength) {
      return {
        error: `Le champ ${field} ne peut pas dépasser ${maxLength} caractères.`,
      };
    }
    data[field] = typeof value === "string" ? value.trim() || null : value;
  }

  if ("patientslist" in input) {
    if (
      !Array.isArray(input.patientslist) ||
      input.patientslist.length > 100 ||
      input.patientslist.some(
        (patient) =>
          typeof patient !== "string" ||
          !patient.trim() ||
          patient.trim().length > 120,
      )
    ) {
      return {
        error:
          "La liste doit contenir au maximum 100 noms de patients de 1 à 120 caractères.",
      };
    }
    data.patientslist = input.patientslist.map((patient) => patient.trim());
  } else if (!partial) {
    data.patientslist = [];
  }

  if (partial && Object.keys(data).length === 0) {
    return { error: "Indiquez au moins un champ à modifier." };
  }

  return { data };
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
