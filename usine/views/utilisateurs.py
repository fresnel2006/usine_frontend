from django.shortcuts import get_object_or_404, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from usine import models as m
from usine.auth import hacher_mot_de_passe
from usine.forms import FiltreUtilisateursForm, ReinitialiserMotDePasseForm, UtilisateurForm, admins_actifs_autres_que
from usine.permissions import droit_requis
from usine.views.outils import afficher_formulaire, echec, succes, supprimer, traiter_formulaire


@droit_requis("utilisateurs")
def liste(request):
    filtres = FiltreUtilisateursForm(request.GET)
    comptes = filtres.filtrer(m.Utilisateur.objects.select_related("operateur")).order_by("login")
    return render(request, "usine/utilisateurs/liste.html", {"comptes": comptes, "filtres": filtres})


@droit_requis("utilisateurs", "creer")
def creer(request):
    form = UtilisateurForm(request.POST or None, utilisateur_connecte=request.utilisateur)
    return traiter_formulaire(
        request,
        form,
        titre="Nouveau compte",
        annuler=reverse("utilisateurs"),
        suite=reverse("utilisateurs"),
        message="Compte créé.",
        intro="Tout compte, sauf celui d'un administrateur, est lié à une fiche opérateur.",
    )


@droit_requis("utilisateurs", "modifier")
def modifier(request, login):
    compte = get_object_or_404(m.Utilisateur, pk=login)
    form = UtilisateurForm(request.POST or None, instance=compte, utilisateur_connecte=request.utilisateur)
    return traiter_formulaire(
        request,
        form,
        titre=f"Modifier le compte {compte.login}",
        annuler=reverse("utilisateurs"),
        suite=reverse("utilisateurs"),
        message="Compte modifié.",
    )


@require_POST
@droit_requis("utilisateurs", "modifier")
def basculer_actif(request, login):
    compte = get_object_or_404(m.Utilisateur, pk=login)
    retour = reverse("utilisateurs")
    if compte.actif:
        if compte.login == request.utilisateur.login:
            return echec(request, retour, "Vous ne pouvez pas désactiver votre propre compte.")
        if compte.role == m.ADMIN and admins_actifs_autres_que(compte.login) == 0:
            return echec(request, retour, "Il doit toujours rester au moins un Administrateur actif.")
    compte.actif = not compte.actif
    compte.save(update_fields=["actif"])
    return succes(request, retour, f"Compte {compte.login} {'réactivé' if compte.actif else 'désactivé'}.")


@droit_requis("utilisateurs", "modifier")
def reinitialiser(request, login):
    compte = get_object_or_404(m.Utilisateur, pk=login)
    form = ReinitialiserMotDePasseForm(request.POST or None)
    retour = reverse("utilisateurs")
    if request.method == "POST" and form.is_valid():
        compte.mot_de_passe = hacher_mot_de_passe(form.cleaned_data["nouveau"])
        compte.save(update_fields=["mot_de_passe"])
        return succes(request, retour, f"Mot de passe de {compte.login} réinitialisé.")
    return afficher_formulaire(
        request,
        form,
        f"Réinitialiser le mot de passe de {compte.login}",
        retour,
        intro="Communiquez le nouveau mot de passe à la personne concernée.",
    )


@droit_requis("utilisateurs", "supprimer")
def supprimer_compte(request, login):
    compte = get_object_or_404(m.Utilisateur, pk=login)
    blocage = None
    if compte.login == request.utilisateur.login:
        blocage = "Vous ne pouvez pas supprimer votre propre compte."
    elif compte.role == m.ADMIN and compte.actif and admins_actifs_autres_que(compte.login) == 0:
        blocage = "Il doit toujours rester au moins un Administrateur actif."
    return supprimer(
        request,
        compte,
        titre="Supprimer le compte",
        message=f"Supprimer définitivement le compte {compte.login} ? Préférez la désactivation pour garder une trace.",
        blocage=blocage,
        retour_annuler=reverse("utilisateurs"),
        retour_succes=reverse("utilisateurs"),
        message_succes="Compte supprimé.",
    )
