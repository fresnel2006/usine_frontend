from datetime import date

from django.db.models import Count, Prefetch, Sum
from django.shortcuts import get_object_or_404, render
from django.urls import reverse

from usine import models as m
from usine.forms import FiltreLotsForm, LotForm
from usine.permissions import droit_requis
from usine.views.outils import supprimer, traiter_formulaire

PARTICIPANTS = Prefetch("participations", queryset=m.Participer.objects.select_related("operateur"))


@droit_requis("lots")
def liste(request):
    filtres = FiltreLotsForm(request.GET or None)
    lots = m.LotProduction.objects.select_related("ligne__atelier", "produit").prefetch_related(PARTICIPANTS)
    lots = filtres.filtrer(lots)
    return render(
        request,
        "usine/lots/liste.html",
        {"lots": lots, "filtres": filtres, "filtre_actif": any(request.GET.get(c) for c in filtres.fields)},
    )


@droit_requis("lots")
def detail(request, num):
    lot = get_object_or_404(
        m.LotProduction.objects.select_related("ligne__atelier", "produit").prefetch_related(PARTICIPANTS), pk=num
    )
    incidents = lot.incidents.select_related("type_incident")
    total_arret = incidents.aggregate(total=Sum("temps_arret"))["total"] or 0
    return render(
        request, "usine/lots/detail.html", {"lot": lot, "incidents": incidents, "total_arret": total_arret}
    )


def _prochain_numero():
    dernier = m.LotProduction.objects.order_by("-num_lot").values_list("num_lot", flat=True).first()
    return (dernier or 5000) + 1


@droit_requis("lots", "creer")
def creer(request):
    initial = {"num_lot": _prochain_numero(), "date_production": date.today()}
    if request.GET.get("ligne"):
        initial["ligne"] = request.GET["ligne"]
    form = LotForm(request.POST or None, initial=initial)
    return traiter_formulaire(
        request,
        form,
        titre="Nouveau lot de production",
        annuler=reverse("lots"),
        suite=lambda l: reverse("lots_detail", args=[l.pk]),
        message="Lot de production enregistré.",
        large=True,
    )


@droit_requis("lots", "modifier")
def modifier(request, num):
    lot = get_object_or_404(m.LotProduction, pk=num)
    form = LotForm(
        request.POST or None,
        instance=lot,
        initial={
            "num_lot": lot.num_lot,
            "date_production": lot.date_production,
            "ligne": lot.ligne_id,
            "produit": lot.produit_id,
        },
    )
    return traiter_formulaire(
        request,
        form,
        titre=f"Modifier le lot {lot.num_lot}",
        annuler=reverse("lots_detail", args=[num]),
        suite=lambda l: reverse("lots_detail", args=[l.pk]),
        message="Lot de production modifié.",
        large=True,
    )


@droit_requis("lots", "supprimer")
def supprimer_lot(request, num):
    lot = get_object_or_404(m.LotProduction.objects.annotate(nb_incidents=Count("incidents")), pk=num)
    return supprimer(
        request,
        lot,
        titre="Supprimer le lot",
        message=f"Supprimer définitivement le lot {lot.num_lot} et la liste de ses opérateurs ?",
        blocage=(
            f"Suppression impossible : {lot.nb_incidents} incident(s) sont déclarés sur ce lot."
            if lot.nb_incidents
            else None
        ),
        retour_annuler=reverse("lots_detail", args=[num]),
        retour_succes=reverse("lots"),
        message_succes="Lot de production supprimé.",
    )
