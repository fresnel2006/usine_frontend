from django.contrib import messages
from django.shortcuts import redirect, render

from usine import models as m
from usine.auth import hacher_mot_de_passe
from usine.forms import ChangerMotDePasseForm
from usine.permissions import connexion_requise


@connexion_requise
def profil(request):
    utilisateur = request.utilisateur
    operateur = None
    if utilisateur.operateur_id:
        operateur = m.Operateur.objects.select_related("equipe", "atelier_dirige", "equipe_dirigee").get(
            pk=utilisateur.operateur_id
        )
    form = ChangerMotDePasseForm(request.POST or None, utilisateur=utilisateur)
    if request.method == "POST" and form.is_valid():
        utilisateur.mot_de_passe = hacher_mot_de_passe(form.cleaned_data["nouveau"])
        utilisateur.save(update_fields=["mot_de_passe"])
        messages.success(request, "Votre mot de passe a été modifié.")
        return redirect("profil")
    return render(
        request,
        "usine/profil.html",
        {"operateur": operateur, "form": form},
        status=422 if form.is_bound and form.errors else 200,
    )
