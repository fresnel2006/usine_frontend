# Gestion de l'usine - Akwaba Agro-Industrie

Application web de gestion d'une usine (projet Agile TWIN 3 - ESATIC, groupe 7) :
ateliers, lignes de production, lots, produits, opérateurs, équipes, incidents, machines,
maintenances, pièces, nomenclature, achats, fournisseurs et comptes utilisateurs.

- **Django 6** (pages HTML rendues par le serveur, formulaires, sessions)
- **PostgreSQL** (local ou Supabase), schéma défini par `database/gestion_usine.sql`
- Interface en français, icônes Lucide, CSS simple (`usine/static/usine/css/app.css`)

## 1. Prérequis (Windows)

- Python 3.12 ou plus récent
- PostgreSQL 16 ou plus récent (avec pgAdmin), service démarré sur le port 5432

## 2. Installation

Dans PowerShell, à la racine du projet :

```
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Ouvrez `.env` et remplacez `VOTRE_MOT_DE_PASSE` par le mot de passe de l'utilisateur `postgres`.

## 3. Créer la base

```
python manage.py init_db
```

Cette commande crée la base `gestion_usine`, exécute `database/gestion_usine_supabase.sql`
(18 tables et jeu de données) et donne leur mot de passe aux comptes de test.
Elle peut être relancée : si les tables existent, elle ne modifie rien.

| Commande | Effet |
|---|---|
| `python manage.py init_db` | Crée ce qui manque, ne supprime rien |
| `python manage.py init_db --reinitialiser` | Supprime et recrée les 18 tables (données perdues) |
| `python manage.py seed_users` | Remet les mots de passe des 4 comptes de test |

Avec pgAdmin, on peut aussi créer la base `gestion_usine` à la main, y exécuter
`database/gestion_usine_supabase.sql`, puis lancer `python manage.py seed_users`.

## 4. Lancer l'application

```
python manage.py runserver
```

Puis ouvrir http://localhost:8000

## 5. Comptes de test

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| `admin` | `Admin@2026` | Administrateur |
| `itoure` | `Atelier@2026` | Responsable atelier |
| `mbamba` | `Equipe@2026` | Collaborateur responsable |
| `knguessan` | `Operateur@2026` | Opérateur |

## 6. Droits par rôle

La matrice est définie une seule fois dans `usine/permissions.py`. Elle sert à refuser les
actions côté serveur (réponse 403) et à masquer menus et boutons dans les pages.

| Module | Administrateur | Responsable atelier | Collaborateur responsable | Opérateur |
|---|---|---|---|---|
| Ateliers, lignes, lots, produits | Tout | Tout | Lecture | Lecture |
| Opérateurs, équipes, types d'incident | Tout | Lecture | Tout | Lecture |
| Incidents | Tout | Lecture | Tout | Déclarer et lire |
| Machines, pièces, nomenclature | Tout | Lecture | Tout | Tout |
| Maintenances, pièces consommées, achats | Tout | Lecture | Tout | Créer, lire, modifier (*) |
| Fournisseurs | Tout | Lecture | Lecture | Lecture |
| Utilisateurs | Tout | - | - | - |

(*) Un opérateur ne modifie que les maintenances qu'il a effectuées.

## 7. Tests

```
python manage.py test
```

Django crée une base `test_gestion_usine`, y charge le script SQL, puis la supprime à la fin.
Les tests vérifient chaque case de la matrice des droits (200 ou 403), les parcours de chaque
rôle et les règles métier (stock, nomenclature, comptes).

## 8. Déploiement (Render)

1. Créer une base PostgreSQL en ligne (Supabase ou Render) et copier sa chaîne de connexion.
2. Sur render.com : New > Blueprint, choisir ce dépôt (le fichier `render.yaml` est lu).
3. Renseigner `DATABASE_URL`. Au démarrage, `init_db` remplit la base si elle est vide.

## 9. Erreurs courantes

| Message | Solution |
|---|---|
| `Connexion impossible à localhost:5432` | Vérifier que le service PostgreSQL est démarré et le port dans `DATABASE_URL` |
| `authentification refusée` | Mauvais mot de passe `postgres` dans `.env` |
| `relation "equipe" already exists` dans pgAdmin | La base est déjà créée : utiliser `python manage.py init_db` |
| `Identifiant ou mot de passe incorrect` avec un compte de test | Lancer `python manage.py seed_users` |
| Page sans style avec `DEBUG=false` | Lancer `python manage.py collectstatic` |
