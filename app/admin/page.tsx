import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/app/libs/prisma";
import { adminUserIds, auth } from "@/app/libs/auth";
import { banUserAction, unbanUserAction } from "./actions";

export const metadata: Metadata = {
  title: "Administration | La doc du Doc",
};

const pageSize = 25;

type AdminPageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

function getPageNumber(value: string | undefined) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/signin");
  }

  if (!adminUserIds.includes(session.user.id)) {
    redirect("/");
  }

  const params = await searchParams;
  const page = getPageNumber(params.page);
  const query = params.q?.trim() ?? "";
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [matchingUsers, totalUsers, verifiedUsers, bannedUsers] =
    await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count(),
      prisma.user.count({ where: { emailVerified: true } }),
      prisma.user.count({ where: { banned: true } }),
    ]);
  const totalPages = Math.max(1, Math.ceil(matchingUsers / pageSize));
  const currentPage = Math.min(page, totalPages);
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
  });

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-(--primary)">
          Administration
        </p>
        <h1 className="mt-2 text-4xl font-bold text-(--foreground)">
          Gestion des comptes
        </h1>
        <p className="mt-3 text-(--foreground)/75">
          Consultez les utilisateurs et suspendez ou réactivez leur accès.
        </p>
      </header>

      <section
        aria-label="Statistiques des comptes"
        className="mb-8 grid gap-4 sm:grid-cols-3"
      >
        <StatCard label="Comptes" value={totalUsers} />
        <StatCard label="E-mails vérifiés" value={verifiedUsers} />
        <StatCard label="Comptes suspendus" value={bannedUsers} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/60 bg-(--background)/90 shadow-xl backdrop-blur-md">
        <form
          action="/admin"
          className="flex flex-col gap-3 border-b border-(--foreground)/10 p-5 sm:flex-row"
        >
          <label htmlFor="user-search" className="sr-only">
            Rechercher par nom ou adresse e-mail
          </label>
          <input
            id="user-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Nom ou adresse e-mail"
            className="min-w-0 flex-1 rounded-lg border border-(--foreground)/20 bg-white px-4 py-3 text-(--foreground) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
          />
          <button
            type="submit"
            className="rounded-lg bg-(--primary) px-5 py-3 font-semibold text-white transition-colors hover:bg-(--primary-hover)"
          >
            Rechercher
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-left text-sm">
            <thead className="bg-white/60 text-(--foreground)/75">
              <tr>
                <th scope="col" className="px-5 py-4 font-semibold">Utilisateur</th>
                <th scope="col" className="px-5 py-4 font-semibold">Inscription</th>
                <th scope="col" className="px-5 py-4 font-semibold">E-mail</th>
                <th scope="col" className="px-5 py-4 font-semibold">État</th>
                <th scope="col" className="px-5 py-4 font-semibold">Accès</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--foreground)/10">
              {users.map((user) => {
                const isAdministrator = adminUserIds.includes(user.id);

                return (
                  <tr key={user.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{user.name}</p>
                      <p className="mt-1 text-xs text-(--foreground)/60">{user.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                      }).format(user.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      {user.emailVerified ? "Vérifié" : "À vérifier"}
                    </td>
                    <td className="px-5 py-4">
                      {isAdministrator
                        ? "Administrateur"
                        : user.banned
                          ? "Suspendu"
                          : "Actif"}
                    </td>
                    <td className="px-5 py-4">
                      {isAdministrator ? (
                        <span className="text-(--foreground)/60">Protégé</span>
                      ) : user.banned ? (
                        <form action={unbanUserAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <button
                            type="submit"
                            className="font-semibold text-(--primary) underline-offset-4 hover:underline"
                          >
                            Réactiver
                          </button>
                        </form>
                      ) : (
                        <form action={banUserAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <button
                            type="submit"
                            className="font-semibold text-red-700 underline-offset-4 hover:underline"
                          >
                            Suspendre
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-(--foreground)/70">
                    Aucun compte ne correspond à cette recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-(--foreground)/10 px-5 py-4 text-sm">
          <p className="text-(--foreground)/70">
            {matchingUsers} compte{matchingUsers > 1 ? "s" : ""}
            {query ? " trouvé(s)" : ""}
          </p>
          <nav aria-label="Pagination des utilisateurs" className="flex items-center gap-3">
            {currentPage > 1 && (
              <a
                href={getPageHref(currentPage - 1, query)}
                className="font-semibold text-(--primary) underline-offset-4 hover:underline"
              >
                Précédent
              </a>
            )}
            <span>
              Page {currentPage} sur {totalPages}
            </span>
            {currentPage < totalPages && (
              <a
                href={getPageHref(currentPage + 1, query)}
                className="font-semibold text-(--primary) underline-offset-4 hover:underline"
              >
                Suivant
              </a>
            )}
          </nav>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-white/60 bg-(--background)/90 p-6 shadow-lg backdrop-blur-md">
      <p className="text-sm text-(--foreground)/70">{label}</p>
      <p className="mt-2 text-3xl font-bold text-(--foreground)">{value}</p>
    </article>
  );
}

function getPageHref(page: number, query: string) {
  const search = new URLSearchParams({ page: String(page) });
  if (query) {
    search.set("q", query);
  }
  return `/admin?${search.toString()}`;
}
