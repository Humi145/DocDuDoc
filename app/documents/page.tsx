import { Suspense } from "react";
import prisma from "@/app/libs/prisma";
import { getAuthenticatedUser } from "@/app/api/correspondants/helpers";
import DocumentsManager from "./DocumentsManager";

async function DocumentsContent() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return <DocumentsManager initialState={{ status: "unauthenticated" }} />;
  }

  const documents = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, size: true, createdAt: true },
  });

  return (
    <DocumentsManager
      initialState={{
        status: "ready",
        documents: documents.map((document) => ({
          ...document,
          createdAt: document.createdAt.toISOString(),
        })),
      }}
    />
  );
}

export default function DocumentsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16 backdrop-blur-md">
      <section
        aria-labelledby="documents-title"
        className="flex w-full flex-col items-center"
      >
        <h1
          id="documents-title"
          className="max-w-4xl text-center text-5xl font-bold text-(--foreground) md:text-7xl"
        >
          Documents
        </h1>
        <p className="mt-4 max-w-2xl text-center text-lg">
          Ajoutez vos fichiers PDF, consultez-les et supprimez-les depuis votre espace.
        </p>
        <Suspense
          fallback={
            <p role="status" className="mt-8">
              Chargement des documents…
            </p>
          }
        >
          <DocumentsContent />
        </Suspense>
      </section>
    </main>
  );
}