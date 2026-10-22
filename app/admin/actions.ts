"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, adminUserIds } from "@/app/libs/auth";

async function getAdministratorSession() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !adminUserIds.includes(session.user.id)) {
    throw new Error("Accès administrateur requis.");
  }

  return session;
}

function getUserId(formData: FormData) {
  const userId = formData.get("userId");

  if (typeof userId !== "string" || !userId.trim()) {
    throw new Error("Identifiant utilisateur invalide.");
  }

  return userId.trim();
}

async function getAdministratorForUser(userId: string) {
  const session = await getAdministratorSession();

  if (userId === session.user.id || adminUserIds.includes(userId)) {
    throw new Error("Vous ne pouvez pas modifier l’accès d’un administrateur.");
  }

  return session;
}

export async function banUserAction(formData: FormData) {
  const userId = getUserId(formData);
  await getAdministratorForUser(userId);

  await auth.api.banUser({
    headers: await headers(),
    body: { userId },
  });

  revalidatePath("/admin");
}

export async function unbanUserAction(formData: FormData) {
  const userId = getUserId(formData);
  await getAdministratorForUser(userId);

  await auth.api.unbanUser({
    headers: await headers(),
    body: { userId },
  });

  revalidatePath("/admin");
}
