from django.conf import settings
from django.test import TestCase

from usine.auth import CLE_SESSION

ADMIN, RESP, COLLAB, OPER = "admin", "itoure", "mbamba", "knguessan"
TOUS = (ADMIN, RESP, COLLAB, OPER)


class TestUsine(TestCase):
    def connecter(self, login):
        """Ouvre une session sans passer par le formulaire (le hachage bcrypt est lent).

        Avec les sessions en cookie signé, la clé de session est le contenu signé :
        il faut donc recopier le cookie après chaque enregistrement.
        """
        session = self.client.session
        session[CLE_SESSION] = login
        session.save()
        self.client.cookies[settings.SESSION_COOKIE_NAME] = session.session_key
