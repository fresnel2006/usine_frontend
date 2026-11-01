from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404, render
from django.urls import reverse

from usine import models as m
from usine.forms import FiltreIncidentsForm, IncidentForm, TypeIncidentForm
from usine.permissions import droit_requis
from usine.views.outils import supprimer, traiter_formulaire


def statistiques():
    """Totaux des temps d'arrêt par lot, par ligne et par atelier."""
    par_lot = (
        m.Incident.objects.values("lot__num_lot", "lot__produit__designation")
        .annotate(total=Sum("temps_arret"), nombre=Count("num_incident"))
        .order_by("-total")
    )
    par_ligne = (
        m.Incident.objects.values("lot__ligne__num_ligne", "lot__ligne__atelier__libelle")
        .annotate(total=Sum("temps_arret"), nombre=Count("num_incident"))
        .order_by("-total")
    )
    par_atelier = (
        m.Atelier.objects.annotate(total=Sum("lignes__lots__incidents__temps_arret"))
        .values("num_atelier", "libelle", "total")
        .order_by("num_atelier")
    )
    par_atelier = [{**a, "total": a["total"] or 0} for a in par_atelier]
    return {
        "par_lot": par_lot,
        "par_ligne": par_ligne,
        "par_atelier": par_atelier,
        "max_atelier": max([a["total"] for a in par_atelier] + [0]),
    }


@droit_requis("incidents")
def liste(request):
    filtres = FiltreIncidentsForm(request.GET)
    incidents = filtres.filtrer(
        m.Incident.objects.select_related("type_incident", "lot__produit", "lot__ligne__atelier")
    ).order_by("-num_incident")
    return render(
        request, "usine/incidents/liste.html", {"incidents": incidents, "filtres": filtres, **statistiques()}
    )


@droit_requis("incidents")
def detail(request, num):
    incident = get_object_or_404(
        m.Incident.objects.select_related("type_incident", "lot__produit", "lot__ligne__atelier"), pk=num
    )
    return render(request, "usine/incidents/detail.html", {"incident": incident})


@droit_requis("incidents", "creer")
def creer(request):
    initial = {}
    if request.GET.get("lot"):
        initial["lot"] = request.GET["lot"]
    form = IncidentForm(request.POST or None, initial=initial)
    return traiter_formulaire(
        request,
        form,
        titre="Déclarer un incident",
        annuler=reverse("incidents"),
        suite=lambda i: reverse("incidents_detail", args=[i.pk]),
        message="Incident déclaré.",
        bouton="Déclarer",
    )


@droit_requis("incidents", "modifier")
def modifier(request, num):
    incident = get_object_or_404(m.Incident, pk=num)
    form = IncidentForm(request.POST or None, instance=incident)
    return traiter_formulaire(
        request,
        form,
        titre=f"Modifier l'incident {incident.num_incident}",
        annuler=reverse("incidents_detail", args=[num]),
        suite=lambda i: reverse("incidents_detail", args=[i.pk]),
        message="Incident modifié.",
    )


@droit_requis("incidents", "supprimer")
def supprimer_incident(request, num):
    incident = get_object_or_404(m.Incident, pk=num)
    return supprimer(
        request,
        incident,
        titre="Supprimer l'incident",
        message=f"Supprimer définitivement l'incident {incident.num_incident} ?",
        retour_annuler=reverse("incidents_detail", args=[num]),
        retour_succes=reverse("incidents"),
        message_succes="Incident supprimé.",
    )


# ---------------------------------------------------------------------------
# Types d'incident
# ---------------------------------------------------------------------------
@droit_requis("types_incident")
def types_liste(request):
    types = m.TypeIncident.objects.annotate(
        nb_incidents=Count("incidents"), total=Sum("incidents__temps_arret")
    )
    return render(request, "usine/incidents/types.html", {"types": types})


@droit_requis("types_incident", "creer")
def types_creer(request):
    form = TypeIncidentForm(request.POST or None)
    return traiter_formulaire(
        request,
        form,
        titre="Nouveau type d'incident",
        annuler=reverse("types_incident"),
        suite=reverse("types_incident"),
        message="Type d'incident créé.",
    )


@droit_requis("types_incident", "modifier")
def types_modifier(request, code):
    type_incident = get_object_or_404(m.TypeIncident, pk=code)
    form = TypeIncidentForm(
        request.POST or None,
        instance=type_incident,
        initial={"code_type": type_incident.code_type, "libelle": type_incident.libelle},
    )
    return traiter_formulaire(
        request,
        form,
        titre=f"Modifier le type {type_incident.code_type}",
        annuler=reverse("types_incident"),
        suite=reverse("types_incident"),
        message="Type d'incident modifié.",
    )


@droit_requis("types_incident", "supprimer")
def types_supprimer(request, code):
    type_incident = get_object_or_404(m.TypeIncident, pk=code)
    nb = type_incident.incidents.count()
    return supprimer(
        request,
        type_incident,
        titre="Supprimer le type d'incident",
        message=f"Supprimer définitivement le type {type_incident.code_type} - {type_incident.libelle} ?",
        blocage=f"Suppression impossible : {nb} incident(s) utilisent ce type." if nb else None,
        retour_annuler=reverse("types_incident"),
        retour_succes=reverse("types_incident"),
        message_succes="Type d'incident supprimé.",
    )
