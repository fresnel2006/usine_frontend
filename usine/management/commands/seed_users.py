"""Remplace les fausses empreintes du script SQL par de vraies empreintes bcrypt.

Usage : python manage.py seed_users
Relançable : les 4 comptes de test retrouvent leur mot de passe de test.
"""
from django.core.management.base import BaseCommand

from usine.auth import hacher_mot_de_passe
from usine.models import Utilisateur

MOTS_DE_PASSE_TEST = {
    "admin": "Admin@2026",
    "itoure": "Atelier@2026",
    "mbamba": "Equipe@2026",
    "knguessan": "Operateur@2026",
}
PREFIXE_EMPREINTE_EXEMPLE = "$2b$12$exempleEmpreinte"


def initialiser_comptes(seulement_empreintes_exemple=False, ecrire=print):
    """Si seulement_empreintes_exemple est vrai, un mot de passe déjà changé est conservé."""
    for login, mot_de_passe in MOTS_DE_PASSE_TEST.items():
        compte = Utilisateur.objects.filter(login=login).first()
        if compte is None:
            ecrire(f"  - {login} : compte absent de la base, ignoré")
            continue
        if seulement_empreintes_exemple and not compte.mot_de_passe.startswith(PREFIXE_EMPREINTE_EXEMPLE):
            ecrire(f"  - {login} : mot de passe déjà défini, conservé")
            continue
        compte.mot_de_passe = hacher_mot_de_passe(mot_de_passe)
        compte.save(update_fields=["mot_de_passe"])
        ecrire(f"  - {login} ({compte.get_role_display()}) : mot de passe = {mot_de_passe}")


class Command(BaseCommand):
    help = "Donne leur mot de passe de test aux comptes admin, itoure, mbamba et knguessan."

    def handle(self, *args, **options):
        initialiser_comptes(ecrire=self.stdout.write)
        self.stdout.write(self.style.SUCCESS("Empreintes bcrypt enregistrées."))
