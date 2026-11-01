from datetime import date

from django.db.models import Prefetch
from django.shortcuts import get_object_or_404, render
from django.urls import reverse

from usine import models as m
from usine.forms import OperateurForm
from usine.permissions import droit_requis
from usine.views.outils import supprimer, traiter_formulaire


@droit_requis("operateurs")
def liste(request):
    operateurs = m.Operateur.objects.select_related("equipe", "atelier_dirige", "equipe_dirigee")
    return render(request, "usine/operateurs/liste.html", {"operateurs": operateurs})


@droit_requis("operateurs")
def detail(request, matricule):
    operateur = get_object_or_404(
        m.Operateur.objects.select_related("equipe__responsable", "atelier_dirige", "equipe_dirigee"),
        pk=matricule,
    )
    lots = (
        m.LotProduction.objects.filter(participations__operateur=operateur)
        .select_related("ligne__atelier", "produit")
        .distinct()
    )
    maintenances = (
        m.Maintenance.objects.filter(interventions__operateur=operateur)
        .select_related("machine")
        .prefetch_related(Prefetch("consommations", queryset=m.Consommer.objects.select_related("piece")))
        .distinct()
    )
    return render(
        request,
        "usine/operateurs/detail.html",
        {
            "operateur": operateur,
            "lots": lots,
            "maintenances": maintenances,
            "comptes": operateur.comptes.all(),
        },
    )


@droit_requis("operateurs", "creer")
def creer(request):
    initial = {"date_entree": date.today()}
    if request.GET.get("equipe"):
        initial["equipe"] = request.GET["equipe"]
    form = OperateurForm(request.POST or None, initial=initial)
    return traiter_formulaire(
        request,
        form,
        titre="Nouvel opérateur",
        annuler=reverse("operateurs"),
        suite=lambda o: reverse("operateurs_detail", args=[o.pk]),
        message="Opérateur ajouté.",
    )


@droit_requis("operateurs", "modifier")
def modifier(request, matricule):
    operateur = get_object_or_404(m.Operateur, pk=matricule)
    form = OperateurForm(
        request.POST or None,
        instance=operateur,
        initial={
            "matricule": operateur.matricule,
            "nom": operateur.nom,
            "prenom": operateur.prenom,
            "date_entree": operateur.date_entree,
            "equipe": operateur.equipe_id,
        },
    )
    return traiter_formulaire(
        request,
        form,
        titre=f"Modifier l'opérateur {operateur.matricule}",
        annuler=reverse("operateurs_detail", args=[matricule]),
        suite=lambda o: reverse("operateurs_detail", args=[o.pk]),
        message="Opérateur modifié.",
    )


def _blocage_suppression(operateur):
    raisons = []
    atelier = m.Atelier.objects.filter(responsable=operateur).first()
    if atelier:
        raisons.append(f"il est responsable de l'atelier « {atelier.libelle} »")
    equipe = m.Equipe.objects.filter(responsable=operateur).first()
    if equipe:
        raisons.append(f"il est responsable de l'équipe « {equipe.libelle} »")
    if operateur.participations.exists():
        raisons.append("il a participé à des lots de production")
    if operateur.interventions.exists():
        raisons.append("il a effectué des maintenances")
    if operateur.comptes.exists():
        raisons.append("un compte utilisateur lui est lié")
    if not raisons:
        return None
    return "Suppression impossible : " + " ; ".join(raisons) + "."


@droit_requis("operateurs", "supprimer")
def supprimer_operateur(request, matricule):
    operateur = get_object_or_404(m.Operateur, pk=matricule)
    return supprimer(
        request,
        operateur,
        titre="Supprimer l'opérateur",
        message=f"Supprimer définitivement l'opérateur {operateur.nom_complet} ({operateur.matricule}) ?",
        blocage=_blocage_suppression(operateur),
        retour_annuler=reverse("operateurs_detail", args=[matricule]),
        retour_succes=reverse("operateurs"),
        message_succes="Opérateur supprimé.",
    )
