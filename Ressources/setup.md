# Installation locale pour le développement

Ce guide décrit comment installer et lancer La doc du Doc en local. Il couvre
les dépendances, PostgreSQL, Prisma, l'authentification Better Auth et l'accès
à la page d'administration.

## Prérequis

- Git
- Node.js 20.9 ou ultérieur et npm
- Docker, pour lancer PostgreSQL localement

Les commandes ci-dessous sont données pour un terminal Linux/macOS. Adaptez
les commandes d'environnement à votre terminal si vous utilisez Windows.

## 1. Récupérer le projet et installer les dépendances

Depuis le dossier où vous souhaitez placer le projet :

```bash
git clone <URL_DU_DEPOT>
cd DocDuDoc
npm ci
```

Si le dépôt est déjà présent sur votre machine, entrez simplement dans son
dossier et exécutez `npm ci`.

## 2. Démarrer PostgreSQL

Le projet utilise PostgreSQL sur le port `5431` en local. Démarrez un
conteneur de développement avec Docker :

```bash
docker run --name DDD \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=dev_only_change_me \
  -e POSTGRES_DB=postgres \
  -p 5431:5432 \
  -d postgres:17
```

Le mot de passe ci-dessus est réservé au développement local : ne le réutilisez
pas dans un environnement partagé ou en production.

Si le conteneur `DDD` existe déjà, démarrez-le au lieu d'en créer un autre :

```bash
docker start DDD
```

Pour vérifier son état :

```bash
docker ps
```

Si PostgreSQL a été configuré avec un autre utilisateur, mot de passe, nom de
base ou port, utilisez les mêmes paramètres dans `DATABASE_URL` à l'étape
suivante.

## 3. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```dotenv
DATABASE_URL="postgresql://postgres:dev_only_change_me@localhost:5431/postgres"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="REMPLACER_PAR_UN_SECRET_ALEATOIRE"
ADMIN_USER_IDS=""
```

Générez un secret Better Auth aléatoire d'au moins 32 caractères :

```bash
openssl rand -base64 32
```

Copiez le résultat dans `BETTER_AUTH_SECRET`. Vous pouvez également générer
un secret avec Node.js :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Ne partagez pas le fichier `.env` et ne commitez pas ses secrets. Il est ignoré
par Git dans ce projet.

## 4. Initialiser le schéma de la base

Pour une **base neuve et vide**, appliquez les migrations du dépôt :

```bash
npx prisma migrate deploy
```

Cette commande crée les tables Better Auth, puis ajoute les colonnes utilisées
par le plugin d'administration. Les migrations sont conservées dans
[`prisma/migrations/`](./prisma/migrations/).

Vérifiez leur état :

```bash
npx prisma migrate status
```

Le message attendu est `Database schema is up to date!`.

### Reprendre une base existante sans historique Prisma

Si les tables ont déjà été créées avec `prisma db push`, la base peut contenir
les tables applicatives sans la table `_prisma_migrations`. Dans ce cas,
`migrate deploy` peut échouer avec `P3005` : Prisma refuse de traiter cette base
non vide comme une base neuve.

Avant de modifier l'historique, sauvegardez la base et vérifiez les colonnes
existantes. La commande suivante compare le schéma de la base à celui du projet
sans modifier la base :

```bash
npx prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --exit-code
```

Si la base possède le schéma Better Auth initial, mais **pas encore** les
colonnes d'administration, la comparaison signalera comme différences attendues
les champs `role`, `banned`, `banReason`, `banExpires` et `impersonatedBy`.
N'acceptez pas d'autres différences. Enregistrez alors la migration initiale
comme déjà appliquée, puis appliquez les migrations restantes :

```bash
npx prisma migrate resolve --applied 20261016000000_init
npx prisma migrate deploy
```

Si la comparaison ne détecte aucune différence et que les tables **et** les
colonnes d'administration sont déjà présentes, enregistrez les deux migrations
comme déjà appliquées. Cela met à jour l'historique Prisma sans recréer les
tables ni changer les données :

```bash
npx prisma migrate resolve --applied 20261016000000_init
npx prisma migrate resolve --applied 20261016104500_admin_account_controls
```

La seconde commande ne doit être utilisée que si les colonnes `role`, `banned`,
`banReason`, `banExpires` et `impersonatedBy` existent déjà dans la base.
`migrate resolve` ne met pas le schéma à niveau : il modifie uniquement le
registre des migrations. En cas de doute ou de divergence détectée par
`migrate diff`, arrêtez-vous et vérifiez le schéma avant de continuer.

N'utilisez pas `prisma migrate reset` sur une base contenant des données à
conserver.

## 5. Lancer le site

À la racine du dépôt :

```bash
npm run dev
```

Le script génère le client Prisma, puis démarre Next.js. Ouvrez
[http://localhost:3000](http://localhost:3000).

Les parcours de connexion et d'inscription sont disponibles sur `/signin` et
`/signup`. Better Auth enregistre les utilisateurs dans la base PostgreSQL.

## 6. Donner l'accès administrateur à un compte

1. Lancez le site et créez votre compte depuis `/signup`.
2. Récupérez l'identifiant du compte dans PostgreSQL :

   ```sql
   SELECT id, email FROM "user" WHERE email = 'vous@example.com';
   ```

   Vous pouvez exécuter cette requête avec `psql`, un client PostgreSQL ou
   l'interface Prisma Studio :

   ```bash
   npx prisma studio
   ```

3. Ajoutez l'identifiant retourné à `ADMIN_USER_IDS` dans `.env` :

   ```dotenv
   ADMIN_USER_IDS="identifiant-utilisateur"
   ```

   Pour plusieurs administrateurs, séparez les identifiants par des virgules.
4. Redémarrez `npm run dev`, reconnectez-vous si nécessaire, puis ouvrez
   [http://localhost:3000/admin](http://localhost:3000/admin).

La page d'administration permet de rechercher et paginer les comptes, de voir
les statistiques et de suspendre ou réactiver un compte. L'accès est vérifié
côté serveur ; les comptes configurés comme administrateurs sont protégés
contre la suspension depuis cette page.

## Commandes utiles

| Commande | Utilité |
| --- | --- |
| `npm run dev` | Génère le client Prisma et lance le serveur de développement. |
| `npm run lint` | Lance ESLint. |
| `npx tsc --noEmit` | Vérifie les types TypeScript. |
| `npm run build` | Génère le client Prisma et compile l'application. |
| `npx prisma studio` | Ouvre l'interface de consultation de la base. |
| `npx prisma migrate status` | Affiche l'état des migrations de la base configurée. |

## Modifier le schéma Prisma

Pour une modification de schéma pendant le développement :

1. Modifiez `prisma/schema.prisma`.
2. Créez et appliquez une migration nommée :

   ```bash
   npx prisma migrate dev --name nom_de_la_modification
   ```

3. Vérifiez le changement avec `npx prisma migrate status` et commitez le
   schéma avec le nouveau dossier de migration.

Sur une base partagée ou de déploiement, appliquez les migrations déjà créées
avec `npx prisma migrate deploy` ; n'y lancez pas `migrate dev`.

## Dépannage rapide

- **Connexion à `localhost:5431` impossible** : vérifiez avec `docker ps` que
  PostgreSQL tourne et que le port `5431` correspond à `DATABASE_URL`.
- **Le conteneur `DDD` existe déjà** : utilisez `docker start DDD`.
- **Erreur `P3005`** : la base n'est pas vide, mais son historique Prisma est
  absent ou incomplet. Suivez la procédure de reprise ci-dessus après avoir
  vérifié le schéma ; ne réinitialisez pas la base pour contourner l'erreur.
- **La page `/admin` redirige vers l'accueil** : vérifiez que l'identifiant du
  compte connecté est présent dans `ADMIN_USER_IDS`, puis redémarrez le serveur.
- **Client Prisma ou types non à jour** : exécutez `npx prisma generate`.
