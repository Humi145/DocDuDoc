import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between backdrop-blur-md">
      <section
        aria-labelledby="hero-title"
        className="flex min-h-[75svh] flex-col items-center justify-center px-6 py-20 text-center"
      >
        <h1
          id="hero-title"
          className="max-w-4xl text-5xl font-bold text-(--foreground) md:text-7xl"
        >
          Bienvenue sur La doc du Doc
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-(--muted) md:text-xl">
          Découvrez notre plateforme dédiée aux correspondants et aux
          professionnels de santé. Connectez-vous pour accéder à vos
          informations et gérer vos correspondances.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/signin"
            className="rounded bg-(--primary) px-6 py-3 text-white transition-colors hover:bg-(--primary-hover)"
          >
            Me connecter
          </Link>
          <Link
            href="/signup"
            className="rounded border-2 border-(--primary) px-6 py-3 text-(--foreground) transition-colors hover:bg-(--primary) hover:text-white"
          >
            Créer un compte
          </Link>
        </div>
      </section>
    </main>
  );
}

