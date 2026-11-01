from django.contrib import messages
from django.shortcuts import redirect, render
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST

from usine.auth import ErreurConnexion, authentifier, fermer_session, ouvrir_session
from usine.forms import ConnexionForm

COMPTES_DEMO = [
    ("admin", "Admin@2026", "Administrateur"),
    ("itoure", "Atelier@2026", "Responsable atelier"),
    ("mbamba", "Equipe@2026", "Collaborateur responsable"),
    ("knguessan", "Operateur@2026", "Opérateur"),
]


def _suivant_sur(request):
    suivant = request.POST.get("suivant") or request.GET.get("suivant") or ""
    if suivant and url_has_allowed_host_and_scheme(suivant, {request.get_host()}, request.is_secure()):
        return suivant
    return "/tableau-de-bord"


def accueil(request):
    return redirect("tableau_de_bord" if request.utilisateur else "connexion")


def connexion(request):
    if request.utilisateur is not None:
        return redirect("tableau_de_bord")
    form = ConnexionForm(request.POST or None)
    erreur = ""
    if request.method == "POST" and form.is_valid():
        try:
            utilisateur = authentifier(form.cleaned_data["login"].strip(), form.cleaned_data["mot_de_passe"])
        except ErreurConnexion as e:
            erreur = str(e)
        else:
            ouvrir_session(request, utilisateur)
            return redirect(_suivant_sur(request))
    return render(
        request,
        "usine/connexion.html",
        {
            "form": form,
            "erreur": erreur,
            "suivant": request.POST.get("suivant") or request.GET.get("suivant", ""),
            "comptes_demo": COMPTES_DEMO,
            "session_expiree": request.GET.get("expiree") == "1",
        },
        status=401 if erreur else 200,
    )


@require_POST
def deconnexion(request):
    fermer_session(request)
    messages.success(request, "Vous êtes déconnecté.")
    return redirect("connexion")
