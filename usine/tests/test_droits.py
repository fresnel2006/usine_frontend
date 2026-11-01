"""Une vérification par case de la matrice (section 4 de PROMPT_ROLES_PROFILS_PAGES.md).

La matrice attendue est recopiée ici volontairement, indépendamment de usine/permissions.py :
si quelqu'un modifie la matrice du code par erreur, ces tests échouent.
Action autorisée : la page répond 200. Action interdite : 403.
"""
from django.urls import reverse

from usine.tests.outils import ADMIN, COLLAB, OPER, RESP, TestUsine

T = "CLMS"
ATTENDU = {
    #                  admin  itoure  mbamba  knguessan
    "ateliers":       (T,     T,      "L",    "L"),
    "lignes":         (T,     T,      "L",    "L"),
    "lots":           (T,     T,      "L",    "L"),
    "produits":       (T,     T,      "L",    "L"),
    "operateurs":     (T,     "L",    T,      "L"),
    "equipes":        (T,     "L",    T,      "L"),
    "types_incident": (T,     "L",    T,      "L"),
    "incidents":      (T,     "L",    T,      "CL"),
    "machines":       (T,     "L",    T,      T),
    "maintenances":   (T,     "L",    T,      "CLM"),
    "consommations":  (T,     "L",    T,      "CLM"),
    "pieces":         (T,     "L",    T,      T),
    "nomenclature":   (T,     "L",    T,      T),
    "achats":         (T,     "L",    T,      "CLM"),
    "fournisseurs":   (T,     "L",    "L",    "L"),
    "utilisateurs":   (T,     "",     "",     ""),
}
COMPTES = (ADMIN, RESP, COLLAB, OPER)

# Page à ouvrir pour chaque action. La maintenance 1 et ses pièces ont été faites par OP005 (knguessan).
PAGES = {
    "ateliers": {"L": ("ateliers_detail", [10]), "C": ("ateliers_creer", []), "M": ("ateliers_modifier", [10]), "S": ("ateliers_supprimer", [10])},
    "lignes": {"L": ("lignes_detail", [101]), "C": ("lignes_creer", []), "M": ("lignes_modifier", [101]), "S": ("lignes_supprimer", [101])},
    "lots": {"L": ("lots_detail", [5001]), "C": ("lots_creer", []), "M": ("lots_modifier", [5001]), "S": ("lots_supprimer", [5001])},
    "produits": {"L": ("produits_detail", ["PRD-ATT1K"]), "C": ("produits_creer", []), "M": ("produits_modifier", ["PRD-ATT1K"]), "S": ("produits_supprimer", ["PRD-ATT1K"])},
    "operateurs": {"L": ("operateurs_detail", ["OP007"]), "C": ("operateurs_creer", []), "M": ("operateurs_modifier", ["OP007"]), "S": ("operateurs_supprimer", ["OP007"])},
    "equipes": {"L": ("equipes_detail", [1]), "C": ("equipes_creer", []), "M": ("equipes_modifier", [1]), "S": ("equipes_supprimer", [1])},
    "types_incident": {"L": ("types_incident", []), "C": ("types_incident_creer", []), "M": ("types_incident_modifier", ["PAN"]), "S": ("types_incident_supprimer", ["PAN"])},
    "incidents": {"L": ("incidents_detail", [1]), "C": ("incidents_creer", []), "M": ("incidents_modifier", [1]), "S": ("incidents_supprimer", [1])},
    "machines": {"L": ("machines_detail", [1]), "C": ("machines_creer", []), "M": ("machines_modifier", [1]), "S": ("machines_supprimer", [1])},
    "maintenances": {"L": ("maintenances_detail", [1]), "C": ("maintenances_creer", []), "M": ("maintenances_modifier", [1]), "S": ("maintenances_supprimer", [1])},
    "consommations": {"L": ("maintenances_detail", [1]), "C": ("maintenances_ajouter_piece", [1]), "M": ("maintenances_ajouter_piece", [1]), "S": ("maintenances_retirer_piece", [1, "PCE-COUR"])},
    "pieces": {"L": ("pieces_detail", ["PCE-COUR"]), "C": ("pieces_creer", []), "M": ("pieces_modifier", ["PCE-COUR"]), "S": ("pieces_supprimer", ["PCE-COUR"])},
    "nomenclature": {"L": ("pieces_detail", ["PCE-MOTR"]), "C": ("pieces_composant_ajouter", ["PCE-MOTR"]), "M": ("pieces_composant_modifier", ["PCE-MOTR", "PCE-ROUL"]), "S": ("pieces_composant_retirer", ["PCE-MOTR", "PCE-ROUL"])},
    "achats": {"L": ("pieces_detail", ["PCE-COUR"]), "C": ("pieces_achat_creer", []), "M": ("pieces_achat_modifier", ["PCE-COUR", "F001", "2026-09-10"]), "S": ("pieces_achat_supprimer", ["PCE-COUR", "F001", "2026-09-10"])},
    "fournisseurs": {"L": ("fournisseurs_detail", ["F001"]), "C": ("fournisseurs_creer", []), "M": ("fournisseurs_modifier", ["F001"]), "S": ("fournisseurs_supprimer", ["F001"])},
    "utilisateurs": {"L": ("utilisateurs", []), "C": ("utilisateurs_creer", []), "M": ("utilisateurs_modifier", ["mbamba"]), "S": ("utilisateurs_supprimer", ["mbamba"])},
}

NOMS_ACTIONS = {"C": "créer", "L": "lire", "M": "modifier", "S": "supprimer"}


class MatriceDesDroits(TestUsine):
    def test_chaque_case_de_la_matrice(self):
        for ressource, droits in ATTENDU.items():
            for login, lettres in zip(COMPTES, droits):
                self.connecter(login)
                for lettre in "CLMS":
                    nom, args = PAGES[ressource][lettre]
                    with self.subTest(ressource=ressource, compte=login, action=NOMS_ACTIONS[lettre]):
                        reponse = self.client.get(reverse(nom, args=args))
                        attendu = 200 if lettre in lettres else 403
                        self.assertEqual(reponse.status_code, attendu)

    def test_requete_forcee_refusee(self):
        """Parcours 1 : le responsable d'atelier force la suppression d'un fournisseur."""
        self.connecter(RESP)
        reponse = self.client.post(reverse("fournisseurs_supprimer", args=["F001"]))
        self.assertEqual(reponse.status_code, 403)
        self.assertContains(reponse, "Vous n&#x27;avez pas les droits pour effectuer cette action.", status_code=403)

    def test_ecritures_forcees_refusees(self):
        cas = [
            (OPER, "incidents_modifier", [1], {"lot": 5001, "type_incident": "PAN", "temps_arret": 5}),
            (OPER, "maintenances_supprimer", [1], {}),
            (COLLAB, "ateliers_creer", [], {"num_atelier": 99, "libelle": "X", "responsable": "OP007"}),
            (RESP, "operateurs_supprimer", ["OP007"], {}),
            (OPER, "utilisateurs_creer", [], {}),
        ]
        for login, nom, args, donnees in cas:
            with self.subTest(compte=login, page=nom):
                self.connecter(login)
                self.assertEqual(self.client.post(reverse(nom, args=args), donnees).status_code, 403)

    def test_operateur_non_membre_ne_modifie_pas_la_maintenance(self):
        # La maintenance 3 a été faite par OP006 seulement : knguessan (OP005) n'y a pas participé.
        self.connecter(OPER)
        self.assertEqual(self.client.get(reverse("maintenances_modifier", args=[3])).status_code, 403)
        self.assertEqual(self.client.get(reverse("maintenances_ajouter_piece", args=[3])).status_code, 403)
        self.assertEqual(self.client.get(reverse("maintenances_detail", args=[3])).status_code, 200)

    def test_menu_utilisateurs_reserve_a_l_administrateur(self):
        for login in COMPTES:
            with self.subTest(compte=login):
                self.connecter(login)
                page = self.client.get(reverse("tableau_de_bord"))
                lien = f'href="{reverse("utilisateurs")}"'
                if login == ADMIN:
                    self.assertContains(page, lien)
                else:
                    self.assertNotContains(page, lien)

    def test_boutons_masques_sans_droit(self):
        self.connecter(OPER)
        page = self.client.get(reverse("ateliers"))
        self.assertNotContains(page, reverse("ateliers_creer"))
        self.assertContains(page, "Lecture seule")
        self.connecter(RESP)
        page = self.client.get(reverse("ateliers"))
        self.assertContains(page, reverse("ateliers_creer"))
        self.assertNotContains(page, "Lecture seule")

    def test_pages_protegees_sans_connexion(self):
        reponse = self.client.get(reverse("ateliers"))
        self.assertEqual(reponse.status_code, 302)
        self.assertTrue(reponse["Location"].startswith("/connexion?suivant=%2Fateliers"))
