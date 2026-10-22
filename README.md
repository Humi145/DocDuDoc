This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Administration

La page `/admin` permet aux administrateurs de consulter, rechercher et paginer
les comptes, ainsi que de suspendre ou réactiver leur accès. Elle requiert la
variable serveur `ADMIN_USER_IDS`, une liste d’identifiants utilisateur séparés
par des virgules. Pour trouver un identifiant dans PostgreSQL :

```sql
SELECT id, email FROM "user" WHERE email = 'administrateur@example.com';
```

Ajoutez l’identifiant retourné à `ADMIN_USER_IDS`, puis redémarrez l’application.
Pour une base existante créée auparavant avec `prisma db push`, les migrations
initiales doivent être baselinées une seule fois :

```bash
npx prisma migrate resolve --applied 20261016000000_init
npx prisma migrate resolve --applied 20261016104500_admin_account_controls
```

La première commande enregistre l’historique initial sans recréer les tables.
La seconde est appropriée uniquement si les champs d’administration de cette
migration existent déjà dans la base. Pour une base vide, utilisez plutôt
`npx prisma migrate deploy` : les deux migrations seront appliquées dans l’ordre.
Les administrateurs configurés ne peuvent pas être suspendus depuis cette page.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
