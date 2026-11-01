from django.db.models import Count
from django.shortcuts import get_object_or_404, render
from django.urls import reverse

from usine import models as m
from usine.forms import EquipeForm
from usine.permissions import droit_requis
from usine.views.outils import supprimer, traiter_formulaire


@droit_requis("equipes")
def liste(request):
    equipes = m.Equipe.objects.select_related("responsable").annotate(nb_operateurs=Count("operateurs"))
    return render(request, "usine/equipes/liste.html", {"equipes": equipes})


@droit_requis("equipes")
def detail(request, num):
    equipe = get_object_or_404(m.Equipe.objects.select_related("responsable"), pk=num)
    return render(
        request, "usine/equipes/detail.html", {"equipe": equipe, "membres": equipe.operateurs.all()}
    )


@droit_requis("equipes", "creer")
def creer(request):
    form = EquipeForm(request.POST or None)
    return traiter_formulaire(
        request,
        form,
        titre="Nouvelle équipe",
        annuler=reverse("equipes"),
        suite=lambda e: reverse("equipes_detail", args=[e.pk]),
        message="Équipe créée. Ajoutez-y des opérateurs, puis désignez son responsable.",
    )


@droit_requis("equipes", "modifier")
def modifier(request, num):
    equipe = get_object_or_404(m.Equipe, pk=num)
    form = EquipeForm(
        request.POST or None,
        instance=equipe,
        initial={"num_equipe": equipe.num_equipe, "libelle": equipe.libelle, "responsable": equipe.responsable_id},
    )
    return traiter_formulaire(
        request,
        form,
        titre=f"Modifier l'équipe {equipe.num_equipe}",
        annuler=reverse("equipes_detail", args=[num]),
        suite=lambda e: reverse("equipes_detail", args=[e.pk]),
        message="Équipe modifiée.",
    )


@droit_requis("equipes", "supprimer")
def supprimer_equipe(request, num):
    equipe = get_object_or_404(m.Equipe, pk=num)
    nb = equipe.operateurs.count()
    return supprimer(
        request,
        equipe,
        titre="Supprimer l'équipe",
        message=f"Supprimer définitivement l'équipe {equipe.num_equipe} - {equipe.libelle} ?",
        blocage=f"Suppression impossible : l'équipe contient encore {nb} opérateur(s)." if nb else None,
        retour_annuler=reverse("equipes_detail", args=[num]),
        retour_succes=reverse("equipes"),
        message_succes="Équipe supprimée.",
    )
