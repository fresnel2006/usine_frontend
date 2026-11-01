from datetime import datetime

from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import F, Prefetch
from django.shortcuts import get_object_or_404, render
from django.urls import reverse

from usine import models as m
from usine.forms import ConsommationForm, MaintenanceForm
from usine.permissions import (
    MESSAGE_403,
    droit_requis,
    peut_gerer_consommations,
    peut_modifier_maintenance,
)
from usine.views.outils import afficher_formulaire, confirmer, succes, supprimer, traiter_formulaire

MSG_STOCK = "Stock insuffisant pour cette pièce."


def _avec_details(queryset):
    return queryset.select_related("machine__ligne__atelier").prefetch_related(
        Prefetch("interventions", queryset=m.Effectuer.objects.select_related("operateur")),
        Prefetch("consommations", queryset=m.Consommer.objects.select_related("piece")),
    )


@droit_requis("maintenances")
def liste(request):
    maintenances = _avec_details(m.Maintenance.objects.all())
    return render(request, "usine/maintenances/liste.html", {"maintenances": maintenances})


@droit_requis("maintenances")
def detail(request, num):
    maintenance = get_object_or_404(_avec_details(m.Maintenance.objects.all()), pk=num)
    utilisateur = request.utilisateur
    return render(
        request,
        "usine/maintenances/detail.html",
        {
            "maintenance": maintenance,
            "droit_modifier": peut_modifier_maintenance(utilisateur, maintenance),
            "droit_consommer": peut_gerer_consommations(utilisateur, maintenance, "creer"),
            "droit_retirer_piece": peut_gerer_consommations(utilisateur, maintenance, "supprimer"),
        },
    )


@droit_requis("maintenances", "creer")
def creer(request):
    initial = {"date_heure_debut": datetime.now().replace(second=0, microsecond=0)}
    if request.GET.get("machine"):
        initial["machine"] = request.GET["machine"]
    if request.utilisateur.operateur_id:
        initial["operateurs"] = [request.utilisateur.operateur_id]
    form = MaintenanceForm(request.POST or None, initial=initial, utilisateur=request.utilisateur)
    return traiter_formulaire(
        request,
        form,
        titre="Enregistrer une maintenance",
        annuler=reverse("maintenances"),
        suite=lambda x: reverse("maintenances_detail", args=[x.pk]),
        message="Maintenance enregistrée. Vous pouvez maintenant noter les pièces consommées.",
        large=True,
    )


@droit_requis("maintenances", "modifier")
def modifier(request, num):
    maintenance = get_object_or_404(m.Maintenance, pk=num)
    if not peut_modifier_maintenance(request.utilisateur, maintenance):
        raise PermissionDenied(MESSAGE_403)
    form = MaintenanceForm(request.POST or None, instance=maintenance, utilisateur=request.utilisateur)
    return traiter_formulaire(
        request,
        form,
        titre=f"Modifier la maintenance {maintenance.num_maintenance}",
        annuler=reverse("maintenances_detail", args=[num]),
        suite=lambda x: reverse("maintenances_detail", args=[x.pk]),
        message="Maintenance modifiée.",
        large=True,
    )


@droit_requis("maintenances", "supprimer")
def supprimer_maintenance(request, num):
    maintenance = get_object_or_404(m.Maintenance, pk=num)
    if request.method == "POST":
        # Les pièces consommées retournent en stock avant la suppression (cascade SQL sur consommer).
        with transaction.atomic():
            for conso in m.Consommer.objects.filter(maintenance=maintenance).select_related("piece"):
                m.Piece.objects.filter(pk=conso.piece_id).update(quantite_stock=F("quantite_stock") + conso.quantite)
            maintenance.delete()
        return succes(request, reverse("maintenances"), "Maintenance supprimée. Les pièces consommées ont été remises en stock.")
    return supprimer(
        request,
        maintenance,
        titre="Supprimer la maintenance",
        message=(
            f"Supprimer définitivement la maintenance {maintenance.num_maintenance} ? "
            "Les pièces consommées seront remises en stock."
        ),
        retour_annuler=reverse("maintenances_detail", args=[num]),
        retour_succes=reverse("maintenances"),
        message_succes="Maintenance supprimée.",
    )


# ---------------------------------------------------------------------------
# Pièces consommées (table consommer)
# ---------------------------------------------------------------------------
@droit_requis("consommations", "creer")
def ajouter_piece(request, num):
    maintenance = get_object_or_404(m.Maintenance, pk=num)
    if not peut_gerer_consommations(request.utilisateur, maintenance, "creer"):
        raise PermissionDenied(MESSAGE_403)
    form = ConsommationForm(request.POST or None, maintenance=maintenance)
    retour = reverse("maintenances_detail", args=[num])
    if request.method == "POST" and form.is_valid():
        piece, quantite = form.cleaned_data["piece"], form.cleaned_data["quantite"]
        with transaction.atomic():
            # Verrou sur la ligne de la pièce : deux consommations simultanées ne peuvent pas passer sous zéro.
            piece = m.Piece.objects.select_for_update().get(pk=piece.pk)
            if piece.quantite_stock < quantite:
                form.add_error("quantite", f"{MSG_STOCK} Stock disponible : {piece.quantite_stock}.")
            else:
                piece.quantite_stock -= quantite
                piece.save(update_fields=["quantite_stock"])
                conso = m.Consommer.objects.filter(maintenance=maintenance, piece=piece).first()
                if conso:
                    m.Consommer.objects.filter(maintenance=maintenance, piece=piece).update(
                        quantite=F("quantite") + quantite
                    )
                else:
                    m.Consommer.objects.create(maintenance=maintenance, piece=piece, quantite=quantite)
                return succes(
                    request, retour, f"{quantite} x {piece.libelle} noté(s). Stock restant : {piece.quantite_stock}."
                )
    return afficher_formulaire(
        request,
        form,
        f"Noter une pièce consommée - maintenance {num}",
        retour,
        bouton="Ajouter",
        intro="Le stock de la pièce diminue de la quantité consommée.",
    )


@droit_requis("consommations", "supprimer")
def retirer_piece(request, num, ref):
    maintenance = get_object_or_404(m.Maintenance, pk=num)
    if not peut_gerer_consommations(request.utilisateur, maintenance, "supprimer"):
        raise PermissionDenied(MESSAGE_403)
    conso = get_object_or_404(m.Consommer.objects.select_related("piece"), maintenance=maintenance, piece_id=ref)
    retour = reverse("maintenances_detail", args=[num])
    if request.method != "POST":
        return confirmer(
            request,
            titre="Retirer la pièce",
            message=(
                f"Retirer {conso.quantite} x {conso.piece.libelle} de la maintenance {num} ? "
                "La quantité sera remise en stock."
            ),
            retour=retour,
            bouton="Retirer",
        )
    with transaction.atomic():
        m.Piece.objects.filter(pk=ref).update(quantite_stock=F("quantite_stock") + conso.quantite)
        m.Consommer.objects.filter(maintenance=maintenance, piece_id=ref).delete()
    return succes(request, retour, "Pièce retirée et remise en stock.")
