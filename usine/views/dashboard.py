"""Tableau de bord : contenu différent selon le rôle (section 5 de PROMPT_ROLES_PROFILS_PAGES.md)."""
from datetime import date, timedelta

from django.conf import settings
from django.db.models import Count, Q, Sum
from django.shortcuts import render

from usine import models as m
from usine.permissions import connexion_requise


def _semaine():
    fin = date.today()
    return fin - timedelta(days=6), fin


def _pieces_stock_faible():
    return m.Piece.objects.filter(quantite_stock__lte=settings.SEUIL_STOCK_FAIBLE).order_by("quantite_stock")


def _barres(lignes, cle_libelle, cle_valeur):
    """Prépare les données d'un graphique en barres horizontales."""
    lignes = list(lignes)
    maximum = max([l[cle_valeur] or 0 for l in lignes] + [0])
    return {
        "lignes": [{"libelle": l[cle_libelle], "valeur": l[cle_valeur] or 0} for l in lignes],
        "max": maximum,
    }


def _vue_administrateur():
    debut, fin = _semaine()
    comptes_par_role = []
    for code, libelle in m.ROLES:
        comptes = m.Utilisateur.objects.filter(role=code)
        comptes_par_role.append(
            {"libelle": libelle, "actifs": comptes.filter(actif=True).count(), "inactifs": comptes.filter(actif=False).count()}
        )
    return {
        "comptes_par_role": comptes_par_role,
        "comptes": m.Utilisateur.objects.select_related("operateur").order_by("role", "login"),
        "nb_fournisseurs": m.Fournisseur.objects.count(),
        "lots_semaine": m.LotProduction.objects.filter(date_production__range=(debut, fin)).count(),
        "temps_arret_total": m.Incident.objects.aggregate(t=Sum("temps_arret"))["t"] or 0,
        "pieces_faibles": _pieces_stock_faible(),
        "arrets_atelier": _barres(
            m.Atelier.objects.annotate(total=Sum("lignes__lots__incidents__temps_arret")).values("libelle", "total"),
            "libelle",
            "total",
        ),
    }


def _vue_responsable_atelier(utilisateur):
    debut, fin = _semaine()
    atelier = m.Atelier.objects.filter(responsable_id=utilisateur.operateur_id).first()
    lots_semaine = m.LotProduction.objects.filter(date_production__range=(debut, fin))
    lignes = m.LigneProduction.objects.select_related("atelier")
    if atelier is not None:
        lignes = lignes.filter(atelier=atelier)
    lots_par_ligne = [
        {"libelle": f"Ligne {l.num_ligne}", "total": lots_semaine.filter(ligne=l).count()} for l in lignes
    ]
    production = m.Produit.objects.annotate(
        nb_lots=Count("lots", filter=Q(lots__ligne__atelier=atelier) if atelier else Q())
    ).values("designation", "nb_lots")
    arret_atelier = 0
    if atelier is not None:
        arret_atelier = (
            m.Incident.objects.filter(lot__ligne__atelier=atelier).aggregate(t=Sum("temps_arret"))["t"] or 0
        )
    return {
        "atelier": atelier,
        "lots_semaine": lots_semaine.filter(ligne__in=lignes).count(),
        "graphique_lots": _barres(lots_par_ligne, "libelle", "total"),
        "graphique_production": _barres(production, "designation", "nb_lots"),
        "arret_atelier": arret_atelier,
        "nb_lignes": lignes.count(),
        "derniers_lots": m.LotProduction.objects.filter(ligne__in=lignes).select_related("produit", "ligne")[:5],
    }


def _vue_collaborateur(utilisateur):
    equipe = m.Equipe.objects.filter(responsable_id=utilisateur.operateur_id).first()
    if equipe is None and utilisateur.operateur_id:
        equipe = utilisateur.operateur.equipe
    par_type = m.TypeIncident.objects.annotate(total=Sum("incidents__temps_arret")).values("libelle", "total")
    return {
        "equipe": equipe,
        "membres": equipe.operateurs.all() if equipe else [],
        "incidents_recents": m.Incident.objects.select_related("type_incident", "lot__ligne__atelier")[:6],
        "graphique_types": _barres(par_type, "libelle", "total"),
        "temps_arret_total": m.Incident.objects.aggregate(t=Sum("temps_arret"))["t"] or 0,
    }


def _vue_operateur(utilisateur):
    operateur = utilisateur.operateur
    mes_maintenances = (
        m.Maintenance.objects.filter(interventions__operateur_id=utilisateur.operateur_id)
        .select_related("machine")
        .distinct()[:6]
    )
    # « Sa ligne » : la ligne du lot le plus récent auquel il a participé, sinon celles de ses maintenances.
    dernier_lot = (
        m.LotProduction.objects.filter(participations__operateur_id=utilisateur.operateur_id)
        .order_by("-date_production")
        .first()
    )
    if dernier_lot is not None:
        machines = m.Machine.objects.filter(ligne_id=dernier_lot.ligne_id)
        ligne = dernier_lot.ligne
    else:
        machines = m.Machine.objects.filter(
            maintenances__interventions__operateur_id=utilisateur.operateur_id
        ).distinct()
        ligne = None
    return {
        "operateur": operateur,
        "mes_maintenances": mes_maintenances,
        "pieces_faibles": _pieces_stock_faible(),
        "machines": machines.select_related("ligne"),
        "ligne": ligne,
    }


@connexion_requise
def tableau_de_bord(request):
    utilisateur = request.utilisateur
    vues = {
        m.ADMIN: ("usine/dashboard/administrateur.html", lambda: _vue_administrateur()),
        m.RESP_ATELIER: ("usine/dashboard/responsable_atelier.html", lambda: _vue_responsable_atelier(utilisateur)),
        m.COLLAB_RESP: ("usine/dashboard/collaborateur.html", lambda: _vue_collaborateur(utilisateur)),
        m.OPERATEUR: ("usine/dashboard/operateur.html", lambda: _vue_operateur(utilisateur)),
    }
    gabarit, contexte = vues[utilisateur.role]
    return render(
        request, gabarit, {**contexte(), "seuil": settings.SEUIL_STOCK_FAIBLE, "aujourdhui": date.today()}
    )
