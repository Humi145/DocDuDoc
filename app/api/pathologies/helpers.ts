import { getAuthenticatedUser } from "@/app/api/correspondants/helpers";

export type PathologyInput = {
  name?: string;
  followUp?: string | null;
  speciality?: string | null;
  patients?: string[];
};

export type NewPathologyInput = PathologyInput & {
  name: string;
  patients: string[];
};

const allowedFields = new Set(["name", "followUp", "speciality", "patients"]);

export { getAuthenticatedUser };

export function parsePathologyInput(
  request: Request,
  partial: false,
): Promise<{ data: NewPathologyInput } | { error: string }>;
export function parsePathologyInput(
  request: Request,
  partial: true,
): Promise<{ data: PathologyInput } | { error: string }>;
export async function parsePathologyInput(
  request: Request,
  partial: boolean,
): Promise<
  { data: PathologyInput | NewPathologyInput } | { error: string }
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

  const data: PathologyInput = {};

  if (!partial || "name" in input) {
    if (typeof input.name !== "string" || !input.name.trim()) {
      return { error: "Le nom de la pathologie est obligatoire." };
    }
    if (input.name.trim().length > 120) {
      return { error: "Le nom ne peut pas dépasser 120 caractères." };
    }
    data.name = input.name.trim();
  }

  for (const field of ["followUp", "speciality"] as const) {
    if (!(field in input)) {
      continue;
    }

    const value = input[field];
    if (value !== null && typeof value !== "string") {
      return { error: `Le champ ${field} doit être une chaîne ou null.` };
    }
    const maxLength = field === "speciality" ? 120 : 4000;
    if (typeof value === "string" && value.length > maxLength) {
      return {
        error: `Le champ ${field} ne peut pas dépasser ${maxLength} caractères.`,
      };
    }
    data[field] = typeof value === "string" ? value.trim() || null : value;
  }

  if ("patients" in input) {
    if (
      !Array.isArray(input.patients) ||
      input.patients.length > 100 ||
      input.patients.some(
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
    data.patients = input.patients.map((patient) => patient.trim());
  } else if (!partial) {
    data.patients = [];
  }

  if (partial && Object.keys(data).length === 0) {
    return { error: "Indiquez au moins un champ à modifier." };
  }

  return { data };
}
