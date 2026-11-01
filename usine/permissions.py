"""Matrice des droits : source unique, utilisée par les vues ET par les gabarits.

Reprend exactement la section 4 de PROMPT_ROLES_PROFILS_PAGES.md.
C = créer, L = lire, M = modifier, S = supprimer.

- Côté serveur : le décorateur @droit_requis(ressource, action) répond 403.
- Côté interface : la balise {% peut "ressource" "action" %} masque les boutons
  et context_processors.py construit le menu à partir de cette matrice.
"""
from functools import wraps
from urllib.parse import urlencode

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.shortcuts import redirect

from usine.models import ADMIN, COLLAB_RESP, OPERATEUR, RESP_ATELIER

TOUS = "CLMS"

MATRICE = {
    #                  Administrateur  Responsable atelier  Collaborateur resp.  Opérateur
    "ateliers":       {ADMIN: TOUS, RESP_ATELIER: TOUS, COLLAB_RESP: "L", OPERATEUR: "L"},
    "lignes":         {ADMIN: TOUS, RESP_ATELIER: TOUS, COLLAB_RESP: "L", OPERATEUR: "L"},
    "lots":           {ADMIN: TOUS, RESP_ATELIER: TOUS, COLLAB_RESP: "L", OPERATEUR: "L"},
    "produits":       {ADMIN: TOUS, RESP_ATELIER: TOUS, COLLAB_RESP: "L", OPERATEUR: "L"},
    "operateurs":     {ADMIN: TOUS, RESP_ATELIER: "L", COLLAB_RESP: TOUS, OPERATEUR: "L"},
    "equipes":        {ADMIN: TOUS, RESP_ATELIER: "L", COLLAB_RESP: TOUS, OPERATEUR: "L"},
    "types_incident": {ADMIN: TOUS, RESP_ATELIER: "L", COLLAB_RESP: TOUS, OPERATEUR: "L"},
    "incidents":      {ADMIN: TOUS, RESP_ATELIER: "L", COLLAB_RESP: TOUS, OPERATEUR: "CL"},
    "machines":       {ADMIN: TOUS, RESP_ATELIER: "L", COLLAB_RESP: TOUS, OPERATEUR: TOUS},
    "maintenances":   {ADMIN: TOUS, RESP_ATELIER: "L", COLLAB_RESP: TOUS, OPERATEUR: "CLM"},
    "consommations":  {ADMIN: TOUS, RESP_ATELIER: "L", COLLAB_RESP: TOUS, OPERATEUR: "CLM"},
    "pieces":         {ADMIN: TOUS, RESP_ATELIER: "L", COLLAB_RESP: TOUS, OPERATEUR: TOUS},
    "nomenclature":   {ADMIN: TOUS, RESP_ATELIER: "L", COLLAB_RESP: TOUS, OPERATEUR: TOUS},
    "achats":         {ADMIN: TOUS, RESP_ATELIER: "L", COLLAB_RESP: TOUS, OPERATEUR: "CLM"},
    "fournisseurs":   {ADMIN: TOUS, RESP_ATELIER: "L", COLLAB_RESP: "L", OPERATEUR: "L"},
    "utilisateurs":   {ADMIN: TOUS, RESP_ATELIER: "", COLLAB_RESP: "", OPERATEUR: ""},
}

ACTIONS = {"creer": "C", "lire": "L", "modifier": "M", "supprimer": "S"}

MESSAGE_403 = "Vous n'avez pas les droits pour effectuer cette action."


def peut(utilisateur, ressource: str, action: str) -> bool:
    """Vrai si le rôle de l'utilisateur autorise l'action sur la ressource."""
    if utilisateur is None:
        return False
    lettre = ACTIONS[action]
    return lettre in MATRICE[ressource].get(utilisateur.role, "")


def est_membre_maintenance(utilisateur, maintenance) -> bool:
    return bool(
        utilisateur.operateur_id
        and maintenance.interventions.filter(operateur_id=utilisateur.operateur_id).exists()
    )


def peut_modifier_maintenance(utilisateur, maintenance) -> bool:
    """Un opérateur ne modifie que les maintenances qu'il a effectuées (table effectuer)."""
    if not peut(utilisateur, "maintenances", "modifier"):
        return False
    if utilisateur.role == OPERATEUR:
        return est_membre_maintenance(utilisateur, maintenance)
    return True


def peut_gerer_consommations(utilisateur, maintenance, action: str = "creer") -> bool:
    """Pièces consommées : même règle d'appartenance que la maintenance pour l'opérateur."""
    if not peut(utilisateur, "consommations", action):
        return False
    if utilisateur.role == OPERATEUR:
        return est_membre_maintenance(utilisateur, maintenance)
    return True


def connexion_requise(vue):
    @wraps(vue)
    def enveloppe(request, *args, **kwargs):
        if request.utilisateur is None:
            parametres = urlencode({"suivant": request.get_full_path()})
            # Un cookie de session présent mais plus valide signifie que la session a expiré.
            if settings.SESSION_COOKIE_NAME in request.COOKIES:
                parametres += "&expiree=1"
            return redirect(f"/connexion?{parametres}")
        return vue(request, *args, **kwargs)

    return enveloppe


def droit_requis(ressource: str, action: str = "lire"):
    """Décorateur de vue : connexion obligatoire, puis 403 si la matrice refuse l'action."""

    def decorateur(vue):
        @wraps(vue)
        @connexion_requise
        def enveloppe(request, *args, **kwargs):
            if not peut(request.utilisateur, ressource, action):
                raise PermissionDenied(MESSAGE_403)
            return vue(request, *args, **kwargs)

        return enveloppe

    return decorateur
