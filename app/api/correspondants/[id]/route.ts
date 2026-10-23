import prisma from "@/app/libs/prisma";
import {
  getAuthenticatedUser,
  isUniqueConstraintError,
  parseCorrespondantInput,
} from "../helpers";

type CorrespondantRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: CorrespondantRouteProps) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { id } = await params;
  const correspondant = await prisma.correspondant.findFirst({
    where: { id, userId: user.id },
  });

  if (!correspondant) {
    return Response.json({ error: "Correspondant introuvable." }, { status: 404 });
  }

  return Response.json({ correspondant });
}

export async function PATCH(request: Request, { params }: CorrespondantRouteProps) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const result = await parseCorrespondantInput(request, true);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const { id } = await params;

  try {
    const update = await prisma.correspondant.updateMany({
      where: { id, userId: user.id },
      data: result.data,
    });

    if (update.count === 0) {
      return Response.json({ error: "Correspondant introuvable." }, { status: 404 });
    }

    const correspondant = await prisma.correspondant.findFirst({
      where: { id, userId: user.id },
    });

    if (!correspondant) {
      return Response.json({ error: "Correspondant introuvable." }, { status: 404 });
    }

    return Response.json({ correspondant });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return Response.json(
        { error: "Un correspondant avec cette adresse e-mail existe déjà." },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: CorrespondantRouteProps) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { id } = await params;
  const result = await prisma.correspondant.deleteMany({
    where: { id, userId: user.id },
  });

  if (result.count === 0) {
    return Response.json({ error: "Correspondant introuvable." }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
