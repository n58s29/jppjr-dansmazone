# Dans Ma Zone — Catalogue des badges (V1, brouillon)

> À relire et amender par la team. Les règles sont écrites pour être implémentées
> telles quelles ; si une règle vous paraît floue, c'est un bug de la spec.
> Cadre général dans [`SPEC-BADGES.md`](SPEC-BADGES.md).

**Points par palier** : Facile 5 · Moyen 15 · Difficile 30 · Impossible 60.

**Colonne « Données »** — ce qu'il faut pour calculer le badge :
- ✅ **base** : ce qu'on a déjà (trace GPS, distance, date/heure, sport)
- ⛰ **D+** : dénivelé (colonne à ajouter à la synchro, aucun appel Strava en plus)
- ⏱ **temps** : durée (colonne à ajouter, idem)
- 🗺 **géo** : fichier GeoJSON départements / régions / pays / côte
- 🔬 **flux** : flux Strava supplémentaire (time ou altitude) — hors V1

**Caché** : le nom et la règle ne sont visibles qu'une fois le badge obtenu par quelqu'un.

Sauf mention contraire, **tous les sports comptent**. « Une séance » = une activité Strava.

---

## 1. Explorateur — Départements 🗺

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| dep-1 | Chez moi | Une séance dans 1 département | Facile | 🗺 | |
| dep-5 | Touriste | Une séance dans 5 départements différents | Facile | 🗺 | |
| dep-10 | Routard | 10 départements différents | Moyen | 🗺 | |
| dep-25 | Hexagone | 25 départements différents | Difficile | 🗺 | |
| dep-50 | Cartographe | 50 départements différents | Impossible | 🗺 | |
| dep-corse | Île de Beauté | Une séance en Corse (2A ou 2B) | Moyen | 🗺 | |
| dep-outremer | Sous les tropiques | Une séance dans un département d'Outre-mer | Difficile | 🗺 | |
| dep-2-en-1 | À cheval | Une seule séance qui traverse 2 départements | Facile | 🗺 | |
| dep-3-en-1 | Tripoint | Une seule séance qui traverse 3 départements | Moyen | 🗺 | |
| dep-paris-pc | Petite couronne | Une séance dans chacun des 75, 92, 93, 94 | Moyen | 🗺 | |

## 2. Explorateur — Régions & pays 🗺

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| reg-3 | Régional de l'étape | 3 régions françaises différentes | Facile | 🗺 | |
| reg-7 | Hexagonal | 7 régions différentes | Moyen | 🗺 | |
| reg-13 | Grand Chelem | Les 13 régions métropolitaines | Impossible | 🗺 | |
| pays-2 | Passeport | Une séance dans 2 pays différents | Facile | 🗺 | |
| pays-5 | Globe-trotter | 5 pays différents | Moyen | 🗺 | |
| pays-10 | Sans frontières | 10 pays différents | Difficile | 🗺 | |
| pays-frontalier | Frontalier | Une seule séance dans 2 pays (traversée de frontière) | Difficile | 🗺 | |
| continents-3 | Trois continents | Une séance sur 3 continents différents | Impossible | 🗺 | |
| pays-voisins | Bon voisinage | Une séance dans chacun des pays limitrophes de la France métropolitaine (ES, AD, IT, CH, DE, LU, BE, MC) | Impossible | 🗺 | |

## 3. Explorateur — Carreaux ✅

*Un « carreau » = une case de 1 km × 1 km d'une grille fixe. Un carreau est « visité » dès qu'un point GPS d'une séance y tombe.*

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| grid-50 | Premiers pas | 50 carreaux visités | Facile | ✅ | |
| grid-200 | Éclaireur | 200 carreaux | Moyen | ✅ | |
| grid-500 | Défricheur | 500 carreaux | Difficile | ✅ | |
| grid-1500 | Conquistador | 1 500 carreaux | Impossible | ✅ | |
| grid-new-10 | Terra incognita | Une seule séance qui visite 10 carreaux jamais visités avant | Moyen | ✅ | |
| grid-new-30 | Grand large | Une seule séance qui visite 30 nouveaux carreaux | Difficile | ✅ | |
| grid-home | Vieux briscard | 100 séances passant par le même carreau | Facile | ✅ | |
| grid-square | Carré parfait | Un bloc de 3 × 3 carreaux entièrement visité | Moyen | ✅ | |
| grid-square-5 | Damier | Un bloc de 5 × 5 carreaux entièrement visité | Difficile | ✅ | |

## 4. Zones de l'équipe ✅

*Une « zone » = une zone enregistrée dans « Zones de l'équipe ». Les km dans une zone sont ceux calculés par l'appli.*

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| zone-1km | Dans ma zone | 1 km cumulé dans une zone de l'équipe | Facile | ✅ | |
| zone-100km | Habitant | 100 km cumulés dans une même zone | Moyen | ✅ | |
| zone-500km | Maire | 500 km cumulés dans une même zone | Difficile | ✅ | |
| zone-1000km | Cadastre | 1 000 km cumulés dans une même zone | Impossible | ✅ | |
| zone-3-en-1 | Grand tour | Une seule séance qui passe dans 3 zones différentes | Moyen | ✅ | |
| zone-all | Complétiste | Au moins 1 km dans chacune des zones de l'équipe (min. 3 zones) | Difficile | ✅ | |
| zone-create-1 | Géomètre | Créer une zone pour l'équipe | Facile | ✅ | |
| zone-create-5 | Urbaniste | Créer 5 zones | Moyen | ✅ | |
| zone-traverse-100 | Passage à niveau | 100 passages (entrées) dans une même zone | Moyen | ✅ | |
| zone-outside | Touriste chez soi | Une séance qui fait le tour complet d'une zone sans jamais y entrer | Difficile | ✅ | oui |

## 5. Distance d'une séance ✅

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| dist-5 | Cinq bornes | Une séance de course ≥ 5 km | Facile | ✅ | |
| dist-10 | Dix | Une séance de course ≥ 10 km | Facile | ✅ | |
| dist-semi | Semi | Une séance de course ≥ 21,1 km | Moyen | ✅ | |
| dist-marathon | Marathon | Une séance de course ≥ 42,195 km | Difficile | ✅ | |
| dist-50 | Ultra | Une séance de course ou marche ≥ 50 km | Difficile | ✅ | |
| dist-100 | Centbornard | Une séance de course ou marche ≥ 100 km | Impossible | ✅ | |
| velo-100 | Cent | Une sortie vélo ≥ 100 km | Moyen | ✅ | |
| velo-200 | Deux cents | Une sortie vélo ≥ 200 km | Difficile | ✅ | |
| velo-300 | Diagonale | Une sortie vélo ≥ 300 km | Impossible | ✅ | |
| rando-20 | Grande rando | Une marche/rando ≥ 20 km | Facile | ✅ | |
| dist-round | Pile poil | Une séance dont la distance est un entier à 10 m près (ex. 10,00 km) | Moyen | ✅ | oui |
| dist-mini | Le principal c'est de sortir | Une séance de course < 1 km | Facile | ✅ | oui |

## 6. Cumul ✅

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| cum-first | Premier kilomètre | Première séance synchronisée | Facile | ✅ | |
| cum-100 | Centenaire | 100 km cumulés | Facile | ✅ | |
| cum-500 | Paris-Bordeaux | 500 km cumulés | Moyen | ✅ | |
| cum-1000 | Millier | 1 000 km cumulés | Moyen | ✅ | |
| cum-3500 | Le Tour | 3 500 km cumulés (la longueur d'un Tour de France) | Difficile | ✅ | |
| cum-10000 | Dix mille | 10 000 km cumulés | Impossible | ✅ | |
| cum-40075 | Tour du monde | 40 075 km cumulés | Impossible | ✅ | |
| act-10 | Dix séances | 10 séances | Facile | ✅ | |
| act-100 | Cent séances | 100 séances | Moyen | ✅ | |
| act-500 | Cinq cents | 500 séances | Difficile | ✅ | |
| act-1000 | Mille séances | 1 000 séances | Impossible | ✅ | |
| cum-month-200 | Gros mois | 200 km de course dans un même mois civil | Moyen | ✅ | |
| cum-month-400 | Mois de folie | 400 km de course dans un même mois civil | Impossible | ✅ | |
| cum-week-100 | Grosse semaine | 100 km de course dans une même semaine (lundi-dimanche) | Difficile | ✅ | |

## 7. Régularité ✅

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| streak-3 | Trois d'affilée | Une séance 3 jours consécutifs | Facile | ✅ | |
| streak-7 | Semaine parfaite | 7 jours consécutifs | Moyen | ✅ | |
| streak-30 | Un mois sans faute | 30 jours consécutifs | Difficile | ✅ | |
| streak-100 | Centurion | 100 jours consécutifs | Impossible | ✅ | |
| weekly-12 | Fidèle | Au moins 1 séance par semaine pendant 12 semaines de suite | Moyen | ✅ | |
| weekly-52 | Indéboulonnable | Au moins 1 séance par semaine pendant 52 semaines de suite | Impossible | ✅ | |
| monthly-12 | Toute l'année | Au moins 1 séance chaque mois d'une même année civile | Difficile | ✅ | |
| double | Doublé | 2 séances le même jour | Facile | ✅ | |
| triple | Triplé | 3 séances le même jour | Moyen | ✅ | |
| comeback | Revenant | Une séance après ≥ 60 jours sans rien | Facile | ✅ | oui |
| seasons-4 | Quatre saisons | Une séance dans chacune des 4 saisons (même année ou non) | Facile | ✅ | |
| every-weekday | Sept sur sept | Au moins une séance pour chacun des 7 jours de la semaine (cumul) | Facile | ✅ | |

## 8. Horaires & calendrier ✅

*Basé sur la date et l'heure locales de départ Strava.*

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| early-6 | Lève-tôt | Départ avant 6 h 00 | Facile | ✅ | |
| early-5 | Aube | Départ avant 5 h 00 | Moyen | ✅ | |
| late-22 | Noctambule | Départ après 22 h 00 | Facile | ✅ | |
| midnight | Minuit | Une séance en cours à minuit (départ + durée) | Moyen | ⏱ | |
| noon | Pause déj' | Départ entre 12 h 00 et 13 h 00, un jour de semaine | Facile | ✅ | |
| weekend-20 | Guerrier du week-end | 20 séances un samedi ou un dimanche | Facile | ✅ | |
| monday-10 | Lundi motivé | 10 séances un lundi | Facile | ✅ | |
| friday-13 | Vendredi 13 | Une séance un vendredi 13 | Moyen | ✅ | oui |
| new-year | Réveillon | Une séance un 31 décembre ou un 1er janvier | Moyen | ✅ | |
| xmas | Père Noël | Une séance un 25 décembre | Moyen | ✅ | |
| leap-day | Bissextile | Une séance un 29 février | Difficile | ✅ | oui |
| palindrome | Palindrome | Une séance à une date palindrome (ex. 22/02/2022) | Impossible | ✅ | oui |
| 11-11-11 | Onze | Départ à 11 h 11 un 11 novembre | Impossible | ✅ | oui |
| full-moon | Loup-garou | Départ après 21 h un soir de pleine lune (calcul astronomique) | Difficile | ✅ | oui |
| summer-solstice | Solstice | Une séance le jour du solstice d'été et le jour du solstice d'hiver | Moyen | ✅ | |
| heatwave | Canicule | Départ entre 13 h et 16 h en juillet ou août | Facile | ✅ | |

## 9. Sports ✅

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| sport-2 | Polyvalent | 2 familles de sport différentes | Facile | ✅ | |
| sport-tri | Triathlète | Course + vélo + natation | Difficile | ✅ | |
| sport-5 | Touche-à-tout | 5 familles de sport différentes | Difficile | ✅ | |
| sport-pure | Pur coureur | 100 séances de course sans aucun autre sport | Moyen | ✅ | oui |
| sport-hike-10 | Marcheur | 10 marches/randos | Facile | ✅ | |
| sport-snow | Neige | Une séance ski/snowboard | Moyen | ✅ | |
| sport-swim | Nageur | Une natation en eau libre (avec trace GPS) | Moyen | ✅ | |
| sport-brick | Enchaînement | Vélo puis course le même jour, départ de la course < 30 min après la fin du vélo | Moyen | ⏱ | |

## 10. Montagne ⛰

*Dénivelé positif (D+) tel que fourni par Strava.*

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| climb-300 | Bosse | 300 m de D+ en une séance | Facile | ⛰ | |
| climb-1000 | Col | 1 000 m de D+ en une séance | Moyen | ⛰ | |
| climb-2000 | Haute montagne | 2 000 m de D+ en une séance | Difficile | ⛰ | |
| everest-cum | Everest | 8 849 m de D+ cumulés | Moyen | ⛰ | |
| everesting | Everesting | 8 849 m de D+ en une seule séance | Impossible | ⛰ | |
| mont-blanc-week | Mont Blanc | 4 808 m de D+ sur 7 jours glissants | Difficile | ⛰ | |
| climb-100k | Grimpeur | 100 000 m de D+ cumulés | Impossible | ⛰ | |
| flat-20 | Plat pays | Une séance ≥ 20 km avec < 50 m de D+ | Facile | ⛰ | oui |
| alt-2000 | Au-dessus de 2 000 | Un point GPS à plus de 2 000 m d'altitude | Difficile | 🔬 | |

## 11. Vitesse & durée ⏱

*Allure = temps en mouvement / distance. Course à pied uniquement sauf mention.*

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| pace-5k-5 | Sous les 5 | 5 km (ou plus) à moins de 5:00/km de moyenne | Facile | ⏱ | |
| pace-5k-4 | Sous les 4 | 5 km (ou plus) à moins de 4:00/km | Difficile | ⏱ | |
| pace-10k-45 | Dix en 45 | 10 km en moins de 45 min | Difficile | ⏱ | |
| semi-2h | Semi en 2 h | ≥ 21,1 km en moins de 2 h | Moyen | ⏱ | |
| semi-1h30 | Semi en 1 h 30 | ≥ 21,1 km en moins de 1 h 30 | Impossible | ⏱ | |
| marathon-4h | Marathon sub-4 | ≥ 42,195 km en moins de 4 h | Difficile | ⏱ | |
| marathon-3h | Marathon sub-3 | ≥ 42,195 km en moins de 3 h | Impossible | ⏱ | |
| duration-3h | Longue haleine | Une séance de plus de 3 h en mouvement | Moyen | ⏱ | |
| duration-8h | La journée | Une séance de plus de 8 h en mouvement | Impossible | ⏱ | |
| velo-30 | Rouleur | Une sortie vélo ≥ 50 km à plus de 30 km/h de moyenne | Difficile | ⏱ | |
| slow-10 | Escargot | 10 km de course à plus de 8:00/km | Facile | ⏱ | oui |
| negative-split | Négatif | Seconde moitié d'une séance ≥ 10 km plus rapide que la première | Difficile | 🔬 | |

## 12. Géométrie de la trace ✅

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| loop | Boucle | Une séance ≥ 5 km dont l'arrivée est à moins de 200 m du départ | Facile | ✅ | |
| out-back | Aller-retour | Une séance ≥ 5 km dont le retour repasse à moins de 50 m de l'aller sur 80 % de la trace | Facile | ✅ | |
| straight-10 | Ligne droite | Une séance ≥ 10 km dont aucun point ne s'écarte de plus de 500 m de la corde départ-arrivée | Moyen | ✅ | |
| far-500 | Dépaysé | Une séance à plus de 500 km de ta toute première séance | Moyen | ✅ | |
| far-5000 | Antipodes | Une séance à plus de 5 000 km de ta première séance | Impossible | ✅ | |
| coast | Les pieds dans l'eau | Un point GPS à moins de 200 m du trait de côte | Moyen | 🗺 | |
| same-route-10 | Routinier | Le même parcours (trace superposée à 90 %) 10 fois | Facile | ✅ | |
| same-route-50 | Métronome | Le même parcours 50 fois | Difficile | ✅ | |
| laps-5 | Manège | Une séance qui refait 5 fois la même boucle | Moyen | ✅ | oui |
| spread-100 | Grand écart | 2 séances la même semaine à plus de 100 km l'une de l'autre | Facile | ✅ | |

## 13. Équipe ✅

*Seule famille dont les règles regardent les autres joueurs.*

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| team-join | Bienvenue | Connecter son compte Strava | Facile | ✅ | |
| team-first-1 | Premier de la classe | Être le premier de la team à débloquer un badge | Facile | ✅ | oui |
| team-first-10 | Pionnier | Être premier sur 10 badges | Difficile | ✅ | |
| team-cross | Croisement | Passer dans la même zone qu'un coéquipier le même jour | Moyen | ✅ | |
| team-run | Sortie de groupe | Départ à moins de 10 min d'un coéquipier, traces à moins de 100 m sur ≥ 3 km | Moyen | ✅ | |
| team-all-zone | Toute la team | Tous les membres ont couru dans une même zone | Difficile | ✅ | |
| badges-25 | Collectionneur | 25 badges débloqués | Moyen | ✅ | |
| badges-50 | Vitrine | 50 badges | Difficile | ✅ | |
| badges-100 | Kongregate | 100 badges | Impossible | ✅ | |
| level-10 | Niveau 10 | Atteindre le niveau 10 | Difficile | ✅ | |
| impossible-1 | L'Impossible | Débloquer un badge Impossible | Difficile | ✅ | |
| impossible-5 | Légende | 5 badges Impossible | Impossible | ✅ | |

## 14. Team JPPJR — private jokes (à remplir par la team) ✅ / 🗺

*Lieux cultes, sorties mythiques, blagues internes. Chaque badge = une zone (à dessiner dans l'appli) ou une date, plus une règle. Exemples de gabarits :*

| ID | Nom | Comment l'obtenir | Palier | Données | Caché |
|---|---|---|---|---|---|
| jppjr-… | *(lieu culte)* | Une séance passant dans la zone « … » | Facile | ✅ | |
| jppjr-… | *(la sortie mythique)* | Refaire le parcours « … » (zone + boucle) | Moyen | ✅ | |
| jppjr-… | *(la date anniversaire de la team)* | Une séance le … de chaque année, 3 années de suite | Difficile | ✅ | |
| jppjr-… | *(le défi absurde)* | … | Impossible | ✅ | oui |

---

### Récapitulatif

| Famille | Badges | Facile | Moyen | Difficile | Impossible |
|---|---|---|---|---|---|
| Départements | 10 | 3 | 4 | 2 | 1 |
| Régions & pays | 9 | 2 | 2 | 2 | 3 |
| Carreaux | 9 | 2 | 3 | 3 | 1 |
| Zones | 10 | 2 | 4 | 3 | 1 |
| Distance | 12 | 4 | 3 | 3 | 2 |
| Cumul | 14 | 3 | 4 | 3 | 4 |
| Régularité | 9 | 3 | 2 | 2 | 2 |
| Horaires & calendrier | 11 | 4 | 4 | 2 | 1 |
| Sports | 8 | 2 | 4 | 2 | 0 |
| Montagne | 8 | 2 | 2 | 3 | 1 |
| Vitesse & durée | 12 | 2 | 2 | 5 | 3 |
| Géométrie | 8 | 3 | 3 | 1 | 1 |
| Équipe | 12 | 2 | 3 | 5 | 2 |
| **Total** | **132** | **34** | **40** | **36** | **22** |

Points totaux disponibles : 34 × 5 + 40 × 15 + 36 × 30 + 22 × 60 = **3 170 points**
(hors famille Team JPPJR). Badges cachés : 12 (~9 %) — la spec vise ~15 %, il y a de
la marge pour en cacher quelques-uns de plus.

Répartition des données : 92 badges calculables avec la base actuelle (✅), 19 avec les
géodonnées (🗺), 7 avec le dénivelé (⛰), 12 avec le temps (⏱), 2 hors V1 (🔬).
