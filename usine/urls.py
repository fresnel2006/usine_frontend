"""Adresses des pages (section 9.3 de PROMPT_ROLES_PROFILS_PAGES.md).

Convention de nommage : « module », « module_detail », « module_creer », « module_modifier »,
« module_supprimer » : le menu s'en sert pour surligner le module courant.
"""
from datetime import date

from django.urls import path, register_converter

from usine.views import (
    ateliers,
    auth,
    dashboard,
    equipes,
    erreurs,
    fournisseurs,
    incidents,
    lignes,
    lots,
    machines,
    maintenances,
    operateurs,
    pieces,
    produits,
    profil,
    utilisateurs,
)


class ConvertisseurJour:
    """Date au format AAAA-MM-JJ dans l'URL (clé des achats)."""

    regex = r"\d{4}-\d{2}-\d{2}"

    def to_python(self, valeur):
        return date.fromisoformat(valeur)

    def to_url(self, valeur):
        return valeur.isoformat() if hasattr(valeur, "isoformat") else str(valeur)


register_converter(ConvertisseurJour, "jour")

urlpatterns = [
    path("", auth.accueil, name="accueil"),
    path("connexion", auth.connexion, name="connexion"),
    path("deconnexion", auth.deconnexion, name="deconnexion"),
    path("tableau-de-bord", dashboard.tableau_de_bord, name="tableau_de_bord"),
    path("profil", profil.profil, name="profil"),
    path("acces-refuse", erreurs.page_acces_refuse, name="acces_refuse"),
    # Ateliers
    path("ateliers", ateliers.liste, name="ateliers"),
    path("ateliers/nouveau", ateliers.creer, name="ateliers_creer"),
    path("ateliers/<int:num>", ateliers.detail, name="ateliers_detail"),
    path("ateliers/<int:num>/modifier", ateliers.modifier, name="ateliers_modifier"),
    path("ateliers/<int:num>/supprimer", ateliers.supprimer_atelier, name="ateliers_supprimer"),
    # Lignes de production
    path("lignes", lignes.liste, name="lignes"),
    path("lignes/nouvelle", lignes.creer, name="lignes_creer"),
    path("lignes/<int:num>", lignes.detail, name="lignes_detail"),
    path("lignes/<int:num>/modifier", lignes.modifier, name="lignes_modifier"),
    path("lignes/<int:num>/supprimer", lignes.supprimer_ligne, name="lignes_supprimer"),
    # Lots de production
    path("lots", lots.liste, name="lots"),
    path("lots/nouveau", lots.creer, name="lots_creer"),
    path("lots/<int:num>", lots.detail, name="lots_detail"),
    path("lots/<int:num>/modifier", lots.modifier, name="lots_modifier"),
    path("lots/<int:num>/supprimer", lots.supprimer_lot, name="lots_supprimer"),
    # Produits
    path("produits", produits.liste, name="produits"),
    path("produits/nouveau", produits.creer, name="produits_creer"),
    path("produits/<str:ref>", produits.detail, name="produits_detail"),
    path("produits/<str:ref>/modifier", produits.modifier, name="produits_modifier"),
    path("produits/<str:ref>/supprimer", produits.supprimer_produit, name="produits_supprimer"),
    # Opérateurs
    path("operateurs", operateurs.liste, name="operateurs"),
    path("operateurs/nouveau", operateurs.creer, name="operateurs_creer"),
    path("operateurs/<str:matricule>", operateurs.detail, name="operateurs_detail"),
    path("operateurs/<str:matricule>/modifier", operateurs.modifier, name="operateurs_modifier"),
    path("operateurs/<str:matricule>/supprimer", operateurs.supprimer_operateur, name="operateurs_supprimer"),
    # Équipes
    path("equipes", equipes.liste, name="equipes"),
    path("equipes/nouvelle", equipes.creer, name="equipes_creer"),
    path("equipes/<int:num>", equipes.detail, name="equipes_detail"),
    path("equipes/<int:num>/modifier", equipes.modifier, name="equipes_modifier"),
    path("equipes/<int:num>/supprimer", equipes.supprimer_equipe, name="equipes_supprimer"),
    # Incidents et types d'incident
    path("incidents", incidents.liste, name="incidents"),
    path("incidents/declarer", incidents.creer, name="incidents_creer"),
    path("incidents/<int:num>", incidents.detail, name="incidents_detail"),
    path("incidents/<int:num>/modifier", incidents.modifier, name="incidents_modifier"),
    path("incidents/<int:num>/supprimer", incidents.supprimer_incident, name="incidents_supprimer"),
    path("types-incident", incidents.types_liste, name="types_incident"),
    path("types-incident/nouveau", incidents.types_creer, name="types_incident_creer"),
    path("types-incident/<str:code>/modifier", incidents.types_modifier, name="types_incident_modifier"),
    path("types-incident/<str:code>/supprimer", incidents.types_supprimer, name="types_incident_supprimer"),
    # Machines
    path("machines", machines.liste, name="machines"),
    path("machines/nouvelle", machines.creer, name="machines_creer"),
    path("machines/<int:num>", machines.detail, name="machines_detail"),
    path("machines/<int:num>/modifier", machines.modifier, name="machines_modifier"),
    path("machines/<int:num>/supprimer", machines.supprimer_machine, name="machines_supprimer"),
    # Maintenances et pièces consommées
    path("maintenances", maintenances.liste, name="maintenances"),
    path("maintenances/nouvelle", maintenances.creer, name="maintenances_creer"),
    path("maintenances/<int:num>", maintenances.detail, name="maintenances_detail"),
    path("maintenances/<int:num>/modifier", maintenances.modifier, name="maintenances_modifier"),
    path("maintenances/<int:num>/supprimer", maintenances.supprimer_maintenance, name="maintenances_supprimer"),
    path("maintenances/<int:num>/pieces/ajouter", maintenances.ajouter_piece, name="maintenances_ajouter_piece"),
    path(
        "maintenances/<int:num>/pieces/<str:ref>/retirer",
        maintenances.retirer_piece,
        name="maintenances_retirer_piece",
    ),
    # Pièces, nomenclature et achats
    path("pieces", pieces.liste, name="pieces"),
    path("pieces/nouvelle", pieces.creer, name="pieces_creer"),
    path("pieces/achats/nouveau", pieces.creer_achat, name="pieces_achat_creer"),
    path("pieces/<str:ref>", pieces.detail, name="pieces_detail"),
    path("pieces/<str:ref>/modifier", pieces.modifier, name="pieces_modifier"),
    path("pieces/<str:ref>/supprimer", pieces.supprimer_piece, name="pieces_supprimer"),
    path("pieces/<str:ref>/nomenclature/ajouter", pieces.ajouter_composant, name="pieces_composant_ajouter"),
    path(
        "pieces/<str:ref>/nomenclature/<str:composant>/modifier",
        pieces.modifier_composant,
        name="pieces_composant_modifier",
    ),
    path(
        "pieces/<str:ref>/nomenclature/<str:composant>/retirer",
        pieces.retirer_composant,
        name="pieces_composant_retirer",
    ),
    path(
        "pieces/<str:ref>/achats/<str:code>/<jour:jour>/modifier",
        pieces.modifier_achat,
        name="pieces_achat_modifier",
    ),
    path(
        "pieces/<str:ref>/achats/<str:code>/<jour:jour>/supprimer",
        pieces.supprimer_achat,
        name="pieces_achat_supprimer",
    ),
    # Fournisseurs
    path("fournisseurs", fournisseurs.liste, name="fournisseurs"),
    path("fournisseurs/nouveau", fournisseurs.creer, name="fournisseurs_creer"),
    path("fournisseurs/<str:code>", fournisseurs.detail, name="fournisseurs_detail"),
    path("fournisseurs/<str:code>/modifier", fournisseurs.modifier, name="fournisseurs_modifier"),
    path("fournisseurs/<str:code>/supprimer", fournisseurs.supprimer_fournisseur, name="fournisseurs_supprimer"),
    # Comptes utilisateurs (Administrateur)
    path("utilisateurs", utilisateurs.liste, name="utilisateurs"),
    path("utilisateurs/nouveau", utilisateurs.creer, name="utilisateurs_creer"),
    path("utilisateurs/<str:login>/modifier", utilisateurs.modifier, name="utilisateurs_modifier"),
    path("utilisateurs/<str:login>/activation", utilisateurs.basculer_actif, name="utilisateurs_activation"),
    path("utilisateurs/<str:login>/mot-de-passe", utilisateurs.reinitialiser, name="utilisateurs_mot_de_passe"),
    path("utilisateurs/<str:login>/supprimer", utilisateurs.supprimer_compte, name="utilisateurs_supprimer"),
]
