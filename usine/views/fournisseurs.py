from django.db.models import Count, Max, Min, Sum
from django.shortcuts import get_object_or_404, render
from django.urls import reverse

from usine import models as m
from usine.forms import FournisseurForm
from usine.permissions import droit_requis
from usine.views.outils import supprimer, traiter_formulaire


@droit_requis("fournisseurs")
def liste(request):
    fournisseurs = m.Fournisseur.objects.annotate(
        nb_achats=Count("achats__date_achat"),
        nb_pieces=Count("achats__piece", distinct=True),
        dernier_achat=Max("achats__date_achat"),
    )
    return render(request, "usine/fournisseurs/liste.html", {"fournisseurs": fournisseurs})


@droit_requis("fournisseurs")
def detail(request, code):
    fournisseur = get_object_or_404(m.Fournisseur, pk=code)
    pieces = (
        fournisseur.achats.values("piece__reference", "piece__libelle", "piece__quantite_stock")
        .annotate(
            quantite=Sum("quantite"), prix_min=Min("prix_achat"), prix_max=Max("prix_achat"), dernier=Max("date_achat")
        )
        .order_by("piece__reference")
    )
    achats = fournisseur.achats.select_related("piece").order_by("-date_achat")
    montant_total = sum(a.prix_achat * a.quantite for a in achats)
    return render(
        request,
        "usine/fournisseurs/detail.html",
        {"fournisseur": fournisseur, "pieces": pieces, "achats": achats, "montant_total": montant_total},
    )


@droit_requis("fournisseurs", "creer")
def creer(request):
    form = FournisseurForm(request.POST or None)
    return traiter_formulaire(
        request,
        form,
        titre="Nouveau fournisseur",
        annuler=reverse("fournisseurs"),
        suite=lambda f: reverse("fournisseurs_detail", args=[f.pk]),
        message="Fournisseur ajouté.",
    )


@droit_requis("fournisseurs", "modifier")
def modifier(request, code):
    fournisseur = get_object_or_404(m.Fournisseur, pk=code)
    form = FournisseurForm(
        request.POST or None,
        instance=fournisseur,
        initial={
            "code_fournisseur": fournisseur.code_fournisseur,
            "raison_sociale": fournisseur.raison_sociale,
            "adresse": fournisseur.adresse,
            "telephone": fournisseur.telephone,
        },
    )
    return traiter_formulaire(
        request,
        form,
        titre=f"Modifier le fournisseur {fournisseur.code_fournisseur}",
        annuler=reverse("fournisseurs_detail", args=[code]),
        suite=lambda f: reverse("fournisseurs_detail", args=[f.pk]),
        message="Fournisseur modifié.",
    )


@droit_requis("fournisseurs", "supprimer")
def supprimer_fournisseur(request, code):
    fournisseur = get_object_or_404(m.Fournisseur, pk=code)
    nb = fournisseur.achats.count()
    return supprimer(
        request,
        fournisseur,
        titre="Supprimer le fournisseur",
        message=f"Supprimer définitivement le fournisseur {fournisseur.code_fournisseur} - {fournisseur.raison_sociale} ?",
        blocage=f"Suppression impossible : {nb} achat(s) sont enregistrés chez ce fournisseur." if nb else None,
        retour_annuler=reverse("fournisseurs_detail", args=[code]),
        retour_succes=reverse("fournisseurs"),
        message_succes="Fournisseur supprimé.",
    )
