import CorrespondantList from "@/app/components/CorrespondantList";

export default async function CorrespondantsPage() {
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

        <CorrespondantList />
      </section>
    </main>
  );
}
