import { Suspense } from "react";
import CorrespondantList from "@/app/components/CorrespondantList";
import { getAuthenticatedUser } from "@/app/api/correspondants/helpers";
import prisma from "@/app/libs/prisma";

async function CorrespondantsContent() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return <CorrespondantList initialState={{ status: "unauthenticated" }} />;
  }

  const correspondants = await prisma.correspondant.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      speciality: true,
      patientslist: true,
    },
  });

  return (
    <CorrespondantList
      initialState={{ status: "ready", correspondants }}
    />
  );
}

export default function CorrespondantsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between backdrop-blur-md">
      <section
        aria-labelledby="correspondants-title"
        className="flex min-h-[75svh] flex-col items-center justify-center px-6 py-20 text-center"
      >
        <h1
          id="correspondants-title"
          className="max-w-4xl text-5xl font-bold text-(--foreground) md:text-7xl"
        >
          Correspondants
        </h1>

        <Suspense
          fallback={
            <p role="status" className="mt-8">
              Chargement des correspondants…
            </p>
          }
        >
          <CorrespondantsContent />
        </Suspense>
      </section>
    </main>
  );
}
