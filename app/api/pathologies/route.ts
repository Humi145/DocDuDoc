import prisma from "@/app/libs/prisma";
import { getAuthenticatedUser, parsePathologyInput } from "./helpers";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const pathologies = await prisma.pathology.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return Response.json({ pathologies });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const result = await parsePathologyInput(request, false);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const pathology = await prisma.pathology.create({
    data: { ...result.data, userId: user.id },
  });

  return Response.json({ pathology }, { status: 201 });
}
