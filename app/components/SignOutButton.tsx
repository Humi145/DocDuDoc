"use client";

import { createAuthClient } from "better-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const authClient = createAuthClient();

export default function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setError("");
    setIsSigningOut(true);

    try {
      const { error: signOutError } = await authClient.signOut();

      if (signOutError) {
        setError(signOutError.message ?? "La déconnexion a échoué.");
        return;
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Une erreur inattendue est survenue. Réessayez.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="inline-flex items-center rounded-md border-2 border-(--primary) bg-(--background) px-6 py-3 text-base text-(--text) shadow-sm transition-colors hover:bg-(--primary) hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningOut ? "Déconnexion…" : "Se déconnecter"}
      </button>
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </>
  );
}
