# Dans Ma Zone — Worker Strava

Le seul bout « serveur » de l'appli : il échange le code OAuth Strava contre
des tokens (le `client_secret` ne doit jamais être dans le navigateur), les
rafraîchit, synchronise les activités dans une base D1, et sert deux routes
au front-end (`/api/me`, `/api/team-activities`).

## 1. Créer l'appli Strava

1. Va sur <https://www.strava.com/settings/api> et crée une application
   (nécessite un abonnement Strava actif depuis juin 2026).
2. Note le **Client ID** et le **Client Secret**.
3. Dans le dashboard, clique sur l'option d'accès élargi (self-service) pour
   passer de 1 à **10 athlètes autorisés** — pas besoin de validation Strava
   pour ça, largement suffisant pour l'équipe.
4. Laisse « Authorization Callback Domain » de côté pour l'instant, on le
   réglera à l'étape 4 une fois l'URL du Worker connue.

## 2. Installer les outils

```bash
npm install
npx wrangler login
```

## 3. Créer la base D1

```bash
npx wrangler d1 create dans-ma-zone
```

Copie le `database_id` renvoyé dans `wrangler.toml` (remplace
`COLLE-ICI-L-ID-RENVOYE-PAR-WRANGLER-D1-CREATE`).

```bash
npm run db:init
```

## 4. Configurer les secrets et variables

```bash
npx wrangler secret put STRAVA_CLIENT_SECRET
# colle le Client Secret Strava quand demandé
```

Dans `wrangler.toml`, remplace :
- `STRAVA_CLIENT_ID` par ton Client ID Strava (pas un secret, mais autant le
  garder ici plutôt que dans le code)
- `CORS_ORIGIN` par l'origine exacte de ton site (ex. `https://n58s29.github.io`,
  **sans** slash final)
- `FRONTEND_URL` par l'URL complète de la page `index.html` (celle vers
  laquelle on redirige une fois connecté)

## 5. Déployer

```bash
npm run deploy
```

Note l'URL affichée (ex. `https://dans-ma-zone-strava.tonpseudo.workers.dev`).

## 6. Boucler la boucle

1. Retourne dans les paramètres de l'appli Strava et renseigne
   « Authorization Callback Domain » avec le **host seul** du Worker
   (`dans-ma-zone-strava.tonpseudo.workers.dev`, sans `https://` ni chemin).
2. Dans `index.html`, remplace `WORKER_URL` par cette même URL complète
   (avec `https://`, sans slash final).
3. Ouvre l'appli, clique sur « Se connecter à Strava », autorise, puis
   « Synchroniser ».

## Limites à connaître

- **Plan Workers gratuit** : 50 sous-requêtes par appel. C'est pour ça que
  `/api/sync` traite les activités par lots de 20 et que le front-end boucle
  dessus jusqu'à `done: true`.
- **Débit Strava** : ~100 lectures/15 min par défaut (200/15 min une fois
  l'accès élargi activé à l'étape 1). Un premier import de tout l'historique
  d'un coureur peut donc prendre plusieurs dizaines de minutes, étalées sur
  plusieurs fenêtres de 15 min — le front-end attend et reprend tout seul
  s'il croise cette limite (message « Limite Strava atteinte… »).
- **D1 gratuit** : 5 M lignes lues/jour, 100 000 lignes écrites/jour, 5 Go —
  aucun souci pour une petite équipe, et pas de mise en pause contrairement à
  d'autres offres gratuites du marché.
