"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

type DocumentItem = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
};

type InitialState =
  | { status: "unauthenticated" }
  | { status: "ready"; documents: DocumentItem[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : fallback;
}

function formatSize(bytes: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(bytes / (1024 * 1024));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function DocumentsManager({
  initialState,
}: {
  initialState: InitialState;
}) {
  const [documents, setDocuments] = useState(
    initialState.status === "ready" ? initialState.documents : [],
  );
  const [selectedId, setSelectedId] = useState(
    initialState.status === "ready" ? initialState.documents[0]?.id ?? null : null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  if (initialState.status === "unauthenticated") {
    return (
      <p className="mt-8 rounded-xl border border-(--primary)/30 bg-white/70 p-6">
        <Link href="/signin" className="font-semibold text-(--primary) underline">
          Connectez-vous
        </Link>{" "}
        pour ajouter et consulter vos documents.
      </p>
    );
  }

  const selectedDocument =
    documents.find((document) => document.id === selectedId) ?? null;

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = fileInput.current?.files?.[0];
    setError("");
    setSuccess("");

    if (!file) {
      setError("Choisissez un fichier PDF à ajouter.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Le fichier ne peut pas dépasser 20 Mo.");
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        credentials: "same-origin",
        body: new FormData(form),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Impossible d’ajouter ce document."),
        );
      }

      const document =
        isRecord(payload) && isRecord(payload.document)
          ? payload.document
          : null;
      if (
        !document ||
        typeof document.id !== "string" ||
        typeof document.name !== "string" ||
        typeof document.size !== "number" ||
        typeof document.createdAt !== "string"
      ) {
        throw new Error("La réponse du serveur est invalide.");
      }

      const newDocument: DocumentItem = {
        id: document.id,
        name: document.name,
        size: document.size,
        createdAt: document.createdAt,
      };
      setDocuments((current) => [newDocument, ...current]);
      setSelectedId(newDocument.id);
      setSuccess("Le document a bien été ajouté.");
      form.reset();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(document: DocumentItem) {
    if (!window.confirm(`Supprimer « ${document.name} » ?`)) {
      return;
    }

    setError("");
    setSuccess("");
    setDeletingId(document.id);
    try {
      const response = await fetch(
        `/api/documents/${encodeURIComponent(document.id)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!response.ok) {
        const payload: unknown = await response.json();
        throw new Error(
          getErrorMessage(payload, "Impossible de supprimer ce document."),
        );
      }

      setDocuments((current) =>
        current.filter((item) => item.id !== document.id),
      );
      setSelectedId((current) =>
        current === document.id
          ? documents.find((item) => item.id !== document.id)?.id ?? null
          : current,
      );
      setSuccess("Le document a bien été supprimé.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-10 w-full max-w-7xl text-left">
      <div className="grid gap-8 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
        <section
          aria-labelledby="document-list-title"
          className="rounded-2xl border border-(--primary)/20 bg-white/75 p-6 shadow-sm backdrop-blur"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 id="document-list-title" className="text-xl font-semibold">
              Mes documents
            </h2>
            <span className="rounded-full bg-(--background) px-3 py-1 text-sm">
              {documents.length}
            </span>
          </div>

          <form onSubmit={handleUpload} className="mt-6 space-y-3">
            <label htmlFor="document-file" className="block font-medium">
              Ajouter un document PDF
            </label>
            <input
              ref={fileInput}
              id="document-file"
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              required
              className="block w-full rounded-lg border border-(--primary)/30 bg-white p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-(--primary) file:px-3 file:py-2 file:font-medium file:text-white"
            />
            <p className="text-sm text-gray-700">PDF uniquement, 20 Mo maximum.</p>
            <button
              type="submit"
              disabled={isUploading}
              className="rounded-lg bg-(--primary) px-5 py-3 font-semibold text-white transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? "Ajout en cours…" : "Ajouter le document"}
            </button>
          </form>

          <div className="mt-6 space-y-3" aria-live="polite">
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}
            {success && (
              <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
                {success}
              </p>
            )}
          </div>

          {documents.length === 0 ? (
            <p className="mt-8 rounded-lg bg-(--background)/70 p-4 text-sm">
              Aucun document pour le moment. Ajoutez un PDF pour le consulter ici.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-(--primary)/15">
              {documents.map((document) => (
                <li
                  key={document.id}
                  className={`flex items-start gap-3 py-4 ${
                    document.id === selectedId ? "rounded-lg bg-(--background)/70 px-3" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(document.id)}
                    aria-current={document.id === selectedId ? "true" : undefined}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block break-words font-medium">{document.name}</span>
                    <span className="mt-1 block text-sm text-gray-700">
                      {formatDate(document.createdAt)} · {formatSize(document.size)} Mo
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(document)}
                    disabled={deletingId === document.id}
                    aria-label={`Supprimer ${document.name}`}
                    className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {deletingId === document.id ? "Suppression…" : "Supprimer"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="document-preview-title"
          className="flex min-h-[32rem] flex-col overflow-hidden rounded-2xl border border-(--primary)/20 bg-white/75 shadow-sm backdrop-blur"
        >
          <div className="border-b border-(--primary)/15 px-6 py-4">
            <h2 id="document-preview-title" className="font-semibold">
              Aperçu du document
            </h2>
            {selectedDocument && (
              <p className="mt-1 break-words text-sm text-gray-700">
                {selectedDocument.name}
              </p>
            )}
          </div>
          {selectedDocument ? (
            <iframe
              key={selectedDocument.id}
              title={`Aperçu de ${selectedDocument.name}`}
              src={`/api/documents/${encodeURIComponent(selectedDocument.id)}/file`}
              className="min-h-[32rem] w-full flex-1 bg-white"
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-gray-700">
              Sélectionnez un document pour afficher son aperçu.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
