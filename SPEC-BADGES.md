# Dans Ma Zone — Spécification du système de badges (V1)

> Statut : **brouillon à valider** par Mario, Clément et la team. Rien n'est codé.
> Le catalogue détaillé des badges est dans [`BADGES.md`](BADGES.md).

## 1. Vision

Transformer « Dans Ma Zone » en jeu de badges façon **Kongregate** : des dizaines de
badges à débloquer **automatiquement** à partir des activités Strava, classés par
difficulté, avec des points, un niveau par joueur et un classement de la team.

Trois principes non négociables :

1. **Tout est automatique.** Aucun badge ne repose sur une déclaration, une photo ou
   une validation humaine. Si ça ne se calcule pas depuis Strava, ce n'est pas un badge.
2. **Les points ne servent qu'à la gloire.** Pas de monnaie, pas de boutique, rien à
   échanger, ni en ligne ni dans la vraie vie. On joue pour le classement et pour la
   vanne au prochain footing.
3. **Strava reste la référence.** On n'agrège rien nous-mêmes : on lit, on calcule,
   on affiche. Le jeu est une couche par-dessus, pas un concurrent.

## 2. Vocabulaire

| Terme | Définition |
|---|---|
| **Badge** | Une récompense unique, débloquée une seule fois par joueur, définie par une règle de calcul déterministe. |
| **Palier** | Difficulté du badge : Facile, Moyen, Difficile, Impossible. |
| **Points** | Valeur fixe attachée au palier (voir §5). Le score d'un joueur est la somme des points de ses badges. |
| **Niveau** | Rang du joueur, déduit de son score par une table de seuils (§5). |
| **Rareté** | Part de la team qui possède le badge (« 2 joueurs sur 8 »). Calculée, jamais fixée à la main. |
| **Premier** | Le joueur qui a débloqué le badge en premier. Affiché à vie sur le badge. |
| **Badge caché** | Badge dont le nom et la règle ne sont révélés qu'une fois obtenu (par qui que ce soit dans la team). Avant, il apparaît comme « ??? ». |
| **Badge à progression** | Badge à seuil (ex. 10 départements) pour lequel on affiche une barre « 6 / 10 » avant déblocage. |

## 3. Données

### 3.1 Ce qu'on a déjà en base (table `activities`)

Pour chaque activité synchronisée : identifiant Strava, athlète, nom, sport (classé
en 6 familles), date et heure locales de départ, distance totale, trace GPS
sous-échantillonnée (~1 point tous les 12 m).

Ça suffit pour toute la famille **Explorateur** (départements, pays, carreaux),
**Zones**, **Distance**, **Cumul**, **Régularité**, **Horaires**, **Sports** et
**Géométrie**. C'est déjà les deux tiers du catalogue.

### 3.2 Ce qu'il faut ajouter à la synchro (coût : quelques colonnes)

Ces champs sont **déjà dans la réponse Strava** qu'on télécharge à chaque synchro ;
on ne les garde simplement pas. Les stocker ne coûte aucun appel API supplémentaire.

| Champ Strava | Sert aux badges | Colonne proposée |
|---|---|---|
| `total_elevation_gain` | Montagne (D+) | `elevation_m REAL` |
| `moving_time`, `elapsed_time` | Vitesse, durée, « Minuit » | `moving_s INTEGER`, `elapsed_s INTEGER` |
| `start_latlng` / `end_latlng` | Boucle, aller-retour (plus précis que la trace) | déjà déductible de la trace, optionnel |

Après ajout, une **resynchronisation complète** sera nécessaire pour remplir
l'historique (le Worker sait déjà reprendre par lots et attendre la limite Strava).

### 3.3 Ce qui demande un flux supplémentaire (à décider plus tard)

- **Flux `time`** (horodatage de chaque point) : indispensable pour les segments
  chronométrés (« qui monte la rue X le plus vite ») et le « négatif split ». Un appel
  Strava en plus par activité → double le temps de première synchro.
- **Flux `altitude`** : altitude max réelle (« au-dessus de 2 000 m »). Même coût.

Recommandation : **pas en V1**. Le D+ résumé (§3.2) couvre déjà la montagne.

### 3.4 Géodonnées (fichiers statiques, chargés par le navigateur)

| Jeu | Usage | Taille indicative | Source libre |
|---|---|---|---|
| Départements français (101) | badges Départements, Corse, Outre-mer | ~1 Mo simplifié | france-geojson (Etalab, licence ouverte) |
| Régions françaises (18) | badges Régions | ~500 Ko | idem |
| Pays du monde | badges Pays, Frontalier, Continents | ~1 Mo (Natural Earth 1:50m) | Natural Earth (domaine public) |
| Trait de côte | badge « Sur la côte » | ~300 Ko | Natural Earth |

Les communes (35 000 polygones) sont **hors V1** : trop lourd côté navigateur, et
les badges « villes » sont couverts par les carreaux (§4, famille Explorateur).

### 3.5 Hors périmètre, définitivement

Photos, déclaratif, modération, monnaie, boutique, récompenses réelles, mise en
relation entre inconnus, livraisons. (Cf. principes §1.)

## 4. Modèle d'un badge

Chaque badge est décrit une fois pour toutes par :

```
id            : identifiant stable, kebab-case      ex. dep-10
nom           : ce que voit le joueur                ex. Routard
description   : comment l'obtenir, une phrase        ex. Une séance dans 10 départements différents
famille       : Explorateur | Zones | Distance | Cumul | Régularité | Horaires | Sports | Montagne | Vitesse | Géométrie | Équipe | Team JPPJR
palier        : facile | moyen | difficile | impossible
cache         : oui | non
progression   : seuil numérique (optionnel)          ex. 10
donnees       : base | denivele | temps | geodata     (ce qu'il faut pour le calculer)
regle         : texte précis et sans ambiguïté, celui qu'on implémentera
```

Règles d'écriture d'une règle :

- Elle s'évalue sur **l'ensemble des activités synchronisées d'un joueur**, filtrées
  éventuellement par sport. Elle ne dépend jamais des autres joueurs, sauf pour la
  famille **Équipe** (explicitement).
- Elle est **déterministe et rejouable** : recalculer sur les mêmes données donne le
  même résultat. Pas de « bonus si tu as de la chance ».
- Un badge débloqué **ne se retire jamais**, même si l'activité qui l'a déclenché est
  supprimée de Strava plus tard.
- Les seuils sont **inclusifs** (≥). Les distances utilisent la distance Strava, les
  traversées de polygones utilisent la trace GPS.

## 5. Paliers, points, niveaux

| Palier | Points | Cible (ordre de grandeur) |
|---|---|---|
| Facile | 5 | Tout le monde l'a dans le mois |
| Moyen | 15 | La moitié de la team dans l'année |
| Difficile | 30 | 1 ou 2 personnes, il faut le viser |
| Impossible | 60 | Peut-être personne, et c'est le but |

Niveau du joueur (cumul des points) :

| Niveau | Points | Niveau | Points |
|---|---|---|---|
| 1 | 0 | 6 | 400 |
| 2 | 25 | 7 | 600 |
| 3 | 75 | 8 | 850 |
| 4 | 150 | 9 | 1 150 |
| 5 | 260 | 10 | 1 500 |
| | | 11+ | +400 par niveau |

À titre d'ordre de grandeur, le catalogue V1 (132 badges) vaut 3 170 points ; le
niveau 10 (1 500 points) correspond donc à « a la moitié du catalogue, dont des
Impossibles ».

**Rareté** : affichée sur chaque badge (« 3 / 8 »). Un badge Facile que personne
n'a est un signal pour le rééquilibrer ; on ajuste les paliers **par consensus** au
bout de quelques mois, jamais à chaud.

## 6. Calcul : où, quand, comment

### 6.1 Où

Deux options :

| | Dans le navigateur | Dans le Worker |
|---|---|---|
| Puissance de calcul | Largement suffisante (Web Worker) | Plan gratuit : ~10 ms CPU par requête, insuffisant pour les tests point-dans-polygone sur des milliers de points |
| Géodonnées | Chargées une fois, mises en cache | À héberger et charger côté serveur |
| Triche | Possible via la console (envoyer un faux déblocage) | Impossible |
| Complexité | Faible | Élevée (découpage en lots, cron) |

**Recommandation V1 : calcul dans le navigateur, vérité dans le Worker.**
Le navigateur calcule les badges obtenus et envoie la liste au Worker ; le Worker ne
fait qu'**ajouter** les déblocages nouveaux (jamais retirer), horodate, et détermine le
« premier ». Entre 8 potes, le risque de triche est social, pas technique — et un
tricheur sera démasqué au premier « t'as fait quoi pour avoir *Everesting* ? ».

Si un jour on veut du blindé : le Worker peut re-vérifier les badges numériques
simples (cumul, distance, dates) qui ne demandent pas de géodonnées.

### 6.2 Quand

- À chaque **chargement de la page** (recalcul complet, quelques centaines de ms) et
  à la fin de chaque **synchronisation**.
- Les nouveaux badges sont annoncés immédiatement au joueur (§7.6).

### 6.3 Dates

- `unlocked_at` = **date de l'activité** qui a déclenché le badge, pas la date du
  calcul. Ainsi l'historique compte : celui qui a couru en Corse en 2019 a le badge
  daté de 2019.
- **Premier** = celui dont `unlocked_at` est la plus ancienne. Ça favorise ceux qui
  ont un long historique Strava, c'est voulu (et discutable — voir §10).
- On enregistre aussi `computed_at` (quand le déblocage a été constaté) pour le fil.

### 6.4 Stockage (Worker / D1)

```
badges_unlocked (
  athlete_id   INTEGER,   -- joueur
  badge_id     TEXT,      -- ex. dep-10
  unlocked_at  TEXT,      -- date de l'activité déclencheuse (ISO)
  activity_id  INTEGER,   -- activité déclencheuse (pour le lien Strava)
  computed_at  INTEGER,   -- epoch du constat
  PRIMARY KEY (athlete_id, badge_id)
)
```

Le catalogue (définitions) vit **dans le code** du front-end, versionné avec le
repo : un badge = une entrée dans une liste + une fonction de règle. Pas de table de
définitions.

Routes Worker : `GET /api/badges` (déblocages de toute la team, pour rareté, premier,
classement et fil) et `POST /api/badges` (le navigateur envoie ses déblocages ; le
Worker insère ceux qui manquent et renvoie la liste des nouveaux).

## 7. Écrans

Tout reste dans `index.html`, en onglets ou sections sous la carte. Mobile d'abord.

### 7.1 Profil joueur
Nom, niveau, score, barre vers le niveau suivant, nombre de badges par palier, ses
3 derniers badges, ses badges « premier ».

### 7.2 Mur des badges
Grille de tous les badges, groupés par famille. Chaque tuile : icône, nom, palier
(couleur), rareté. Débloqué = plein ; non débloqué = grisé avec barre de progression
si applicable ; caché = « ??? ». Filtres : tous / obtenus / à obtenir / cachés.

### 7.3 Détail d'un badge
Description, palier, points, rareté (« 3 / 8 »), **premier** avec la date, liste des
détenteurs, et pour le joueur : la date et l'activité qui l'a débloqué (lien Strava).

### 7.4 Classement de la team
Par score, avec niveau, nombre de badges, nombre de « premiers ». Tri secondaire par
nombre de badges Impossible.

### 7.5 Fil
Les 30 derniers déblocages de la team, du plus récent au plus ancien :
« **Clément** a débloqué *Semi* · il y a 2 j ». Les « premiers » sont mis en avant.

### 7.6 Annonce après synchro
Un toast / bandeau : « 3 nouveaux badges ! » cliquable vers le mur, avec les tuiles
qui apparaissent une par une. C'est le moment Kongregate, il doit être satisfaisant.

## 8. Icônes

V1 : un **emoji par badge** (défini dans le catalogue) sur fond coloré par palier.
Zéro dessin à produire, lisible sur mobile. On pourra remplacer par des illustrations
plus tard sans toucher aux règles.

Couleurs de palier proposées : Facile vert, Moyen bleu, Difficile violet,
Impossible or/noir.

## 9. Catalogue

Voir [`BADGES.md`](BADGES.md) : 132 badges répartis en 13 familles, plus une famille
**Team JPPJR** laissée volontairement vide pour les private jokes (lieux cultes,
sorties mythiques) à remplir par la team.

Conventions : un id stable qu'on ne renomme jamais (même si le nom affiché change),
un nom court (1 à 3 mots), une description à la deuxième personne.

## 10. Questions ouvertes (à trancher avec Clément et la team)

1. **Historique** : les badges se débloquent sur tout l'historique Strava (et le
   « premier » va au plus ancien), ou seulement à partir du lancement du jeu ?
   → Proposition : tout l'historique, c'est plus riche et ça récompense les anciens.
2. **Sports comptés** : par défaut, tous les sports comptent pour les badges
   géographiques et de régularité ; seuls les badges Distance/Vitesse précisent le
   sport. À valider.
3. **Badges cachés** : combien ? Trop, c'est frustrant ; pas assez, pas de surprise.
   → Proposition : ~15 % du catalogue.
4. **Rééquilibrage** : qui décide de changer un palier ? → Proposition : vote à la
   majorité, une fois par trimestre, jamais rétroactif sur les points déjà gagnés.
5. **Défis à durée limitée** (« qui monte la rue X le plus vite avant le 15/09 ») :
   c'est un mécanisme différent des badges (classement temporaire, flux `time`).
   Hors V1, mais à garder en tête comme V2 naturelle.

## 11. Contraintes à garder en tête

- **Conditions d'utilisation de l'API Strava** : plafond de 10 athlètes sans revue
  Strava ; usage commercial soumis à accord ; affichage des données d'un utilisateur à
  d'autres utilisateurs très encadré depuis fin 2024. Entre potes, on est dans
  l'esprit d'un outil de club ; toute idée de « vendre le jeu » passe d'abord par la
  lecture attentive de ces conditions.
- **Vie privée dans la team** : les badges révèlent des choses (« séance à 3 h du
  matin », « 10 pays »). Tout le monde voit déjà les traces de tout le monde, donc rien
  de nouveau — mais le dire noir sur blanc dans la pop-up d'accueil.
- **Performance mobile** : géodonnées ~3 Mo au total, à charger une seule fois et
  mettre en cache ; calcul dans un Web Worker pour ne pas figer l'interface.

## 12. Roadmap proposée

| Étape | Contenu |
|---|---|
| **V1.0** | Colonnes D+/temps dans la synchro + resynchro · géodonnées départements/régions/pays · moteur de règles · 132 badges · mur, profil, classement, fil, annonce post-synchro |
| **V1.1** | Famille Team JPPJR (private jokes) · icônes dessinées · badges « Équipe » avancés (sortie de groupe) |
| **V2** | Défis à durée limitée sur segment/zone (flux `time`) · badge du mois |
