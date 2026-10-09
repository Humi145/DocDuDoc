"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient();

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const passwordConfirmation = String(
      formData.get("passwordConfirmation") ?? "",
    );

    if (password !== passwordConfirmation) {
      setError("Les mots de passe ne correspondent pas.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error: signUpError } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message ?? "La création du compte a échoué.");
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
        aria-labelledby="signup-title"
        className="w-full max-w-md rounded-2xl border border-white/60 bg-(--background)/90 p-8 shadow-xl backdrop-blur-md"
      >
        <h1
          id="signup-title"
          className="text-3xl font-bold text-(--foreground)"
        >
          Créer un compte
        </h1>
        <p className="mt-2 text-(--foreground)/75">
          Inscrivez-vous pour accéder à La doc du Doc.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-(--foreground)"
            >
              Nom
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="w-full rounded-lg border border-(--foreground)/20 bg-white px-4 py-3 text-(--foreground) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>

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
              autoComplete="new-password"
              minLength={8}
              required
              className="w-full rounded-lg border border-(--foreground)/20 bg-white px-4 py-3 text-(--foreground) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>

          <div>
            <label
              htmlFor="passwordConfirmation"
              className="mb-2 block text-sm font-medium text-(--foreground)"
            >
              Confirmer le mot de passe
            </label>
            <input
              id="passwordConfirmation"
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              minLength={8}
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
            {isSubmitting ? "Création du compte…" : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-(--foreground)/75">
          Vous avez déjà un compte ?{" "}
          <Link
            href="/signin"
            className="font-semibold text-(--primary) underline-offset-4 hover:underline"
          >
            Connectez-vous
          </Link>
        </p>
      </section>
    </main>
  );
}