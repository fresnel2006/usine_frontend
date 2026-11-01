from django.shortcuts import render

from usine.permissions import MESSAGE_403, connexion_requise
from usine.views.outils import est_modale


def acces_refuse(request, exception=None):
    if est_modale(request):
        return render(request, "usine/partiels/refus_modal.html", {"message": MESSAGE_403}, status=403)
    return render(request, "usine/erreurs/acces_refuse.html", {"message": MESSAGE_403}, status=403)


def page_introuvable(request, exception=None):
    return render(request, "usine/erreurs/page_introuvable.html", status=404)


@connexion_requise
def page_acces_refuse(request):
    return render(request, "usine/erreurs/acces_refuse.html", {"message": MESSAGE_403})
