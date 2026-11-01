# Prompt - Application web « Gestion de l'usine » (React JS + PostgreSQL)

> Copie tout ce qui suit dans l'IA, et joins-lui le fichier `gestion_usine.sql`.

---

Tu es un développeur full-stack senior. Tu vas développer une **application web complète et fonctionnelle** de gestion d'une usine, pour un projet universitaire (Licence 3 TWIN, ESATIC, Abidjan). Le front-end est en **React JS** et la base de données est en **PostgreSQL**. La base existe déjà : son script est fourni dans le fichier joint `gestion_usine.sql`. Tu dois l'utiliser **sans changer le nom des tables ni des colonnes**.

Donne-moi un projet **prêt à lancer**, avec tous les fichiers complets. Je ne veux pas de code partiel, pas de « à compléter » et pas de « ... ».

## 1. Stack technique imposée

- **Front-end** : React 18 avec Vite, React Router, Axios, React Hook Form, Recharts pour les graphiques, et lucide-react pour les icônes.
- **Back-end (API REST)** : Python **FastAPI** avec SQLAlchemy 2, psycopg2, Pydantic v2 et Uvicorn. React ne peut pas parler directement à PostgreSQL, donc toutes les données passent par cette API.
- **Base de données** : PostgreSQL 16, base `gestion_usine`, créée avec le script fourni.
- **Authentification** : JWT (jeton dans le header `Authorization: Bearer`). Les mots de passe sont hachés avec bcrypt (passlib).
- **Configuration** : un fichier `.env` pour l'URL de la base, la clé JWT et l'URL de l'API. Fournis aussi un `.env.example`.

## 2. Contexte métier (à respecter strictement)

- **Atelier** : identifié par un numéro d'atelier et un libellé. Un atelier a **un seul responsable**.
- **Ligne de production** : chaque atelier comporte plusieurs lignes. Une ligne a un numéro et un nombre d'opérateurs nécessaires.
- **Lot de production** : identifié par un numéro. Il comprend le matricule du ou des opérateurs ayant oeuvré sur ce lot, le numéro de ligne, la date de production et la référence du produit fabriqué.
- **Produit** : référence, désignation, prix de vente unitaire et quantité en stock.
- **Opérateur** : matricule, nom, prénom et date d'entrée dans la société. Il appartient à **une seule équipe**.
- **Équipe** : numéro et libellé. Elle a **un seul collaborateur responsable**.
- **Incident** : identifié par un numéro. Il concerne **un et un seul lot**, a un type (code type et libellé) et un temps d'arrêt en minutes.
- **Machine** : une ligne est constituée de machines, et une machine n'appartient qu'à **une seule ligne**.
- **Maintenance** : faite par un ou plusieurs opérateurs, avec la date et l'heure de début et la durée. Des pièces **peuvent** être consommées, mais ce n'est pas obligatoire : une maintenance peut ne consommer aucune pièce.
- **Pièce** : référence, libellé, prix unitaire HT et quantité en stock.
  - Une pièce peut entrer en un ou plusieurs exemplaires dans la composition d'une autre pièce : c'est la **nomenclature** (table `nomenclature`, une pièce ne peut pas se composer d'elle-même).
- **Fournisseur** : code, raison sociale, adresse et téléphone. Une pièce peut avoir plusieurs fournisseurs.
  - On mémorise **les différents prix et dates d'achat** pour chaque pièce (table `achat`).

## 3. Acteurs, rôles et droits

Rôles de la table `utilisateur` : `ADMINISTRATEUR`, `RESPONSABLE_ATELIER`, `COLLABORATEUR_RESPONSABLE`, `OPERATEUR`.

| Module | Responsable atelier | Collaborateur responsable | Opérateur | Administrateur |
|---|---|---|---|---|
| Ateliers | Tout (CRUD) | Lecture | Lecture | Tout |
| Lignes de production + lots | Tout | Lecture | Lecture | Tout |
| Produits | Tout | Lecture | Lecture | Tout |
| Opérateurs | Lecture | Tout | Lecture | Tout |
| Équipes | Lecture | Tout | Lecture | Tout |
| Incidents + types d'incident | Lecture | Tout | Déclarer | Tout |
| Machines + maintenances | Lecture | Tout | Tout | Tout |
| Pièces, nomenclature, achats de pièces | Lecture | Tout | Tout | Tout |
| Fournisseurs | Lecture | Lecture | Lecture | Tout |
| Comptes utilisateurs | - | - | - | Tout |

- Le **Collaborateur responsable** est une spécialisation de l'**Opérateur** : il a tous les droits de l'opérateur, en plus des siens.
- L'**Administrateur** est l'informaticien : il gère les comptes et les fournisseurs, et il a accès à tout.
- Les droits doivent être vérifiés **côté API** (dépendance FastAPI par rôle) **et** côté interface (menus et boutons masqués).

## 4. Fonctionnalités par module (une page par module)

Chaque page a une liste avec recherche, filtres, tri et pagination. Elle a aussi un formulaire d'ajout et de modification (dans un panneau latéral ou une fenêtre), une confirmation avant suppression, et des messages de succès ou d'erreur.

1. **Connexion** : identifiant et mot de passe, message d'erreur si les informations sont erronées, redirection vers le tableau de bord selon le rôle, et déconnexion.
2. **Tableau de bord** : nombre de lots de la semaine, total des temps d'arrêt par atelier (graphique), derniers incidents, pièces dont le stock est faible, et dernières maintenances.
3. **Ateliers** : CRUD, choix du responsable (un opérateur qui n'est pas déjà responsable d'un autre atelier). La suppression est refusée si l'atelier contient des lignes.
4. **Lignes de production** : CRUD avec choix de l'atelier. Le détail d'une ligne affiche ses machines et ses lots.
5. **Lots de production** : création avec date, ligne, produit et sélection multiple des opérateurs (table `participer`). Liste filtrable par date, ligne et produit.
6. **Produits** : CRUD avec contrôle du prix et du stock (pas de valeur négative).
7. **Opérateurs** : CRUD avec affectation à une seule équipe et matricule unique. La fiche détaillée affiche l'équipe, les lots et les maintenances de l'opérateur.
8. **Équipes** : CRUD avec désignation du collaborateur responsable (un seul par équipe). La suppression est refusée si l'équipe contient encore des opérateurs.
9. **Incidents** : déclaration (choix d'un seul lot, du type et saisie du temps d'arrêt). Il faut aussi une gestion des types d'incident et un total des temps d'arrêt par lot, par ligne et par atelier.
10. **Machines et maintenances** : CRUD des machines (une seule ligne par machine).
    - Enregistrer une maintenance : machine, date et heure de début, durée, un ou plusieurs opérateurs (table `effectuer`).
    - Ajout **optionnel** des pièces consommées (table `consommer`).
    - La consommation **diminue le stock** de la pièce dans une **transaction**, et elle est refusée si le stock est insuffisant.
11. **Pièces** : CRUD et stock.
    - Gestion de la **nomenclature** : ajouter ou retirer un composant avec sa quantité, et afficher l'arbre des composants.
    - **Enregistrer un achat** : pièce, fournisseur, date, prix et quantité. L'achat **augmente le stock**.
    - Historique des prix d'achat par fournisseur.
12. **Fournisseurs** : CRUD. Le détail affiche les pièces fournies et l'historique des achats.
13. **Utilisateurs** (Administrateur seulement) : créer, modifier ou désactiver un compte, choisir son rôle et le lier à un opérateur.

## 5. API REST attendue

- Toutes les routes sont préfixées par `/api`. Il faut des routes CRUD pour chaque table, ainsi que les routes métier : `/api/auth/login`, `/api/dashboard`, `/api/maintenances/{id}/pieces`, `/api/pieces/{ref}/nomenclature`, `/api/pieces/{ref}/achats` et `/api/incidents/stats`.
- Il faut une validation Pydantic, des codes HTTP corrects (400, 401, 403, 404, 409 pour les doublons) et des messages d'erreur **en français**.
- La documentation Swagger doit être disponible sur `/docs`.
- Le CORS doit être configuré pour le front Vite (`http://localhost:5173`).

## 6. Données de test

- Le script SQL contient déjà un jeu de données. C'est une usine fictive, **Akwaba Agro-Industrie**, dans la zone industrielle de Yopougon à Abidjan, qui fabrique de l'attiéké déshydraté, de l'huile de palme rouge et du jus de bissap.
- Les mots de passe du script sont de fausses empreintes. Fournis un script `seed_users.py` qui remplace ces empreintes par de **vraies empreintes bcrypt**, avec un mot de passe de test pour chaque compte (`admin`, `itoure`, `mbamba`, `knguessan`). Indique ces mots de passe dans le README.
- Les montants s'affichent en **FCFA** (`1 500 FCFA`) et les dates au format `JJ/MM/AAAA`.

## 7. Design et interface (très important)

- Interface **en français**, propre et professionnelle, comme un vrai logiciel de gestion industrielle. Elle ne doit pas ressembler à un template généré par une IA.
- **Couleur principale : bleu** (`#1F4E8C`), avec des gris neutres. **Pas d'orange.**
- Mise en page avec une barre latérale (menu par module selon le rôle), un en-tête qui affiche l'utilisateur connecté et son rôle, et une zone de contenu.
- **Pas d'émojis.** Les icônes viennent uniquement de **lucide-react**.
- **Pas de tiret long « — »** dans les textes : utiliser un tiret simple « - ».
- **Pas de bordure colorée sur le côté gauche** des cartes ou des encadrés.
- **Pas de petite ligne décorative** au-dessus des titres de section.
- Tableaux lisibles, badges pour les états (stock faible, rôle), formulaires avec messages de validation sous les champs.
- Site responsive : il doit rester utilisable sur une tablette.
- Utilise du CSS simple (CSS Modules ou Tailwind CSS), sans bibliothèque de composants trop marquée.

## 8. Structure du projet attendue

```
gestion-usine/
  backend/
    app/
      main.py
      database.py
      models.py
      schemas.py
      security.py
      routers/  (auth, ateliers, lignes, lots, produits, operateurs, equipes,
                 incidents, machines, maintenances, pieces, fournisseurs,
                 utilisateurs, dashboard)
    seed_users.py
    requirements.txt
    .env.example
  frontend/
    src/
      api/        (client axios + intercepteur JWT)
      context/    (AuthContext)
      components/ (Layout, Sidebar, Table, Modal, FormField, ConfirmDialog...)
      pages/      (une page par module + Login + Dashboard)
      App.jsx
      main.jsx
    package.json
    .env.example
  database/
    gestion_usine.sql
  README.md
```

## 9. README

Le README doit expliquer, étape par étape et pour **Windows** :
1. créer la base dans pgAdmin et exécuter `gestion_usine.sql` ;
2. installer et lancer le back-end (`python -m venv venv`, `pip install -r requirements.txt`, `python seed_users.py`, `uvicorn app.main:app --reload`) ;
3. installer et lancer le front-end (`npm install`, `npm run dev`) ;
4. se connecter avec les comptes de test ;
5. corriger les erreurs courantes (port 5432, mot de passe PostgreSQL, CORS).

## 10. Ordre de livraison (sprints Scrum)

Livre le code dans cet ordre. À la fin de chaque étape, indique les fichiers créés et comment tester.

- **Étape 1 - Socle** : connexion à la base, modèles SQLAlchemy, authentification JWT, layout React avec le menu selon le rôle, puis ateliers, lignes de production et produits.
- **Étape 2 - Production et ressources humaines** : opérateurs, équipes, lots de production (avec les opérateurs) et incidents.
- **Étape 3 - Maintenance et livraison** : machines, maintenances avec pièces consommées, pièces, nomenclature, achats, fournisseurs, utilisateurs et tableau de bord.

Commence directement par l'étape 1, avec les fichiers complets.
