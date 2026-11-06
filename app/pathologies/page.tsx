import { Suspense } from "react";
import PathologyList from "@/app/components/PathologyList";
import { getAuthenticatedUser } from "@/app/api/pathologies/helpers";
import prisma from "@/app/libs/prisma";

async function PathologiesContent() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return <PathologyList initialState={{ status: "unauthenticated" }} />;
  }

  const pathologies = await prisma.pathology.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      followUp: true,
      speciality: true,
      patients: true,
    },
  });

  return <PathologyList initialState={{ status: "ready", pathologies }} />;
}

export default function PathologiesPage() {
  return (
    <main className="flex min-h-screen flex-col items-center backdrop-blur-md">
      <section
        aria-labelledby="pathologies-title"
        className="flex min-h-[75svh] w-full flex-col items-center px-6 py-20 text-center"
      >
        <h1
          id="pathologies-title"
          className="max-w-4xl text-5xl font-bold text-(--foreground) md:text-7xl"
        >
          Pathologies
        </h1>
        <Suspense fallback={<p role="status" className="mt-8">Chargement des pathologies…</p>}>
          <PathologiesContent />
        </Suspense>
      </section>
    </main>
  );
}
