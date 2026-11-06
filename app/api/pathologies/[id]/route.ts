import prisma from "@/app/libs/prisma";
import { getAuthenticatedUser, parsePathologyInput } from "../helpers";

type PathologyRouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: PathologyRouteProps) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const result = await parsePathologyInput(request, true);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const { id } = await params;
  const update = await prisma.pathology.updateMany({
    where: { id, userId: user.id },
    data: result.data,
  });

  if (update.count === 0) {
    return Response.json({ error: "Pathologie introuvable." }, { status: 404 });
  }

  const pathology = await prisma.pathology.findFirst({
    where: { id, userId: user.id },
  });

  if (!pathology) {
    return Response.json({ error: "Pathologie introuvable." }, { status: 404 });
  }

  return Response.json({ pathology });
}

export async function DELETE(
  _request: Request,
  { params }: PathologyRouteProps,
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { id } = await params;
  const result = await prisma.pathology.deleteMany({
    where: { id, userId: user.id },
  });

  if (result.count === 0) {
    return Response.json({ error: "Pathologie introuvable." }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
