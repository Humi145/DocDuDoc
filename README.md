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

## Importer des correspondants

Le script `scripts/corresp/import_correspondants.py` importe le fichier JSON
dans le compte indiqué par son adresse e-mail. Il utilise `DATABASE_URL` (chargée
depuis `.env` si disponible) et affiche un aperçu sans écrire par défaut.
Appliquez d’abord la migration et régénérez le client Prisma, puis installez ses
dépendances et vérifiez l’aperçu :

```bash
npx prisma migrate deploy
npx prisma generate
python -m pip install -r scripts/corresp/requirements.txt
python scripts/corresp/import_correspondants.py --user-email utilisateur@example.com
```

Pour confirmer et effectuer l’import :

```bash
python scripts/corresp/import_correspondants.py \
  --user-email utilisateur@example.com \
  --apply
```

Les fiches sont rattachées au compte ciblé et identifiées par leur `pro_id`,
ce qui rend une nouvelle exécution sans doublons. Les e-mails absents ou
invalides sont enregistrés comme `NULL`. Si plusieurs fiches partagent une
adresse ou qu’elle est déjà utilisée par ce compte, la première la conserve et
les autres fiches gardent l’adresse source dans leurs notes. Les numéros de
téléphone sont regroupés ; les informations source non représentées par des
colonnes dédiées (comme les horaires, le fax et le site) sont conservées dans
les notes.

## Documents PDF

La page `/documents` permet à chaque utilisateur connecté d’ajouter, consulter et
supprimer ses PDF. PostgreSQL conserve leur nom, leur taille et leur clé de
stockage ; le contenu des fichiers est enregistré dans `.local-storage/documents`
à la racine du projet. Cette option ne nécessite aucun service MinIO ou S3.
La taille maximale est de 20 Mo. L’aperçu est servi par une route qui vérifie la
session et le propriétaire à chaque accès.

Pour le développement local, démarrez PostgreSQL si nécessaire, appliquez les
migrations, puis lancez l’application :

```bash
sudo docker compose up -d db
npx prisma migrate deploy
npm run dev
```

Si PostgreSQL est déjà démarré sur `localhost:5431` (par exemple dans un
conteneur `DDD` existant), ne relancez pas le service Compose `db` : exécutez
directement les deux dernières commandes. Les documents restent sur le disque
local même après un redémarrage de l’application. Pour changer le répertoire,
sauvegardez `.local-storage/documents` avec la base de données. En production,
un disque local exige une persistance et des sauvegardes adaptées ; pour des
documents de santé, vérifiez également les exigences réglementaires applicables,
notamment HDS le cas échéant.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
