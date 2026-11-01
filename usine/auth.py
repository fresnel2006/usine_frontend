"""Authentification sur la table « utilisateur » : empreintes bcrypt, session, verrouillage."""
import bcrypt
from django.core.cache import cache

from usine.models import Utilisateur

CLE_SESSION = "login"
MAX_ECHECS = 5
DUREE_BLOCAGE = 5 * 60  # secondes

MSG_IDENTIFIANTS = "Identifiant ou mot de passe incorrect."
MSG_DESACTIVE = "Ce compte est désactivé. Contactez l'administrateur."
MSG_BLOQUE = "Trop de tentatives, réessayez dans 5 minutes."


class ErreurConnexion(Exception):
    pass


def hacher_mot_de_passe(mot_de_passe: str) -> str:
    return bcrypt.hashpw(mot_de_passe.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verifier_mot_de_passe(mot_de_passe: str, empreinte: str) -> bool:
    try:
        return bcrypt.checkpw(mot_de_passe.encode("utf-8"), empreinte.encode("utf-8"))
    except ValueError:
        # Empreinte invalide, par exemple les fausses empreintes du script SQL
        return False


def _cle_echecs(login: str) -> str:
    return f"echecs-connexion:{login.lower()}"


def authentifier(login: str, mot_de_passe: str) -> Utilisateur:
    """Renvoie l'utilisateur ou lève ErreurConnexion avec le message à afficher."""
    cle = _cle_echecs(login)
    if cache.get(cle, 0) >= MAX_ECHECS:
        raise ErreurConnexion(MSG_BLOQUE)

    utilisateur = Utilisateur.objects.select_related("operateur").filter(login=login).first()
    if utilisateur is None or not verifier_mot_de_passe(mot_de_passe, utilisateur.mot_de_passe):
        echecs = cache.get(cle, 0) + 1
        cache.set(cle, echecs, DUREE_BLOCAGE)
        raise ErreurConnexion(MSG_BLOQUE if echecs >= MAX_ECHECS else MSG_IDENTIFIANTS)
    if not utilisateur.actif:
        raise ErreurConnexion(MSG_DESACTIVE)

    cache.delete(cle)
    return utilisateur


def ouvrir_session(request, utilisateur: Utilisateur) -> None:
    request.session.cycle_key()
    request.session[CLE_SESSION] = utilisateur.login


def fermer_session(request) -> None:
    request.session.flush()


def utilisateur_de_la_session(request):
    login = request.session.get(CLE_SESSION)
    if not login:
        return None
    utilisateur = Utilisateur.objects.select_related("operateur").filter(login=login).first()
    if utilisateur is None or not utilisateur.actif:
        request.session.flush()
        return None
    return utilisateur
