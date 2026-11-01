from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404, render
from django.urls import reverse

from usine import models as m
from usine.forms import AtelierForm
from usine.permissions import droit_requis
from usine.views.outils import supprimer, traiter_formulaire


@droit_requis("ateliers")
def liste(request):
    ateliers = m.Atelier.objects.select_related("responsable").annotate(
        nb_lignes=Count("lignes", distinct=True)
    )
    return render(request, "usine/ateliers/liste.html", {"ateliers": ateliers})


@droit_requis("ateliers")
def detail(request, num):
    atelier = get_object_or_404(m.Atelier.objects.select_related("responsable"), pk=num)
    lignes = atelier.lignes.annotate(nb_machines=Count("machines", distinct=True), nb_lots=Count("lots", distinct=True))
    temps_arret = (
        m.Incident.objects.filter(lot__ligne__atelier=atelier).aggregate(total=Sum("temps_arret"))["total"] or 0
    )
    return render(
        request, "usine/ateliers/detail.html", {"atelier": atelier, "lignes": lignes, "temps_arret": temps_arret}
    )


@droit_requis("ateliers", "creer")
def creer(request):
    form = AtelierForm(request.POST or None)
    return traiter_formulaire(
        request,
        form,
        titre="Nouvel atelier",
        annuler=reverse("ateliers"),
        suite=lambda a: reverse("ateliers_detail", args=[a.pk]),
        message="Atelier créé.",
    )


@droit_requis("ateliers", "modifier")
def modifier(request, num):
    atelier = get_object_or_404(m.Atelier, pk=num)
    form = AtelierForm(
        request.POST or None,
        instance=atelier,
        initial={"num_atelier": atelier.num_atelier, "libelle": atelier.libelle, "responsable": atelier.responsable_id},
    )
    return traiter_formulaire(
        request,
        form,
        titre=f"Modifier l'atelier {atelier.num_atelier}",
        annuler=reverse("ateliers_detail", args=[num]),
        suite=lambda a: reverse("ateliers_detail", args=[a.pk]),
        message="Atelier modifié.",
    )


@droit_requis("ateliers", "supprimer")
def supprimer_atelier(request, num):
    atelier = get_object_or_404(m.Atelier, pk=num)
    nb_lignes = atelier.lignes.count()
    return supprimer(
        request,
        atelier,
        titre="Supprimer l'atelier",
        message=f"Supprimer définitivement l'atelier {atelier.num_atelier} - {atelier.libelle} ?",
        blocage=(
            f"Suppression impossible : l'atelier contient encore {nb_lignes} ligne(s) de production."
            if nb_lignes
            else None
        ),
        retour_annuler=reverse("ateliers_detail", args=[num]),
        retour_succes=reverse("ateliers"),
        message_succes="Atelier supprimé.",
    )
