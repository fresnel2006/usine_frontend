from django.db.models import Count
from django.shortcuts import get_object_or_404, render
from django.urls import reverse

from usine import models as m
from usine.forms import ProduitForm
from usine.permissions import droit_requis
from usine.views.outils import supprimer, traiter_formulaire


@droit_requis("produits")
def liste(request):
    produits = m.Produit.objects.annotate(nb_lots=Count("lots"))
    return render(request, "usine/produits/liste.html", {"produits": produits})


@droit_requis("produits")
def detail(request, ref):
    produit = get_object_or_404(m.Produit, pk=ref)
    lots = produit.lots.select_related("ligne__atelier")
    return render(request, "usine/produits/detail.html", {"produit": produit, "lots": lots})


@droit_requis("produits", "creer")
def creer(request):
    form = ProduitForm(request.POST or None)
    return traiter_formulaire(
        request,
        form,
        titre="Nouveau produit",
        annuler=reverse("produits"),
        suite=lambda p: reverse("produits_detail", args=[p.pk]),
        message="Produit créé.",
    )


@droit_requis("produits", "modifier")
def modifier(request, ref):
    produit = get_object_or_404(m.Produit, pk=ref)
    form = ProduitForm(
        request.POST or None,
        instance=produit,
        initial={
            "reference": produit.reference,
            "designation": produit.designation,
            "prix_vente_unitaire": produit.prix_vente_unitaire,
            "quantite_stock": produit.quantite_stock,
        },
    )
    return traiter_formulaire(
        request,
        form,
        titre=f"Modifier le produit {produit.reference}",
        annuler=reverse("produits_detail", args=[ref]),
        suite=lambda p: reverse("produits_detail", args=[p.pk]),
        message="Produit modifié.",
    )


@droit_requis("produits", "supprimer")
def supprimer_produit(request, ref):
    produit = get_object_or_404(m.Produit, pk=ref)
    nb_lots = produit.lots.count()
    return supprimer(
        request,
        produit,
        titre="Supprimer le produit",
        message=f"Supprimer définitivement le produit {produit.reference} - {produit.designation} ?",
        blocage=(
            f"Suppression impossible : le produit est lié à {nb_lots} lot(s) de production." if nb_lots else None
        ),
        retour_annuler=reverse("produits_detail", args=[ref]),
        retour_succes=reverse("produits"),
        message_succes="Produit supprimé.",
    )
