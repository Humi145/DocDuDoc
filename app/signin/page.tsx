"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient();

export default function SigninPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message ?? "La connexion a échoué.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Une erreur inattendue est survenue. Réessayez.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <section
        aria-labelledby="signin-title"
        className="w-full max-w-md rounded-2xl border border-white/60 bg-(--background)/90 p-8 shadow-xl backdrop-blur-md"
      >
        <h1
          id="signin-title"
          className="text-3xl font-bold text-(--foreground)"
        >
          Me connecter
        </h1>
        <p className="mt-2 text-(--foreground)/75">
          Connectez-vous à votre compte La doc du Doc.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-(--foreground)"
            >
              Adresse e-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-(--foreground)/20 bg-white px-4 py-3 text-(--foreground) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-(--foreground)"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-(--foreground)/20 bg-white px-4 py-3 text-(--foreground) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-(--primary) px-5 py-3 font-semibold text-white transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Connexion…" : "Me connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-(--foreground)/75">
          Vous n’avez pas encore de compte ?{" "}
          <Link
            href="/signup"
            className="font-semibold text-(--primary) underline-offset-4 hover:underline"
          >
            Créez-en un
          </Link>
        </p>
      </section>
    </main>
  );
}
