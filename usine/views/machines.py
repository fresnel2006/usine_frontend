from django.db.models import Count, Max
from django.shortcuts import get_object_or_404, render
from django.urls import reverse

from usine import models as m
from usine.forms import FiltreMachinesForm, MachineForm
from usine.permissions import droit_requis
from usine.views.outils import supprimer, traiter_formulaire


@droit_requis("machines")
def liste(request):
    filtres = FiltreMachinesForm(request.GET)
    machines = filtres.filtrer(m.Machine.objects.select_related("ligne__atelier")).annotate(
        nb_maintenances=Count("maintenances"), derniere=Max("maintenances__date_heure_debut")
    )
    return render(request, "usine/machines/liste.html", {"machines": machines, "filtres": filtres})


@droit_requis("machines")
def detail(request, num):
    machine = get_object_or_404(m.Machine.objects.select_related("ligne__atelier"), pk=num)
    maintenances = machine.maintenances.prefetch_related("interventions__operateur")
    return render(request, "usine/machines/detail.html", {"machine": machine, "maintenances": maintenances})


@droit_requis("machines", "creer")
def creer(request):
    initial = {}
    if request.GET.get("ligne"):
        initial["ligne"] = request.GET["ligne"]
    form = MachineForm(request.POST or None, initial=initial)
    return traiter_formulaire(
        request,
        form,
        titre="Nouvelle machine",
        annuler=reverse("machines"),
        suite=lambda x: reverse("machines_detail", args=[x.pk]),
        message="Machine ajoutée.",
    )


@droit_requis("machines", "modifier")
def modifier(request, num):
    machine = get_object_or_404(m.Machine, pk=num)
    form = MachineForm(
        request.POST or None,
        instance=machine,
        initial={"num_machine": machine.num_machine, "designation": machine.designation, "ligne": machine.ligne_id},
    )
    return traiter_formulaire(
        request,
        form,
        titre=f"Modifier la machine {machine.num_machine}",
        annuler=reverse("machines_detail", args=[num]),
        suite=lambda x: reverse("machines_detail", args=[x.pk]),
        message="Machine modifiée.",
    )


@droit_requis("machines", "supprimer")
def supprimer_machine(request, num):
    machine = get_object_or_404(m.Machine, pk=num)
    nb = machine.maintenances.count()
    return supprimer(
        request,
        machine,
        titre="Supprimer la machine",
        message=f"Supprimer définitivement la machine {machine.num_machine} - {machine.designation} ?",
        blocage=f"Suppression impossible : {nb} maintenance(s) sont enregistrées sur cette machine." if nb else None,
        retour_annuler=reverse("machines_detail", args=[num]),
        retour_succes=reverse("machines"),
        message_succes="Machine supprimée.",
    )
