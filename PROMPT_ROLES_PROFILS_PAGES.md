# Prompt - Rôles, profils, pages et droits de l'application « Gestion de l'usine »

> À donner à l'IA (Claude Code ou autre) **en plus** du cahier des charges `PROMPT_application_gestion_usine.md` et du script `gestion_usine_supabase.sql`. Ce document décrit précisément **qui utilise l'application, ce que chacun voit, ce que chacun peut faire et ce qu'il ne peut pas faire**. Il fait foi en cas de doute.

---

Tu vas implémenter la gestion des **utilisateurs, des rôles, des profils, des pages et des droits** de l'application web « Gestion de l'usine » (React JS + API + base PostgreSQL hébergée sur **Supabase**). Respecte strictement ce qui suit. Chaque règle doit être appliquée **à deux endroits** :
- **côté serveur** : la requête est refusée avec le code 403 et le message « Vous n'avez pas les droits pour effectuer cette action. » ;
- **côté interface** : le menu, les boutons et les champs non autorisés sont masqués ou désactivés.

## 1. Les 4 types d'utilisateurs

L'application a **4 rôles**, stockés dans la colonne `utilisateur.role` :

| Code du rôle | Libellé affiché | Qui c'est dans l'usine |
|---|---|---|
| `ADMINISTRATEUR` | Administrateur | L'informaticien de l'usine. Il gère le logiciel, les comptes et les fournisseurs. Ce n'est pas un acteur de la production. |
| `RESPONSABLE_ATELIER` | Responsable atelier | Le chef d'un atelier. Il organise la fabrication : ateliers, lignes, lots et produits. |
| `COLLABORATEUR_RESPONSABLE` | Collaborateur responsable | Un opérateur qui dirige une équipe. Il gère les opérateurs, les équipes et les incidents. Il a **aussi tous les droits d'un opérateur** (généralisation UML). |
| `OPERATEUR` | Opérateur | L'agent de terrain. Il entretient les machines, note les pièces consommées et gère le stock de pièces. |

**Règles sur les comptes :**
- Chaque compte (sauf l'Administrateur) est **lié à un opérateur** de la table `operateur` par son matricule. Le nom et le prénom affichés viennent de cette fiche.
- Un compte peut être **actif ou désactivé** (`utilisateur.actif`). Un compte désactivé ne peut plus se connecter (message : « Ce compte est désactivé. Contactez l'administrateur. »).
- Un utilisateur a **un seul rôle**.
- Seul l'Administrateur crée, modifie, désactive ou réactive des comptes, et change les rôles.
- Personne ne peut supprimer **son propre compte** ni retirer **son propre rôle** d'Administrateur.
- Il doit toujours rester **au moins un Administrateur actif**.

## 2. Les profils (personnes du jeu de données)

Utilise ces profils pour les comptes de test (ils correspondent aux données du script SQL) :

| Identifiant | Nom affiché | Rôle | Fiche opérateur | Particularité |
|---|---|---|---|---|
| `admin` | Administrateur système | Administrateur | aucune | Informaticien de l'usine |
| `itoure` | TOURE Ibrahim | Responsable atelier | OP008 | Responsable de l'Atelier transformation (n° 10) |
| `mbamba` | BAMBA Mariam | Collaborateur responsable | OP002 | Responsable de l'Équipe du matin (n° 1) |
| `knguessan` | N'GUESSAN Koffi Hermann | Opérateur | OP005 | Membre de l'Équipe maintenance (n° 3) |

**Page « Mon profil » (tous les rôles) :**
- affiche le nom, le prénom, le matricule, le rôle, l'équipe, la date d'entrée, et l'atelier ou l'équipe dont la personne est responsable, s'il y en a ;
- permet de **changer son mot de passe** : ancien mot de passe, nouveau (8 caractères minimum), confirmation ;
- ne permet **pas** de changer son rôle, son matricule ni son équipe.

## 3. Menu (barre latérale) selon le rôle

| Entrée du menu | Administrateur | Responsable atelier | Collaborateur responsable | Opérateur |
|---|:---:|:---:|:---:|:---:|
| Tableau de bord | Oui | Oui | Oui | Oui |
| Ateliers | Oui | Oui | Oui | Oui |
| Lignes de production | Oui | Oui | Oui | Oui |
| Lots de production | Oui | Oui | Oui | Oui |
| Produits | Oui | Oui | Oui | Oui |
| Opérateurs | Oui | Oui | Oui | Oui |
| Équipes | Oui | Oui | Oui | Oui |
| Incidents | Oui | Oui | Oui | Oui |
| Machines | Oui | Oui | Oui | Oui |
| Maintenances | Oui | Oui | Oui | Oui |
| Pièces et stock | Oui | Oui | Oui | Oui |
| Fournisseurs | Oui | Oui | Oui | Oui |
| Utilisateurs | Oui | Non | Non | Non |
| Mon profil | Oui | Oui | Oui | Oui |

Tout le monde peut **consulter** presque tout : c'est un outil partagé de l'usine. Ce qui change selon le rôle, ce sont les **actions** (section 4). Le menu Utilisateurs n'apparaît que pour l'Administrateur. Si quelqu'un tape l'URL à la main, il est redirigé vers une page « Accès refusé ».

## 4. Matrice détaillée : qui fait quoi

Légende : **C** = créer, **L** = lire / consulter, **M** = modifier, **S** = supprimer, **-** = aucun accès.

| Page / donnée | Administrateur | Responsable atelier | Collaborateur responsable | Opérateur |
|---|---|---|---|---|
| Ateliers | C L M S | C L M S | L | L |
| Lignes de production | C L M S | C L M S | L | L |
| Lots de production (+ opérateurs du lot) | C L M S | C L M S | L | L |
| Produits (+ stock produit) | C L M S | C L M S | L | L |
| Opérateurs | C L M S | L | C L M S | L |
| Équipes (+ responsable d'équipe) | C L M S | L | C L M S | L |
| Types d'incident | C L M S | L | C L M S | L |
| Incidents | C L M S | L | C L M S | C L (déclarer seulement) |
| Machines | C L M S | L | C L M S | C L M S |
| Maintenances (+ opérateurs) | C L M S | L | C L M S | C L M |
| Pièces consommées (maintenance) | C L M S | L | C L M S | C L M |
| Pièces et stock | C L M S | L | C L M S | C L M S |
| Nomenclature des pièces | C L M S | L | C L M S | C L M S |
| Achats de pièces | C L M S | L | C L M S | C L M |
| Fournisseurs | C L M S | L | L | L |
| Utilisateurs et rôles | C L M S | - | - | - |
| Mon profil (mot de passe) | L M | L M | L M | L M |

**Précisions importantes :**
- **Opérateur et maintenances** : un opérateur peut modifier une maintenance **seulement s'il fait partie des opérateurs** qui l'ont effectuée (table `effectuer`). Il ne peut pas supprimer une maintenance : la suppression est réservée au Collaborateur responsable et à l'Administrateur.
- **Opérateur et incidents** : il peut **déclarer** un incident, mais il ne peut ni le modifier ni le supprimer.
- **Collaborateur responsable** : il a tous les droits de l'Opérateur, **plus** la gestion des opérateurs, des équipes et des incidents.
- **Responsable atelier** : il ne voit pas les boutons de création, de modification ou de suppression en dehors de ses modules (ateliers, lignes, lots, produits).
- **Administrateur** : il a tous les droits sur toutes les données, et il est le seul à gérer les **fournisseurs** et les **comptes**.

## 5. Ce que chaque rôle voit sur son tableau de bord

| Rôle | Contenu du tableau de bord |
|---|---|
| Administrateur | Nombre de comptes actifs et désactivés par rôle, derniers comptes créés, nombre de fournisseurs, vue globale de l'usine (lots de la semaine, temps d'arrêt total, pièces en stock faible) |
| Responsable atelier | Lots produits cette semaine par ligne (graphique), production par produit, temps d'arrêt de **son** atelier, raccourcis « Nouveau lot » et « Nouvelle ligne » |
| Collaborateur responsable | Membres de **son** équipe, incidents récents (avec leur type et leur temps d'arrêt), total des temps d'arrêt par type d'incident (graphique), raccourcis « Déclarer un incident » et « Ajouter un opérateur » |
| Opérateur | **Ses** dernières maintenances, pièces en stock faible (stock inférieur ou égal à 5), machines de sa ligne, raccourcis « Enregistrer une maintenance » et « Enregistrer un achat de pièce » |

« Son atelier » et « son équipe » sont retrouvés grâce au matricule du compte (`atelier.matricule_responsable`, `equipe.matricule_responsable`, `operateur.num_equipe`).

## 6. Les pages et ce qu'on y fait

Pour chaque page, l'interface contient une liste (recherche, filtres, tri, pagination), une fiche de détail et un formulaire. Les boutons Créer, Modifier et Supprimer ne s'affichent **que** si le rôle en a le droit (section 4).

| Page | Actions principales | Règles métier à faire respecter |
|---|---|---|
| Connexion | Se connecter, se déconnecter | Message « Identifiant ou mot de passe incorrect. » ; compte désactivé refusé |
| Ateliers | Ajouter, modifier, supprimer, consulter | Numéro unique ; **un seul responsable**, qui ne peut pas déjà être responsable d'un autre atelier ; suppression refusée si l'atelier a des lignes |
| Lignes de production | Ajouter dans un atelier, modifier, supprimer ; voir les machines et les lots | Nombre d'opérateurs nécessaires supérieur à 0 ; suppression refusée si la ligne a des machines ou des lots |
| Lots de production | Créer un lot (date, ligne, produit, opérateurs), consulter | Au moins **un** opérateur par lot ; filtre par date, ligne et produit |
| Produits | Ajouter, modifier, supprimer, consulter le stock | Référence unique ; prix et stock non négatifs ; suppression refusée si le produit est lié à un lot |
| Opérateurs | Ajouter, modifier, supprimer, voir la fiche | Matricule unique ; **une seule équipe** ; suppression refusée s'il est responsable d'un atelier ou d'une équipe |
| Équipes | Créer, modifier, supprimer, désigner le responsable | **Un seul collaborateur responsable** par équipe ; suppression refusée si l'équipe a encore des opérateurs |
| Incidents | Déclarer, modifier, supprimer ; gérer les types | **Un et un seul lot** par incident ; temps d'arrêt supérieur à 0 ; totaux par lot, ligne et atelier |
| Machines | Ajouter à une ligne, modifier, supprimer | **Une seule ligne** par machine |
| Maintenances | Enregistrer (machine, date et heure de début, durée, opérateurs), noter les pièces consommées | Au moins un opérateur ; pièces consommées **optionnelles** ; le stock de la pièce **baisse** (transaction) ; refus si le stock est insuffisant |
| Pièces et stock | Ajouter, modifier, supprimer ; nomenclature ; achats | Une pièce ne peut pas se composer d'elle-même ; un **achat augmente le stock** ; historique des prix par fournisseur |
| Fournisseurs | Ajouter, modifier, supprimer, consulter | Code unique ; détail avec les pièces fournies et les achats |
| Utilisateurs | Créer, modifier, désactiver ou réactiver, changer le rôle, lier à un opérateur, réinitialiser le mot de passe | Identifiant unique ; mot de passe haché ; au moins un Administrateur actif |
| Mon profil | Voir ses informations, changer son mot de passe | Ancien mot de passe obligatoire |
| Accès refusé | Page affichée si l'URL demandée n'est pas autorisée | Bouton « Retour au tableau de bord » |

## 7. Parcours typiques à tester (un par rôle)

1. **Responsable atelier (itoure)** : se connecte, crée la ligne 103 dans l'Atelier transformation, puis enregistre un lot d'attiéké déshydraté avec deux opérateurs. Il essaie de supprimer un fournisseur : le bouton n'existe pas, et l'API répond 403 si on force la requête.
2. **Collaborateur responsable (mbamba)** : ajoute un opérateur dans l'Équipe du matin, puis déclare un incident « Coupure de courant » de 40 minutes sur le lot 5002. Il voit le temps d'arrêt total de l'Atelier embouteillage augmenter.
3. **Opérateur (knguessan)** : enregistre une maintenance de 60 minutes sur la Capsuleuse automatique et note 2 joints d'étanchéité : le stock de cette pièce baisse de 2. Il essaie d'en noter 500 : le message « Stock insuffisant pour cette pièce. » s'affiche. Il enregistre ensuite un achat de 20 roulements chez Ivoire Pièces Industrielles : le stock augmente de 20.
4. **Administrateur (admin)** : crée un compte pour une nouvelle opératrice, puis le désactive. Il ajoute un fournisseur. Il essaie de désactiver son propre compte : c'est refusé.

## 8. Affichage du rôle dans l'interface

- **En-tête** : le nom de la personne et un **badge** avec son rôle (Administrateur, Responsable atelier, Collaborateur responsable ou Opérateur). Les badges sont dans des teintes de **bleu et de gris** uniquement.
- **Boutons non autorisés** : ils ne sont pas affichés. Une info-bulle « Lecture seule » s'affiche en haut des pages consultées sans droit de modification.
- **Messages** : en français, sans émoji, et sans tiret long « — » (seulement « - »).

## 9. Connexion et accès aux pages

### 9.1 Comptes de test (à créer par `seed_users.py`, mots de passe hachés avec bcrypt)

| Identifiant | Mot de passe de test | Rôle | Page d'arrivée après connexion |
|---|---|---|---|
| `admin` | `Admin@2026` | Administrateur | `/tableau-de-bord` |
| `itoure` | `Atelier@2026` | Responsable atelier | `/tableau-de-bord` |
| `mbamba` | `Equipe@2026` | Collaborateur responsable | `/tableau-de-bord` |
| `knguessan` | `Operateur@2026` | Opérateur | `/tableau-de-bord` |

Ces mots de passe sont **uniquement pour les tests** : écris-les dans le README, jamais dans le code de l'interface. Au premier lancement, la page de connexion affiche un petit encadré « Comptes de démonstration » avec ces identifiants, mais seulement si `VITE_MODE_DEMO=true` dans le `.env` du front.

### 9.2 Authentification

- La connexion utilise la table `utilisateur` de la base Supabase (identifiant et empreinte bcrypt). On n'utilise pas Supabase Auth, pour garder les rôles de la table.
- L'API renvoie un **jeton JWT** qui contient l'identifiant, le rôle et le matricule. Le jeton est valable **8 heures** (une journée de travail).
- Le front garde le jeton dans `sessionStorage` et l'envoie dans chaque requête (`Authorization: Bearer ...`).
- Quand le jeton expire ou que l'API répond 401, l'utilisateur est **déconnecté automatiquement** et renvoyé vers `/connexion`, avec le message « Votre session a expiré, veuillez vous reconnecter. ».
- Le bouton **Se déconnecter** (en haut à droite, et en bas de la barre latérale) efface le jeton et renvoie vers `/connexion`.
- Après **5 échecs de connexion** de suite sur un même identifiant, la connexion est bloquée pendant 5 minutes, avec le message « Trop de tentatives, réessayez dans 5 minutes. ».
- **Mot de passe oublié** : il n'y a pas d'envoi d'email. Le lien affiche « Contactez l'administrateur pour réinitialiser votre mot de passe. ». C'est l'Administrateur qui réinitialise le mot de passe depuis la page Utilisateurs.

### 9.3 Adresses des pages (routes React)

| URL | Page | Rôles autorisés |
|---|---|---|
| `/connexion` | Connexion | Public (si on est déjà connecté, redirection vers `/tableau-de-bord`) |
| `/` | Redirection vers `/tableau-de-bord` ou `/connexion` | - |
| `/tableau-de-bord` | Tableau de bord selon le rôle | Tous les rôles connectés |
| `/ateliers` et `/ateliers/:num` | Liste et détail des ateliers | Tous (actions selon la section 4) |
| `/lignes` et `/lignes/:num` | Lignes de production | Tous |
| `/lots` et `/lots/:num` | Lots de production | Tous |
| `/produits` et `/produits/:ref` | Produits | Tous |
| `/operateurs` et `/operateurs/:matricule` | Opérateurs | Tous |
| `/equipes` et `/equipes/:num` | Équipes | Tous |
| `/incidents` et `/incidents/:num` | Incidents | Tous |
| `/types-incident` | Types d'incident | Tous (modification : Collaborateur responsable, Administrateur) |
| `/machines` et `/machines/:num` | Machines | Tous |
| `/maintenances` et `/maintenances/:num` | Maintenances et pièces consommées | Tous |
| `/pieces` et `/pieces/:ref` | Pièces, stock, nomenclature, achats | Tous |
| `/fournisseurs` et `/fournisseurs/:code` | Fournisseurs | Tous (modification : Administrateur) |
| `/utilisateurs` | Gestion des comptes | Administrateur uniquement |
| `/profil` | Mon profil | Tous les rôles connectés |
| `/acces-refuse` | Accès refusé | Tous |
| `*` (toute autre URL) | Page « Page introuvable » avec un bouton de retour | Tous |

- Toutes les pages, sauf `/connexion`, sont **protégées** : sans être connecté, on est renvoyé vers `/connexion`. Après la connexion, on revient à la page demandée au départ.
- Une URL connue mais interdite pour le rôle (par exemple `/utilisateurs` pour un Opérateur) renvoie vers `/acces-refuse`.

## 10. Ce que je veux recevoir

1. Le **middleware ou les dépendances de contrôle des droits** côté API, avec une fonction unique, par exemple `require_roles([...])`, et le contrôle « membre de la maintenance » pour l'Opérateur.
2. Côté React :
   - un `AuthContext` avec l'utilisateur et son rôle ;
   - un composant `<RequireRole roles={[...]}>` pour protéger les routes ;
   - un hook `useCan(action, ressource)` pour afficher ou masquer les boutons ;
   - un fichier unique `permissions.js` qui reprend exactement la matrice de la section 4, pour que les droits soient définis **à un seul endroit**.
3. Les pages Connexion, Utilisateurs, Mon profil, Accès refusé et Page introuvable, avec toutes les routes de la section 9.3.
4. Les tableaux de bord différents selon le rôle (section 5).
5. Des tests automatiques pour chaque ligne de la matrice : pour chaque rôle, une action autorisée renvoie 200 ou 201, et une action interdite renvoie 403.
6. Un récapitulatif à la fin : un tableau « rôle, pages, actions » qui confirme que tout est appliqué.
