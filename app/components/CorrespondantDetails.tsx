"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type Correspondant = {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  speciality: string | null;
  patientslist: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type DetailState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "ready"; correspondant: Correspondant };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function normalizeCorrespondant(value: unknown): Correspondant | null {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.email !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  const patientslist = value.patientslist;

  if (
    !isNullableString(value.phone) ||
    !isNullableString(value.address) ||
    !isNullableString(value.speciality) ||
    !isNullableString(value.notes) ||
    !Array.isArray(patientslist) ||
    !patientslist.every((patient: unknown) => typeof patient === "string")
  ) {
    return null;
  }

  return {
    name: value.name,
    email: value.email,
    phone: value.phone,
    address: value.address,
    speciality: value.speciality,
    patientslist,
    notes: value.notes,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date inconnue"
    : date.toLocaleString("fr-FR");
}

function Information({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-(--foreground)/70">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words">{children}</dd>
    </div>
  );
}

export default function CorrespondantDetails({ id }: { id: string }) {
  const [state, setState] = useState<DetailState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadCorrespondant() {
      try {
        const response = await fetch(
          `/api/correspondants/${encodeURIComponent(id)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
          },
        );

        if (!isMounted) {
          return;
        }

        if (response.status === 401) {
          setState({ status: "unauthenticated" });
          return;
        }

        if (response.status === 404) {
          setState({ status: "not-found" });
          return;
        }

        if (!response.ok) {
          throw new Error("Impossible de charger ce correspondant.");
        }

        const payload: unknown = await response.json();
        const correspondant =
          isRecord(payload) && "correspondant" in payload
            ? normalizeCorrespondant(payload.correspondant)
            : null;

        if (!correspondant) {
          throw new Error("La réponse de l’API est invalide.");
        }

        if (isMounted) {
          setState({ status: "ready", correspondant });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Une erreur inattendue est survenue.",
          });
        }
      }
    }

    void loadCorrespondant();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <main className="min-h-screen px-6 py-12">
      <section
        aria-labelledby="correspondant-title"
        className="mx-auto w-full max-w-2xl"
      >
        <Link
          href="/correspondants"
          className="font-semibold text-(--primary) underline hover:text-(--foreground)"
        >
          Retour aux correspondants
        </Link>

        {state.status === "loading" && (
          <p role="status" className="mt-8">
            Chargement du correspondant…
          </p>
        )}

        {state.status === "unauthenticated" && (
          <p className="mt-8">
            <Link
              href="/signin"
              className="font-semibold text-(--primary) underline"
            >
              Connectez-vous
            </Link>{" "}
            pour consulter ce correspondant.
          </p>
        )}

        {state.status === "not-found" && (
          <p role="alert" className="mt-8 text-red-700">
            Ce correspondant est introuvable ou n’est pas accessible.
          </p>
        )}

        {state.status === "error" && (
          <p role="alert" className="mt-8 text-red-700">
            {state.message}
          </p>
        )}

        {state.status === "ready" && (
          <>
            <h1
              id="correspondant-title"
              className="mt-8 text-3xl font-bold text-(--foreground)"
            >
              {state.correspondant.name}
            </h1>

            <dl className="mt-6 grid gap-5 rounded-xl border border-(--foreground)/15 bg-white/80 p-6 text-(--text) shadow-sm sm:grid-cols-2">
              <Information label="Adresse e-mail">
                <a
                  href={`mailto:${state.correspondant.email}`}
                  className="text-(--primary) hover:underline"
                >
                  {state.correspondant.email}
                </a>
              </Information>
              <Information label="Téléphone">
                {state.correspondant.phone ? (
                  <a
                    href={`tel:${state.correspondant.phone}`}
                    className="text-(--primary) hover:underline"
                  >
                    {state.correspondant.phone}
                  </a>
                ) : (
                  "Non renseigné"
                )}
              </Information>
              <Information label="Spécialité">
                {state.correspondant.speciality || "Non renseignée"}
              </Information>
              <Information label="Adresse">
                {state.correspondant.address || "Non renseignée"}
              </Information>
              <div className="sm:col-span-2">
                <Information label="Patients">
                  {state.correspondant.patientslist.length > 0 ? (
                    <ul className="list-inside list-disc">
                      {state.correspondant.patientslist.map(
                        (patient, index) => (
                          <li key={`${patient}-${index}`}>{patient}</li>
                        ),
                      )}
                    </ul>
                  ) : (
                    "Aucun patient renseigné"
                  )}
                </Information>
              </div>
              <div className="sm:col-span-2">
                <Information label="Notes">
                  {state.correspondant.notes || "Aucune note"}
                </Information>
              </div>
              <Information label="Ajouté le">
                {formatDate(state.correspondant.createdAt)}
              </Information>
              <Information label="Dernière modification">
                {formatDate(state.correspondant.updatedAt)}
              </Information>
            </dl>
          </>
        )}
      </section>
    </main>
  );
}
