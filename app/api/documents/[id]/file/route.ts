import prisma from "@/app/libs/prisma";
import { getAuthenticatedUser } from "@/app/api/correspondants/helpers";
import { DocumentFileNotFoundError, getPdf } from "@/app/documents/storage";

type DocumentFileRouteProps = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: DocumentFileRouteProps,
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findFirst({
    where: { id, userId: user.id },
    select: { storageKey: true },
  });
  if (!document) {
    return Response.json({ error: "Document introuvable." }, { status: 404 });
  }

  let pdf;
  try {
    pdf = await getPdf(document.storageKey);
  } catch (error) {
    if (error instanceof DocumentFileNotFoundError) {
      return Response.json({ error: "Le fichier PDF est introuvable." }, { status: 404 });
    }
    console.error("Impossible de lire le PDF dans le stockage.", error);
    return Response.json(
      { error: "Le stockage des documents est momentanément indisponible." },
      { status: 502 },
    );
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="document.pdf"',
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
