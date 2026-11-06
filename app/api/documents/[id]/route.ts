import prisma from "@/app/libs/prisma";
import { getAuthenticatedUser } from "@/app/api/correspondants/helpers";
import {
  deletePdf,
  DocumentStorageConfigurationError,
} from "@/app/documents/storage";

type DocumentRouteProps = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: DocumentRouteProps,
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findFirst({
    where: { id, userId: user.id },
    select: { id: true, storageKey: true },
  });
  if (!document) {
    return Response.json({ error: "Document introuvable." }, { status: 404 });
  }

  try {
    await deletePdf(document.storageKey);
  } catch (error) {
    if (error instanceof DocumentStorageConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    console.error("Impossible de supprimer le PDF du stockage.", error);
    return Response.json(
      { error: "Le stockage des documents est momentanément indisponible." },
      { status: 502 },
    );
  }

  await prisma.document.deleteMany({
    where: { id: document.id, userId: user.id },
  });

  return new Response(null, { status: 204 });
}
