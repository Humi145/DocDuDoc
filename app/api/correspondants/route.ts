import prisma from "@/app/libs/prisma";
import {
  getAuthenticatedUser,
  isUniqueConstraintError,
  parseCorrespondantInput,
} from "./helpers";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const correspondants = await prisma.correspondant.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return Response.json({ correspondants });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const result = await parseCorrespondantInput(request, false);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  try {
    const correspondant = await prisma.correspondant.create({
      data: {
        ...result.data,
        userId: user.id,
      },
    });

    return Response.json({ correspondant }, { status: 201 });
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
