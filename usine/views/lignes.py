from django.db.models import Count
from django.shortcuts import get_object_or_404, render
from django.urls import reverse

from usine import models as m
from usine.forms import FiltreLignesForm, LigneForm
from usine.permissions import droit_requis
from usine.views.outils import supprimer, traiter_formulaire


@droit_requis("lignes")
def liste(request):
    filtres = FiltreLignesForm(request.GET)
    lignes = filtres.filtrer(m.LigneProduction.objects.select_related("atelier")).annotate(
        nb_machines=Count("machines", distinct=True), nb_lots=Count("lots", distinct=True)
    )
    return render(request, "usine/lignes/liste.html", {"lignes": lignes, "filtres": filtres})


@droit_requis("lignes")
def detail(request, num):
    ligne = get_object_or_404(m.LigneProduction.objects.select_related("atelier__responsable"), pk=num)
    lots = ligne.lots.select_related("produit").annotate(nb_operateurs=Count("participations__operateur"))
    return render(
        request,
        "usine/lignes/detail.html",
        {"ligne": ligne, "machines": ligne.machines.all(), "lots": lots},
    )


@droit_requis("lignes", "creer")
def creer(request):
    initial = {}
    if request.GET.get("atelier"):
        initial["atelier"] = request.GET["atelier"]
    form = LigneForm(request.POST or None, initial=initial)
    return traiter_formulaire(
        request,
        form,
        titre="Nouvelle ligne de production",
        annuler=reverse("lignes"),
        suite=lambda l: reverse("lignes_detail", args=[l.pk]),
        message="Ligne de production créée.",
    )


@droit_requis("lignes", "modifier")
def modifier(request, num):
    ligne = get_object_or_404(m.LigneProduction, pk=num)
    form = LigneForm(
        request.POST or None,
        instance=ligne,
        initial={
            "num_ligne": ligne.num_ligne,
            "atelier": ligne.atelier_id,
            "nb_operateurs_necessaires": ligne.nb_operateurs_necessaires,
        },
    )
    return traiter_formulaire(
        request,
        form,
        titre=f"Modifier la ligne {ligne.num_ligne}",
        annuler=reverse("lignes_detail", args=[num]),
        suite=lambda l: reverse("lignes_detail", args=[l.pk]),
        message="Ligne de production modifiée.",
    )


@droit_requis("lignes", "supprimer")
def supprimer_ligne(request, num):
    ligne = get_object_or_404(m.LigneProduction, pk=num)
    nb_machines, nb_lots = ligne.machines.count(), ligne.lots.count()
    blocage = None
    if nb_machines or nb_lots:
        blocage = (
            f"Suppression impossible : la ligne {ligne.num_ligne} a encore "
            f"{nb_machines} machine(s) et {nb_lots} lot(s) de production."
        )
    return supprimer(
        request,
        ligne,
        titre="Supprimer la ligne",
        message=f"Supprimer définitivement la ligne {ligne.num_ligne} ?",
        blocage=blocage,
        retour_annuler=reverse("lignes_detail", args=[num]),
        retour_succes=reverse("lignes"),
        message_succes="Ligne de production supprimée.",
    )
