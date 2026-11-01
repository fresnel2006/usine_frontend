from usine.auth import utilisateur_de_la_session


class AuthentificationMiddleware:
    """Charge l'utilisateur connecté dans request.utilisateur (None si personne n'est connecté)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.utilisateur = utilisateur_de_la_session(request)
        return self.get_response(request)
