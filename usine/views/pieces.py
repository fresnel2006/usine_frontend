from datetime import date

from django import forms
from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Count, F, Max, Min, Sum
from django.shortcuts import get_object_or_404, render
from django.urls import reverse

from usine import models as m
from usine.graphiques import courbe_prix
from usine.forms import AchatForm, FiltrePiecesForm, FormulaireBase, NomenclatureForm, PieceForm
from usine.permissions import droit_requis
from usine.views.outils import afficher_formulaire, confirmer, echec, succes, supprimer, traiter_formulaire


def arbre_nomenclature(piece, multiplicateur=1, niveau=0, chemin=None):
    """Liste à plat de l'arbre des composants : niveau d'indentation, quantité unitaire et totale."""
    chemin = (chemin or set()) | {piece.pk}
    lignes = []
    for lien in m.Nomenclature.objects.filter(composee=piece).select_related("composant").order_by("composant_id"):
        total = lien.quantite * multiplicateur
        lignes.append(
            {"niveau": niveau, "piece": lien.composant, "quantite": lien.quantite, "total": total, "direct": niveau == 0}
        )
        if lien.composant_id not in chemin:
            lignes.extend(arbre_nomenclature(lien.composant, total, niveau + 1, chemin))
    return lignes


@droit_requis("pieces")
def liste(request):
    filtres = FiltrePiecesForm(request.GET, seuil=settings.SEUIL_STOCK_FAIBLE)
    pieces = filtres.filtrer(m.Piece.objects.all()).annotate(
        nb_composants=Count("composants__composant", distinct=True), dernier_achat=Max("achats__date_achat")
    )
    return render(
        request, "usine/pieces/liste.html", {"pieces": pieces, "filtres": filtres, "seuil": settings.SEUIL_STOCK_FAIBLE}
    )


@droit_requis("pieces")
def detail(request, ref):
    piece = get_object_or_404(m.Piece, pk=ref)
    achats = piece.achats.select_related("fournisseur").order_by("-date_achat")
    prix_par_fournisseur = (
        piece.achats.values("fournisseur__code_fournisseur", "fournisseur__raison_sociale")
        .annotate(
            nb=Count("date_achat"),
            quantite=Sum("quantite"),
            prix_min=Min("prix_achat"),
            prix_max=Max("prix_achat"),
            prix_moyen=Avg("prix_achat"),
            dernier=Max("date_achat"),
        )
        .order_by("fournisseur__code_fournisseur")
    )
    return render(
        request,
        "usine/pieces/detail.html",
        {
            "piece": piece,
            "arbre": arbre_nomenclature(piece),
            "utilisee_dans": piece.entre_dans.select_related("composee"),
            "achats": achats,
            "prix_par_fournisseur": prix_par_fournisseur,
            "courbe": courbe_prix(piece.achats.select_related("fournisseur").order_by("date_achat")),
            "consommations": piece.consommations.select_related("maintenance__machine").order_by(
                "-maintenance__date_heure_debut"
            ),
            "seuil": settings.SEUIL_STOCK_FAIBLE,
            "onglet": request.GET.get("onglet", "nomenclature"),
        },
    )


@droit_requis("pieces", "creer")
def creer(request):
    form = PieceForm(request.POST or None)
    return traiter_formulaire(
        request,
        form,
        titre="Nouvelle pièce",
        annuler=reverse("pieces"),
        suite=lambda p: reverse("pieces_detail", args=[p.pk]),
        message="Pièce ajoutée.",
    )


@droit_requis("pieces", "modifier")
def modifier(request, ref):
    piece = get_object_or_404(m.Piece, pk=ref)
    form = PieceForm(
        request.POST or None,
        instance=piece,
        initial={
            "reference": piece.reference,
            "libelle": piece.libelle,
            "prix_unitaire_ht": piece.prix_unitaire_ht,
            "quantite_stock": piece.quantite_stock,
        },
    )
    return traiter_formulaire(
        request,
        form,
        titre=f"Modifier la pièce {piece.reference}",
        annuler=reverse("pieces_detail", args=[ref]),
        suite=lambda p: reverse("pieces_detail", args=[p.pk]),
        message="Pièce modifiée.",
    )


@droit_requis("pieces", "supprimer")
def supprimer_piece(request, ref):
    piece = get_object_or_404(m.Piece, pk=ref)
    raisons = []
    if piece.composants.exists() or piece.entre_dans.exists():
        raisons.append("elle figure dans une nomenclature")
    if piece.achats.exists():
        raisons.append("des achats sont enregistrés")
    if piece.consommations.exists():
        raisons.append("elle a été consommée lors de maintenances")
    return supprimer(
        request,
        piece,
        titre="Supprimer la pièce",
        message=f"Supprimer définitivement la pièce {piece.reference} - {piece.libelle} ?",
        blocage=("Suppression impossible : " + " ; ".join(raisons) + ".") if raisons else None,
        retour_annuler=reverse("pieces_detail", args=[ref]),
        retour_succes=reverse("pieces"),
        message_succes="Pièce supprimée.",
    )


# ---------------------------------------------------------------------------
# Nomenclature
# ---------------------------------------------------------------------------
@droit_requis("nomenclature", "creer")
def ajouter_composant(request, ref):
    piece = get_object_or_404(m.Piece, pk=ref)
    form = NomenclatureForm(request.POST or None, piece=piece)
    retour = reverse("pieces_detail", args=[ref])
    if request.method == "POST" and form.is_valid():
        m.Nomenclature.objects.create(
            composee=piece, composant=form.cleaned_data["composant"], quantite=form.cleaned_data["quantite"]
        )
        return succes(request, retour, "Composant ajouté à la nomenclature.")
    return afficher_formulaire(request, form, f"Ajouter un composant à {piece.reference}", retour, bouton="Ajouter")


class QuantiteForm(FormulaireBase):
    quantite = forms.IntegerField(
        label="Quantité",
        min_value=1,
        error_messages={
            "required": "Ce champ est obligatoire.",
            "invalid": "Saisissez un nombre entier.",
            "min_value": "La quantité doit être supérieure à 0.",
        },
    )


@droit_requis("nomenclature", "modifier")
def modifier_composant(request, ref, composant):
    lien = get_object_or_404(m.Nomenclature.objects.select_related("composant"), composee_id=ref, composant_id=composant)
    form = QuantiteForm(request.POST or None, initial={"quantite": lien.quantite})
    retour = reverse("pieces_detail", args=[ref])
    if request.method == "POST" and form.is_valid():
        m.Nomenclature.objects.filter(composee_id=ref, composant_id=composant).update(
            quantite=form.cleaned_data["quantite"]
        )
        return succes(request, retour, "Quantité du composant modifiée.")
    return afficher_formulaire(
        request, form, f"{lien.composant.libelle} dans {ref}", retour
    )


@droit_requis("nomenclature", "supprimer")
def retirer_composant(request, ref, composant):
    lien = get_object_or_404(m.Nomenclature.objects.select_related("composant"), composee_id=ref, composant_id=composant)
    retour = reverse("pieces_detail", args=[ref])
    if request.method != "POST":
        return confirmer(
            request,
            titre="Retirer le composant",
            message=f"Retirer {lien.composant.reference} - {lien.composant.libelle} de la nomenclature de {ref} ?",
            retour=retour,
            bouton="Retirer",
        )
    m.Nomenclature.objects.filter(composee_id=ref, composant_id=composant).delete()
    return succes(request, retour, "Composant retiré de la nomenclature.")


# ---------------------------------------------------------------------------
# Achats de pièces (l'achat augmente le stock)
# ---------------------------------------------------------------------------
def _url_achats(ref):
    return reverse("pieces_detail", args=[ref]) + "?onglet=achats"


@droit_requis("achats", "creer")
def creer_achat(request):
    initial = {"date_achat": date.today(), "quantite": 1}
    for cle in ("piece", "fournisseur"):
        if request.GET.get(cle):
            initial[cle] = request.GET[cle]
    form = AchatForm(request.POST or None, initial=initial)
    if request.method == "POST" and form.is_valid():
        d = form.cleaned_data
        with transaction.atomic():
            m.Achat.objects.create(
                piece=d["piece"],
                fournisseur=d["fournisseur"],
                date_achat=d["date_achat"],
                prix_achat=d["prix_achat"],
                quantite=d["quantite"],
            )
            m.Piece.objects.filter(pk=d["piece"].pk).update(quantite_stock=F("quantite_stock") + d["quantite"])
        piece = m.Piece.objects.get(pk=d["piece"].pk)
        return succes(
            request,
            _url_achats(piece.pk),
            f"Achat enregistré : stock de {piece.libelle} porté à {piece.quantite_stock}.",
        )
    annuler = _url_achats(request.GET["piece"]) if request.GET.get("piece") else reverse("pieces")
    return afficher_formulaire(
        request,
        form,
        "Enregistrer un achat de pièce",
        annuler,
    )


def _achat(ref, code, jour):
    return get_object_or_404(
        m.Achat.objects.select_related("piece", "fournisseur"), piece_id=ref, fournisseur_id=code, date_achat=jour
    )


class ModifierAchatForm(FormulaireBase):
    prix_achat = forms.DecimalField(
        label="Prix d'achat unitaire (FCFA)",
        max_digits=12,
        decimal_places=2,
        min_value=0,
        error_messages={
            "required": "Ce champ est obligatoire.",
            "invalid": "Saisissez un montant valide.",
            "min_value": "Le prix ne peut pas être négatif.",
        },
    )
    quantite = QuantiteForm.base_fields["quantite"]


@droit_requis("achats", "modifier")
def modifier_achat(request, ref, code, jour):
    achat = _achat(ref, code, jour)
    form = ModifierAchatForm(request.POST or None, initial={"prix_achat": achat.prix_achat, "quantite": achat.quantite})
    retour = _url_achats(ref)
    if request.method == "POST" and form.is_valid():
        ecart = form.cleaned_data["quantite"] - achat.quantite
        with transaction.atomic():
            piece = m.Piece.objects.select_for_update().get(pk=ref)
            if piece.quantite_stock + ecart < 0:
                form.add_error(
                    "quantite",
                    f"Stock insuffisant pour cette pièce : {piece.quantite_stock} en stock, "
                    f"impossible de retirer {-ecart} exemplaire(s).",
                )
            else:
                m.Achat.objects.filter(piece_id=ref, fournisseur_id=code, date_achat=jour).update(
                    prix_achat=form.cleaned_data["prix_achat"], quantite=form.cleaned_data["quantite"]
                )
                piece.quantite_stock += ecart
                piece.save(update_fields=["quantite_stock"])
                return succes(request, retour, f"Achat modifié. Stock de {piece.libelle} : {piece.quantite_stock}.")
    return afficher_formulaire(
        request,
        form,
        f"Achat du {achat.date_achat:%d/%m/%Y} - {achat.fournisseur.raison_sociale}",
        retour,
        intro=f"{achat.piece.reference} - {achat.piece.libelle}",
    )


@droit_requis("achats", "supprimer")
def supprimer_achat(request, ref, code, jour):
    achat = _achat(ref, code, jour)
    retour = _url_achats(ref)
    if request.method != "POST":
        return confirmer(
            request,
            titre="Supprimer l'achat",
            message=(
                f"Supprimer l'achat du {achat.date_achat:%d/%m/%Y} chez {achat.fournisseur.raison_sociale} ? "
                f"Les {achat.quantite} exemplaire(s) seront retirés du stock."
            ),
            retour=retour,
        )
    with transaction.atomic():
        piece = m.Piece.objects.select_for_update().get(pk=ref)
        if piece.quantite_stock < achat.quantite:
            return echec(
                request,
                retour,
                f"Suppression impossible : stock insuffisant ({piece.quantite_stock}) pour retirer "
                f"{achat.quantite} exemplaire(s).",
            )
        piece.quantite_stock -= achat.quantite
        piece.save(update_fields=["quantite_stock"])
        m.Achat.objects.filter(piece_id=ref, fournisseur_id=code, date_achat=jour).delete()
    return succes(request, retour, "Achat supprimé et stock ajusté.")
