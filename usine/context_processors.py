"""Variables disponibles dans tous les gabarits : utilisateur connecté et menu selon le rôle."""
from django.conf import settings

from usine.models import ROLES
from usine.permissions import peut

LIBELLES_ROLES = dict(ROLES)

# (titre du groupe, [(libellé, nom d'URL, icône, ressource à pouvoir lire ou None)])
MENU = [
    ("Pilotage", [
        ("Tableau de bord", "tableau_de_bord", "layout-dashboard", None),
    ]),
    ("Production", [
        ("Ateliers", "ateliers", "factory", "ateliers"),
        ("Lignes de production", "lignes", "workflow", "lignes"),
        ("Lots de production", "lots", "boxes", "lots"),
        ("Produits", "produits", "package", "produits"),
    ]),
    ("Personnel", [
        ("Opérateurs", "operateurs", "users", "operateurs"),
        ("Équipes", "equipes", "users-round", "equipes"),
    ]),
    ("Incidents", [
        ("Incidents", "incidents", "triangle-alert", "incidents"),
        ("Types d'incident", "types_incident", "tags", "types_incident"),
    ]),
    ("Maintenance", [
        ("Machines", "machines", "cog", "machines"),
        ("Maintenances", "maintenances", "wrench", "maintenances"),
        ("Pièces et stock", "pieces", "puzzle", "pieces"),
        ("Fournisseurs", "fournisseurs", "truck", "fournisseurs"),
    ]),
    ("Administration", [
        ("Utilisateurs", "utilisateurs", "user-cog", "utilisateurs"),
        ("Mon profil", "profil", "circle-user", None),
    ]),
]


def application(request):
    utilisateur = getattr(request, "utilisateur", None)
    resolution = getattr(request, "resolver_match", None)
    url_courante = (resolution.url_name or "") if resolution else ""
    menu = []
    if utilisateur is not None:
        for titre, liens in MENU:
            visibles = [
                {
                    "libelle": libelle,
                    "url": nom_url,
                    "icone": icone,
                    # Les pages d'un module sont nommées « module », « module_detail », « module_creer »...
                    "actif": url_courante == nom_url or url_courante.startswith(nom_url + "_"),
                }
                for libelle, nom_url, icone, ressource in liens
                if ressource is None or peut(utilisateur, ressource, "lire")
            ]
            if visibles:
                menu.append({"titre": titre, "liens": visibles})
    return {
        "utilisateur": utilisateur,
        "libelle_role": LIBELLES_ROLES.get(utilisateur.role, "") if utilisateur else "",
        "menu": menu,
        "mode_demo": settings.MODE_DEMO,
    }
