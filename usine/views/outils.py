"""Outils partagés par les vues : formulaires en fenêtre modale, confirmations, messages.

Les liens marqués data-modal (voir static/usine/js/app.js) chargent le formulaire dans une
fenêtre modale : la vue renvoie alors seulement le fragment HTML. Sans JavaScript, la même
vue affiche une page complète. Après un enregistrement réussi, une requête de la fenêtre
reçoit {"redirection": url} en JSON, une requête classique reçoit une redirection 302.
"""
from django.contrib import messages
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.shortcuts import redirect, render

ENTETE_MODALE = "X-Fenetre-Modale"


def est_modale(request) -> bool:
    return request.headers.get(ENTETE_MODALE) == "1"


def succes(request, url: str, message: str):
    messages.success(request, message)
    if est_modale(request):
        return JsonResponse({"redirection": url})
    return redirect(url)


def echec(request, url: str, message: str):
    messages.error(request, message)
    if est_modale(request):
        return JsonResponse({"redirection": url})
    return redirect(url)


def afficher_formulaire(request, form, titre, retour, *, large=False, bouton="Enregistrer", intro=""):
    """Affiche le formulaire (fragment pour la fenêtre modale, page complète sinon).

    Un formulaire invalide est renvoyé avec le code 422 pour que la fenêtre l'affiche à nouveau.
    """
    contexte = {
        "form": form,
        "titre": titre,
        "retour": retour,
        "large": large,
        "bouton": bouton,
        "intro": intro,
        "action": request.get_full_path(),
    }
    gabarit = "usine/partiels/formulaire_modal.html" if est_modale(request) else "usine/formulaire_page.html"
    statut = 422 if form.is_bound and form.errors else 200
    return render(request, gabarit, contexte, status=statut)


def traiter_formulaire(
    request, form, *, titre, annuler, suite, message, large=False, bouton="Enregistrer", intro=""
):
    """Valide puis enregistre (form.enregistrer()) dans une transaction, et redirige.

    annuler : URL du bouton Annuler (page complète).
    suite : URL après succès, ou fonction recevant l'objet enregistré et renvoyant l'URL.
    """
    if request.method == "POST" and form.is_valid():
        try:
            with transaction.atomic():
                objet = form.enregistrer()
        except IntegrityError:
            form.add_error(
                None, "Enregistrement impossible : ces données entrent en conflit avec des données existantes."
            )
        else:
            return succes(request, suite(objet) if callable(suite) else suite, message)
    return afficher_formulaire(request, form, titre, annuler, large=large, bouton=bouton, intro=intro)


def confirmer(request, *, titre, message, retour, bouton="Supprimer", danger=True):
    """Fenêtre de confirmation (GET). La vue effectue l'action en POST."""
    contexte = {
        "titre": titre,
        "message": message,
        "retour": retour,
        "bouton": bouton,
        "danger": danger,
        "action": request.get_full_path(),
    }
    gabarit = "usine/partiels/confirmation_modal.html" if est_modale(request) else "usine/confirmation_page.html"
    return render(request, gabarit, contexte)


def supprimer(request, objet, *, titre, message, retour_annuler, retour_succes, message_succes, blocage=None):
    """Suppression avec confirmation préalable.

    blocage : message expliquant pourquoi la suppression est refusée (ou None si elle est permise).
    """
    if request.method != "POST":
        if blocage:
            return confirmer(
                request, titre=titre, message=blocage, retour=retour_annuler, bouton="", danger=False
            )
        return confirmer(request, titre=titre, message=message, retour=retour_annuler)
    if blocage:
        return echec(request, retour_annuler, blocage)
    try:
        with transaction.atomic():
            objet.delete()
    except IntegrityError:
        return echec(
            request, retour_annuler, "Suppression impossible : cet élément est encore utilisé par d'autres données."
        )
    return succes(request, retour_succes, message_succes)
