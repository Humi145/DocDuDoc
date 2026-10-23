
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type CorrespondantListItem = {
  id: string;
  name: string;
  email: string;
  speciality: string | null;
  patientslist: string[];
};

type CorrespondantsResponse = {
  correspondants: CorrespondantListItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCorrespondant(
  value: unknown,
): CorrespondantListItem | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.email !== "string"
  ) {
    return null;
  }

  const speciality = value.speciality ?? null;
  const patientslist = value.patientslist ?? [];

  if (
    (typeof speciality !== "string" && speciality !== null) ||
    !Array.isArray(patientslist) ||
    !patientslist.every((patient: unknown) => typeof patient === "string")
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    email: value.email,
    speciality,
    patientslist,
  };
}

type ViewState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "error"; message: string }
  | { status: "ready"; correspondants: CorrespondantListItem[] };

function isCorrespondantsResponse(
  value: unknown,
): value is CorrespondantsResponse {
  if (!isRecord(value) || !Array.isArray(value.correspondants)) {
    return false;
  }

  const correspondants = value.correspondants.map(normalizeCorrespondant);
  if (correspondants.some((item) => item === null)) {
    return false;
  }

  value.correspondants = correspondants;
  return true;
}

export default function CorrespondantList() {
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleCreateCorrespondant(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (state.status !== "ready") {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    setFormError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/correspondants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone") || null,
          address: formData.get("address") || null,
          speciality: formData.get("speciality") || null,
          patientslist: String(formData.get("patientslist") ?? "")
            .split("\n")
            .map((patient) => patient.trim())
            .filter(Boolean),
          notes: formData.get("notes") || null,
        }),
      });

      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Impossible d’ajouter ce correspondant.";
        throw new Error(message);
      }

      const createdCorrespondant =
        isRecord(payload) && "correspondant" in payload
          ? normalizeCorrespondant(payload.correspondant)
          : null;
      if (!createdCorrespondant) {
        throw new Error("La réponse de l’API est invalide.");
      }

      setState({
        status: "ready",
        correspondants: [...state.correspondants, createdCorrespondant].sort(
          (first, second) => first.name.localeCompare(second.name, "fr"),
        ),
      });
      form.reset();
      setIsFormOpen(false);
      setSuccessMessage("Le correspondant a bien été ajouté.");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue. Réessayez.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadCorrespondants() {
      try {
        const response = await fetch("/api/correspondants", {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!isMounted) {
          return;
        }

        if (response.status === 401) {
          setState({ status: "unauthenticated" });
          return;
        }

        if (!response.ok) {
          throw new Error("Impossible de charger les correspondants.");
        }

        const payload: unknown = await response.json();
        if (!isCorrespondantsResponse(payload)) {
          throw new Error("La réponse de l’API est invalide.");
        }

        if (isMounted) {
          setState({ status: "ready", correspondants: payload.correspondants });
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

    void loadCorrespondants();

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return <p role="status" className="mt-8">Chargement des correspondants…</p>;
  }

  if (state.status === "unauthenticated") {
    return (
      <p className="mt-8">
        <Link href="/signin" className="font-semibold text-(--primary) underline">
          Connectez-vous
        </Link>{" "}
        pour consulter vos correspondants.
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p role="alert" className="mt-8 text-red-700">
        {state.message}
      </p>
    );
  }

  return (
    <div className="mt-8 w-full max-w-2xl text-left">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-(--foreground)">
          Mes correspondants
        </h2>
        <button
          type="button"
          aria-expanded={isFormOpen}
          aria-controls="create-correspondant-form"
          onClick={() => {
            setIsFormOpen((isOpen) => !isOpen);
            setFormError("");
            setSuccessMessage("");
          }}
          className="rounded-lg bg-(--primary) px-5 py-3 font-semibold text-white transition-colors hover:bg-(--primary-hover)"
        >
          {isFormOpen ? "Annuler" : "Ajouter un correspondant"}
        </button>
      </div>

      {successMessage && (
        <p role="status" className="mt-4 text-sm text-(--primary)">
          {successMessage}
        </p>
      )}

      {isFormOpen && (
        <form
          id="create-correspondant-form"
          onSubmit={handleCreateCorrespondant}
          className="mt-5 grid gap-4 rounded-xl border border-(--foreground)/15 bg-white/80 p-5 sm:grid-cols-2"
        >
          <div>
            <label
              htmlFor="correspondant-name"
              className="mb-1 block text-sm font-medium"
            >
              Nom <span aria-hidden="true">*</span>
            </label>
            <input
              id="correspondant-name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={120}
              required
              className="w-full rounded-lg border border-(--foreground)/20 bg-white px-3 py-2 outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>

          <div>
            <label
              htmlFor="correspondant-email"
              className="mb-1 block text-sm font-medium"
            >
              Adresse e-mail <span aria-hidden="true">*</span>
            </label>
            <input
              id="correspondant-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              className="w-full rounded-lg border border-(--foreground)/20 bg-white px-3 py-2 outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>

          <div>
            <label
              htmlFor="correspondant-phone"
              className="mb-1 block text-sm font-medium"
            >
              Téléphone
            </label>
            <input
              id="correspondant-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={2000}
              className="w-full rounded-lg border border-(--foreground)/20 bg-white px-3 py-2 outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>

          <div>
            <label
              htmlFor="correspondant-speciality"
              className="mb-1 block text-sm font-medium"
            >
              Spécialité
            </label>
            <input
              id="correspondant-speciality"
              name="speciality"
              type="text"
              maxLength={120}
              className="w-full rounded-lg border border-(--foreground)/20 bg-white px-3 py-2 outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>

          <div>
            <label
              htmlFor="correspondant-address"
              className="mb-1 block text-sm font-medium"
            >
              Adresse
            </label>
            <input
              id="correspondant-address"
              name="address"
              type="text"
              autoComplete="street-address"
              maxLength={2000}
              className="w-full rounded-lg border border-(--foreground)/20 bg-white px-3 py-2 outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="correspondant-patientslist"
              className="mb-1 block text-sm font-medium"
            >
              Patients (un nom par ligne, 100 maximum)
            </label>
            <textarea
              id="correspondant-patientslist"
              name="patientslist"
              rows={3}
              className="w-full rounded-lg border border-(--foreground)/20 bg-white px-3 py-2 outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="correspondant-notes"
              className="mb-1 block text-sm font-medium"
            >
              Notes
            </label>
            <textarea
              id="correspondant-notes"
              name="notes"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-(--foreground)/20 bg-white px-3 py-2 outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-red-700 sm:col-span-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-(--primary) px-5 py-3 font-semibold text-white transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Ajout en cours…" : "Enregistrer"}
            </button>
          </div>
        </form>
      )}

      <ul className="mt-6 flex flex-col gap-4">
        {state.correspondants.map((correspondant) => (
          <li
            key={correspondant.id}
            className="flex flex-col justify-between gap-2 rounded-md border-2 border-(--primary) bg-(--background) px-6 py-3 text-base text-(--text) shadow-sm sm:flex-row sm:items-center"
          >
            <div>
              <span className="font-medium">{correspondant.name}</span>
              {correspondant.speciality && (
                <p className="text-sm text-(--foreground)/70">
                  {correspondant.speciality}
                </p>
              )}
              {correspondant.patientslist.length > 0 && (
                <p className="mt-1 text-sm text-(--foreground)/70">
                  {correspondant.patientslist.length} patient
                  {correspondant.patientslist.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <a
              href={`mailto:${correspondant.email}`}
              className="text-(--primary) hover:text-(--foreground)"
            >
              {correspondant.email}
            </a>
          </li>
        ))}
        {state.correspondants.length === 0 && (
          <li className="text-(--foreground)/70">
            Vous n’avez pas encore de correspondant.
          </li>
        )}
      </ul>
    </div>
  );
}