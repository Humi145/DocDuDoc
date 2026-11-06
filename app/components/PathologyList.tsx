"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Pathology = {
  id: string;
  name: string;
  followUp: string | null;
  speciality: string | null;
  patients: string[];
};

type ViewState =
  | { status: "unauthenticated" }
  | { status: "ready"; pathologies: Pathology[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePathology(value: unknown): Pathology | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    (value.followUp !== null && typeof value.followUp !== "string") ||
    (value.speciality !== null && typeof value.speciality !== "string") ||
    !Array.isArray(value.patients) ||
    !value.patients.every((patient: unknown) => typeof patient === "string")
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    followUp: value.followUp,
    speciality: value.speciality,
    patients: value.patients,
  };
}

function getErrorMessage(payload: unknown, fallback: string): string {
  return isRecord(payload) && typeof payload.error === "string"
    ? payload.error
    : fallback;
}

export default function PathologyList({ initialState }: { initialState: ViewState }) {
  const [state, setState] = useState(initialState);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [patientDrafts, setPatientDrafts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyPathologyId, setBusyPathologyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (state.status === "unauthenticated") {
    return (
      <p className="mt-8">
        <Link href="/signin" className="font-semibold text-(--primary) underline">
          Connectez-vous
        </Link>{" "}
        pour consulter vos pathologies.
      </p>
    );
  }

  const editingPathology =
    state.pathologies.find(({ id }) => id === editingId) ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        editingId ? `/api/pathologies/${encodeURIComponent(editingId)}` : "/api/pathologies",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            name: formData.get("name"),
            followUp: formData.get("followUp") || null,
            speciality: formData.get("speciality") || null,
          }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Impossible d’enregistrer cette pathologie."),
        );
      }

      const pathology =
        isRecord(payload) && "pathology" in payload
          ? normalizePathology(payload.pathology)
          : null;
      if (!pathology) {
        throw new Error("La réponse de l’API est invalide.");
      }

      setState((current) => ({
        ...(current.status !== "ready"
          ? current
          : {
              status: "ready" as const,
              pathologies: (
                editingId
                  ? current.pathologies.map((item) =>
                      item.id === editingId ? pathology : item,
                    )
                  : [...current.pathologies, pathology]
              ).sort((first, second) => first.name.localeCompare(second.name, "fr")),
            }),
      }));
      setFormOpen(false);
      setEditingId(null);
      setSuccess(
        editingId
          ? "La pathologie a bien été modifiée."
          : "La pathologie a bien été ajoutée.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddPatient(pathology: Pathology, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const patientName = (patientDrafts[pathology.id] ?? "").trim();
    if (!patientName) {
      return;
    }

    setError("");
    setSuccess("");
    setBusyPathologyId(pathology.id);
    try {
      const response = await fetch(`/api/pathologies/${encodeURIComponent(pathology.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ patients: [...pathology.patients, patientName] }),
      });
      const payload: unknown = response.status === 204 ? null : await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Impossible d’ajouter ce patient."),
        );
      }

      const updatedPathology =
        isRecord(payload) && "pathology" in payload
          ? normalizePathology(payload.pathology)
          : null;
      if (!updatedPathology) {
        throw new Error("La réponse de l’API est invalide.");
      }

      setState((current) => ({
        ...(current.status !== "ready"
          ? current
          : {
              status: "ready" as const,
              pathologies: current.pathologies.map((item) =>
                item.id === updatedPathology.id ? updatedPathology : item,
              ),
            }),
      }));
      setPatientDrafts((current) => ({ ...current, [pathology.id]: "" }));
      setSuccess(`Le patient a été ajouté à ${pathology.name}.`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setBusyPathologyId(null);
    }
  }

  async function handleDelete(pathology: Pathology) {
    if (
      !window.confirm(
        `Supprimer ${pathology.name} ? Cette action est irréversible.`,
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setBusyPathologyId(pathology.id);
    try {
      const response = await fetch(`/api/pathologies/${encodeURIComponent(pathology.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const payload: unknown = await response.json();
        throw new Error(
          getErrorMessage(payload, "Impossible de supprimer cette pathologie."),
        );
      }

      setState((current) => ({
        ...(current.status !== "ready"
          ? current
          : {
              status: "ready" as const,
              pathologies: current.pathologies.filter(
                ({ id }) => id !== pathology.id,
              ),
            }),
      }));
      if (editingId === pathology.id) {
        setEditingId(null);
        setFormOpen(false);
      }
      setSuccess("La pathologie a bien été supprimée.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setBusyPathologyId(null);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-(--foreground)/20 bg-white px-3 py-2 outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20";

  return (
    <div className="mt-8 w-full max-w-3xl text-left">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-(--foreground)">
          Mes pathologies
        </h2>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setFormOpen((open) => !open);
            setError("");
            setSuccess("");
          }}
          className="rounded-lg bg-(--primary) px-5 py-3 font-semibold text-white transition-colors hover:bg-(--primary-hover)"
        >
          {formOpen ? "Annuler" : "Ajouter une pathologie"}
        </button>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="mt-4 text-sm text-(--primary)">{success}</p>}

      {formOpen && (
        <form
          key={editingId ?? "new-pathology"}
          onSubmit={handleSubmit}
          className="mt-5 grid gap-4 rounded-xl border border-(--foreground)/15 bg-white/80 p-5"
        >
          <h3 className="text-lg font-semibold">
            {editingPathology ? `Modifier ${editingPathology.name}` : "Nouvelle pathologie"}
          </h3>
          <div>
            <label htmlFor="pathology-name" className="mb-1 block text-sm font-medium">
              Pathologie <span aria-hidden="true">*</span>
            </label>
            <input id="pathology-name" name="name" required maxLength={120} defaultValue={editingPathology?.name ?? ""} className={inputClass} />
          </div>
          <div>
            <label htmlFor="pathology-speciality" className="mb-1 block text-sm font-medium">
              Spécialité correspondante
            </label>
            <input id="pathology-speciality" name="speciality" maxLength={120} defaultValue={editingPathology?.speciality ?? ""} className={inputClass} />
          </div>
          <div>
            <label htmlFor="pathology-follow-up" className="mb-1 block text-sm font-medium">
              Conduite à suivre
            </label>
            <textarea id="pathology-follow-up" name="followUp" rows={4} maxLength={4000} defaultValue={editingPathology?.followUp ?? ""} className={inputClass} />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-(--primary) px-5 py-3 font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60">
              {isSubmitting ? "Enregistrement…" : editingPathology ? "Enregistrer les modifications" : "Ajouter"}
            </button>
            <button type="button" onClick={() => { setFormOpen(false); setEditingId(null); }} className="rounded-lg border border-(--primary) px-5 py-3 font-semibold text-(--primary)">
              Annuler
            </button>
          </div>
        </form>
      )}

      <ul className="mt-6 flex flex-col gap-4">
        {state.pathologies.map((pathology) => (
          <li key={pathology.id} className="rounded-xl border-2 border-(--primary) bg-(--background) p-5 text-(--text) shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{pathology.name}</h3>
                <p className="mt-1 text-sm text-(--foreground)/70">
                  Spécialité : {pathology.speciality || "Non renseignée"}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busyPathologyId !== null || isSubmitting} onClick={() => { setEditingId(pathology.id); setFormOpen(true); setError(""); setSuccess(""); }} className="rounded-lg border border-(--primary) px-4 py-2 font-semibold text-(--primary) disabled:opacity-60">
                  Modifier
                </button>
                <button type="button" disabled={busyPathologyId !== null || isSubmitting} onClick={() => void handleDelete(pathology)} className="rounded-lg border border-red-700 px-4 py-2 font-semibold text-red-700 disabled:opacity-60">
                  {busyPathologyId === pathology.id ? "En cours…" : "Supprimer"}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-semibold">Conduite à suivre</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-(--foreground)/80">
                {pathology.followUp || "Aucune conduite renseignée."}
              </p>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-semibold">Patients associés</h4>
              {pathology.patients.length > 0 ? (
                <ul className="mt-1 list-inside list-disc text-sm">
                  {pathology.patients.map((patient, index) => (
                    <li key={`${patient}-${index}`}>{patient}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-(--foreground)/70">Aucun patient associé.</p>
              )}
              <form onSubmit={(event) => void handleAddPatient(pathology, event)} className="mt-3 flex flex-wrap gap-2">
                <label className="sr-only" htmlFor={`patient-${pathology.id}`}>Nom du patient à ajouter</label>
                <input
                  id={`patient-${pathology.id}`}
                  value={patientDrafts[pathology.id] ?? ""}
                  onChange={(event) => setPatientDrafts((current) => ({ ...current, [pathology.id]: event.target.value }))}
                  maxLength={120}
                  required
                  placeholder="Nom du patient"
                  className={`${inputClass} min-w-48 flex-1`}
                />
                <button type="submit" disabled={busyPathologyId !== null || isSubmitting} className="rounded-lg border border-(--primary) px-4 py-2 font-semibold text-(--primary) disabled:opacity-60">
                  Ajouter le patient
                </button>
              </form>
            </div>
          </li>
        ))}
        {state.pathologies.length === 0 && (
          <li className="text-(--foreground)/70">Vous n’avez pas encore de pathologie.</li>
        )}
      </ul>
    </div>
  );
}
