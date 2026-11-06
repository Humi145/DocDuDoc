import { randomUUID } from "node:crypto";
import prisma from "@/app/libs/prisma";
import { getAuthenticatedUser } from "@/app/api/correspondants/helpers";
import {
  deletePdf,
  DocumentStorageConfigurationError,
  storePdf,
} from "@/app/documents/storage";

export const runtime = "nodejs";

const maxPdfSize = 20 * 1024 * 1024;

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const documents = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, size: true, createdAt: true },
  });

  return Response.json({ documents });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const requestSize = Number(contentLength);
    if (!Number.isSafeInteger(requestSize) || requestSize < 0) {
      return Response.json(
        { error: "La taille de la requête est invalide." },
        { status: 400 },
      );
    }
    if (requestSize > maxPdfSize + 64 * 1024) {
      return Response.json(
        { error: "La requête dépasse la taille maximale autorisée." },
        { status: 413 },
      );
    }
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Le formulaire d’ajout du document est invalide." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Sélectionnez un fichier PDF." }, { status: 400 });
  }
  if (file.size === 0 || file.size > maxPdfSize) {
    return Response.json(
      { error: "Le fichier doit peser entre 1 octet et 20 Mo." },
      { status: 400 },
    );
  }
  if (
    file.type !== "application/pdf" ||
    !file.name.toLocaleLowerCase("fr").endsWith(".pdf")
  ) {
    return Response.json(
      { error: "Seuls les fichiers PDF sont acceptés." },
      { status: 400 },
    );
  }

  const body = Buffer.from(await file.arrayBuffer());
  if (
    !body
      .subarray(0, Math.min(body.byteLength, 1024))
      .toString("latin1")
      .includes("%PDF-")
  ) {
    return Response.json(
      { error: "Le contenu du fichier n’est pas un PDF valide." },
      { status: 400 },
    );
  }

  const name = file.name
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    .trim()
    .slice(0, 180);
  if (!name) {
    return Response.json({ error: "Le nom du fichier est invalide." }, { status: 400 });
  }

  const storageKey = `${user.id}/${randomUUID()}.pdf`;
  try {
    await storePdf(storageKey, body);
  } catch (error) {
    if (error instanceof DocumentStorageConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    console.error("Impossible d’enregistrer le PDF dans le stockage.", error);
    return Response.json(
      { error: "Le stockage des documents est momentanément indisponible." },
      { status: 502 },
    );
  }

  let document;
  try {
    document = await prisma.document.create({
      data: {
        name,
        size: body.byteLength,
        storageKey,
        userId: user.id,
      },
      select: { id: true, name: true, size: true, createdAt: true },
    });
  } catch (error) {
    try {
      await deletePdf(storageKey);
    } catch (cleanupError) {
      console.error("Impossible de nettoyer un PDF après échec d’enregistrement.", cleanupError);
    }
    throw error;
  }

  return Response.json({ document }, { status: 201 });
}
