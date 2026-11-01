# Gestion de l'usine - règles du projet

Projet universitaire (Licence 3 TWIN, ESATIC), géré en Scrum. Cahier des charges :
`PROMPT_application_gestion_usine.md` et `PROMPT_ROLES_PROFILS_PAGES.md` (rôles, pages, droits ; fait foi en cas de doute).
Le projet est passé de FastAPI + React à **Django seul** (pages rendues par le serveur) : les mentions de React,
FastAPI, JWT et Vite dans les prompts sont remplacées par leurs équivalents Django ci-dessous.

## Stack
- Django 6 (`config/` : réglages ; `usine/` : application unique), psycopg2, bcrypt, python-dotenv, whitenoise, gunicorn.
- `database/gestion_usine.sql` : schéma de référence (18 tables + jeu de données).
  `database/gestion_usine_supabase.sql` : même contenu sans CREATE DATABASE, relançable ; c'est lui qu'exécutent
  `init_db` et les tests.
- Base cible : PostgreSQL local ou Supabase (simple changement de `DATABASE_URL` dans `.env`).

## Règles impératives
- Ne jamais renommer une table ou une colonne. `usine/models.py` reprend le script SQL (`db_table`, `db_column`)
  avec `managed = False` : pas de migrations, le schéma vient uniquement du script.
- Pas de `django.contrib.auth` ni d'admin : les comptes sont ceux de la table `utilisateur` (bcrypt, `usine/auth.py`).
  Sessions en cookie signé : aucune table Django ajoutée à la base.
- Les secrets (mot de passe PostgreSQL, SECRET_KEY) vont uniquement dans `.env`, jamais dans git.
- Droits : matrice unique `MATRICE` dans `usine/permissions.py`. Vues protégées par `@droit_requis(ressource, action)`
  (403), boutons masqués avec `{% peut "ressource" "action" as ... %}`. Les tests `usine/tests/test_droits.py`
  recopient la matrice attendue : les deux doivent rester identiques.
- Agrégats : jamais `Count()` direct sur une relation vers une table à clé composée (participer, effectuer,
  consommer, nomenclature, achat) ; compter une colonne (`Count("participations__operateur")`).
- Messages en français. Aucun code partiel : pas de TODO, pas de « ... », pas de page vide.

## Design imposé
- Interface en français. Couleur principale `#1F4E8C`, gris neutres. Aucun orange (ni ambre).
- Icônes Lucide uniquement, via `{% icone "nom" %}` (`usine/icones.py`). Aucun émoji.
- Jamais de tiret long : utiliser « - ».
- Pas de bordure colorée à gauche des cartes, pas de ligne décorative au-dessus des titres, pas de dégradés.
- Montants : filtre `|fcfa` (1 500 FCFA). Dates : `|date_fr` (JJ/MM/AAAA), `|date_heure_fr`, durées `|duree`.
- Formulaires : classes de `usine/forms.py`, message sous chaque champ (`partiels/champ.html`), erreur globale en haut.
- Utilisable sur tablette : barre latérale repliable sous 1024 px.

## Conventions
- Code et noms en français.
- Vues : un fichier par module dans `usine/views/`. URLs nommées `module`, `module_detail`, `module_creer`,
  `module_modifier`, `module_supprimer` (le menu s'en sert pour surligner le module courant).
- Formulaires dans une fenêtre modale : lien `data-modal`, la vue utilise `traiter_formulaire`, `confirmer` ou
  `supprimer` de `usine/views/outils.py` (fragment si en-tête `X-Fenetre-Modale`, page complète sinon).
- Listes : conteneur `data-tableau` + `partiels/tableau_barre.html` et `tableau_pied.html` (recherche, tri, pagination
  dans `static/usine/js/app.js`).
- Un commit par fonctionnalité, message clair en français.

## Commandes (Windows, PowerShell)
```
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py init_db          # crée la base, les tables, les données, les comptes de test
python manage.py runserver        # http://localhost:8000
python manage.py test             # base test_gestion_usine créée puis supprimée
```

## Comptes de test
| Login | Mot de passe | Rôle |
|---|---|---|
| admin | Admin@2026 | ADMINISTRATEUR |
| itoure | Atelier@2026 | RESPONSABLE_ATELIER |
| mbamba | Equipe@2026 | COLLABORATEUR_RESPONSABLE |
| knguessan | Operateur@2026 | OPERATEUR |

## Avancement
- Version Django : tous les modules, tableaux de bord par rôle, profil, comptes - fait.
- Reste : CAPTURES (captures d'écran pour le rapport).
