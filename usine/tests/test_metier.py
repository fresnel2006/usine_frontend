"""Règles métier, parcours de la section 7 et pages de l'application."""
from django.core.cache import cache
from django.urls import reverse

from usine import models as m
from usine.auth import verifier_mot_de_passe
from usine.tests.outils import ADMIN, COLLAB, OPER, RESP, TOUS, TestUsine

MODALE = {"HTTP_X_FENETRE_MODALE": "1"}


class Connexion(TestUsine):
    def setUp(self):
        cache.clear()

    def test_connexion_reussie_puis_retour_page_demandee(self):
        reponse = self.client.post(
            reverse("connexion"), {"login": "itoure", "mot_de_passe": "Atelier@2026", "suivant": "/lots"}
        )
        self.assertRedirects(reponse, "/lots", fetch_redirect_response=False)
        self.assertEqual(self.client.get(reverse("tableau_de_bord")).status_code, 200)

    def test_mauvais_mot_de_passe(self):
        reponse = self.client.post(reverse("connexion"), {"login": "itoure", "mot_de_passe": "faux"})
        self.assertContains(reponse, "Identifiant ou mot de passe incorrect.", status_code=401)

    def test_compte_desactive(self):
        m.Utilisateur.objects.filter(login="mbamba").update(actif=False)
        reponse = self.client.post(reverse("connexion"), {"login": "mbamba", "mot_de_passe": "Equipe@2026"})
        self.assertContains(reponse, "Ce compte est désactivé. Contactez l&#x27;administrateur.", status_code=401)

    def test_blocage_apres_cinq_echecs(self):
        for _ in range(5):
            self.client.post(reverse("connexion"), {"login": "knguessan", "mot_de_passe": "faux"})
        reponse = self.client.post(reverse("connexion"), {"login": "knguessan", "mot_de_passe": "Operateur@2026"})
        self.assertContains(reponse, "Trop de tentatives, réessayez dans 5 minutes.", status_code=401)

    def test_deconnexion(self):
        self.connecter(ADMIN)
        self.client.post(reverse("deconnexion"))
        self.assertEqual(self.client.get(reverse("tableau_de_bord")).status_code, 302)

    def test_comptes_demo_affiches(self):
        self.assertContains(self.client.get(reverse("connexion")), "Comptes de démonstration")


class Pages(TestUsine):
    PAGES = [
        "tableau_de_bord", "profil", "ateliers", "lignes", "lots", "produits", "operateurs", "equipes",
        "incidents", "types_incident", "machines", "maintenances", "pieces", "fournisseurs", "acces_refuse",
    ]
    DETAILS = [
        ("ateliers_detail", [20]), ("lignes_detail", [201]), ("lots_detail", [5002]), ("produits_detail", ["PRD-BIS1L"]),
        ("operateurs_detail", ["OP005"]), ("equipes_detail", [3]), ("incidents_detail", [5]),
        ("machines_detail", [4]), ("maintenances_detail", [2]), ("pieces_detail", ["PCE-KITP"]),
        ("fournisseurs_detail", ["F003"]),
    ]

    def test_toutes_les_pages_pour_chaque_role(self):
        for login in TOUS:
            self.connecter(login)
            for nom in self.PAGES:
                with self.subTest(compte=login, page=nom):
                    self.assertEqual(self.client.get(reverse(nom)).status_code, 200)
            for nom, args in self.DETAILS:
                with self.subTest(compte=login, page=nom):
                    self.assertEqual(self.client.get(reverse(nom, args=args)).status_code, 200)
            for onglet in ("achats", "consommations"):
                with self.subTest(compte=login, onglet=onglet):
                    url = reverse("pieces_detail", args=["PCE-COUR"]) + f"?onglet={onglet}"
                    self.assertEqual(self.client.get(url).status_code, 200)

    def test_page_introuvable(self):
        self.connecter(ADMIN)
        self.assertEqual(self.client.get("/ateliers/999").status_code, 404)
        self.assertEqual(self.client.get("/nimporte-quoi").status_code, 404)

    def test_formats_fcfa_et_date(self):
        self.connecter(ADMIN)
        page = self.client.get(reverse("produits_detail", args=["PRD-ATT1K"]))
        self.assertContains(page, "1 500 FCFA")
        page = self.client.get(reverse("lots_detail", args=[5001]))
        self.assertContains(page, "19/10/2026")

    def test_filtre_des_lots(self):
        self.connecter(ADMIN)
        page = self.client.get(reverse("lots"), {"ligne": 201})
        self.assertContains(page, "5002")
        self.assertNotContains(page, 'lots/5001"')

    def test_formulaire_dans_la_fenetre_modale(self):
        self.connecter(RESP)
        fragment = self.client.get(reverse("ateliers_creer"), **MODALE)
        self.assertContains(fragment, "fenetre-contenu")
        self.assertNotContains(fragment, "<html")
        invalide = self.client.post(reverse("ateliers_creer"), {"num_atelier": "", "libelle": ""}, **MODALE)
        self.assertEqual(invalide.status_code, 422)
        self.assertContains(invalide, "Ce champ est obligatoire.", status_code=422)
        valide = self.client.post(
            reverse("ateliers_creer"), {"num_atelier": 40, "libelle": "Atelier séchage", "responsable": "OP007"}, **MODALE
        )
        self.assertEqual(valide.json()["redirection"], reverse("ateliers_detail", args=[40]))


class Production(TestUsine):
    def test_parcours_responsable_atelier(self):
        """Parcours 1 : ligne 103 dans l'atelier 10, puis un lot d'attiéké avec deux opérateurs."""
        self.connecter(RESP)
        self.client.post(reverse("lignes_creer"), {"num_ligne": 103, "atelier": 10, "nb_operateurs_necessaires": 3})
        self.assertTrue(m.LigneProduction.objects.filter(pk=103, atelier_id=10).exists())
        self.client.post(
            reverse("lots_creer"),
            {"num_lot": 5006, "date_production": "2026-11-01", "ligne": 103, "produit": "PRD-ATT1K", "operateurs": ["OP001", "OP007"]},
        )
        self.assertEqual(m.Participer.objects.filter(lot_id=5006).count(), 2)

    def test_lot_sans_operateur_refuse(self):
        self.connecter(RESP)
        reponse = self.client.post(
            reverse("lots_creer"), {"num_lot": 5007, "date_production": "2026-11-01", "ligne": 101, "produit": "PRD-ATT1K"}
        )
        self.assertContains(reponse, "Sélectionnez au moins un opérateur.", status_code=422)
        self.assertFalse(m.LotProduction.objects.filter(pk=5007).exists())

    def test_atelier_doublon_et_responsable_deja_pris(self):
        self.connecter(RESP)
        reponse = self.client.post(reverse("ateliers_creer"), {"num_atelier": 10, "libelle": "X", "responsable": "OP008"})
        self.assertContains(reponse, "Un atelier porte déjà le numéro 10.", status_code=422)
        self.assertContains(reponse, "Sélectionnez une valeur de la liste.", status_code=422)

    def test_suppression_atelier_avec_lignes_refusee(self):
        self.connecter(RESP)
        self.client.post(reverse("ateliers_supprimer", args=[10]))
        self.assertTrue(m.Atelier.objects.filter(pk=10).exists())

    def test_ligne_avec_zero_operateur_refusee(self):
        self.connecter(RESP)
        reponse = self.client.post(reverse("lignes_creer"), {"num_ligne": 104, "atelier": 10, "nb_operateurs_necessaires": 0})
        self.assertContains(reponse, "supérieur à 0", status_code=422)

    def test_produit_prix_negatif_refuse(self):
        self.connecter(RESP)
        reponse = self.client.post(
            reverse("produits_creer"), {"reference": "PRD-X", "designation": "X", "prix_vente_unitaire": -5, "quantite_stock": 1}
        )
        self.assertContains(reponse, "Le prix ne peut pas être négatif.", status_code=422)


class Personnel(TestUsine):
    def test_parcours_collaborateur(self):
        """Parcours 2 : un opérateur dans l'équipe du matin, puis un incident de 40 minutes sur le lot 5002."""
        self.connecter(COLLAB)
        self.client.post(
            reverse("operateurs_creer"),
            {"matricule": "OP009", "nom": "Yao", "prenom": "Adjoua", "date_entree": "2026-11-01", "equipe": 1},
        )
        self.assertEqual(m.Operateur.objects.get(pk="OP009").nom, "YAO")
        avant = self.client.get(reverse("ateliers_detail", args=[20])).context["temps_arret"]
        self.client.post(reverse("incidents_creer"), {"lot": 5002, "type_incident": "COU", "temps_arret": 40})
        apres = self.client.get(reverse("ateliers_detail", args=[20])).context["temps_arret"]
        self.assertEqual(apres - avant, 40)

    def test_suppression_equipe_non_vide_refusee(self):
        self.connecter(COLLAB)
        self.client.post(reverse("equipes_supprimer", args=[1]))
        self.assertTrue(m.Equipe.objects.filter(pk=1).exists())

    def test_operateur_responsable_non_supprimable(self):
        self.connecter(COLLAB)
        self.client.post(reverse("operateurs_supprimer", args=["OP002"]))
        self.assertTrue(m.Operateur.objects.filter(pk="OP002").exists())

    def test_operateur_declare_un_incident(self):
        self.connecter(OPER)
        self.client.post(reverse("incidents_creer"), {"lot": 5003, "type_incident": "PAN", "temps_arret": 15})
        self.assertTrue(m.Incident.objects.filter(lot_id=5003, temps_arret=15).exists())

    def test_temps_arret_nul_refuse(self):
        self.connecter(COLLAB)
        reponse = self.client.post(reverse("incidents_creer"), {"lot": 5003, "type_incident": "PAN", "temps_arret": 0})
        self.assertContains(reponse, "Le temps d&#x27;arrêt doit être supérieur à 0.", status_code=422)


class Maintenance(TestUsine):
    def test_parcours_operateur(self):
        """Parcours 3 : maintenance de 60 minutes sur la capsuleuse, 2 joints consommés, puis 500 refusés, puis achat."""
        self.connecter(OPER)
        self.client.post(
            reverse("maintenances_creer"),
            {"machine": 4, "date_heure_debut": "2026-10-30T09:00", "duree": 60, "operateurs": ["OP005"]},
        )
        maintenance = m.Maintenance.objects.filter(machine_id=4, duree=60, date_heure_debut__date="2026-10-30").get()
        stock = m.Piece.objects.get(pk="PCE-JOIN").quantite_stock
        url = reverse("maintenances_ajouter_piece", args=[maintenance.pk])
        self.client.post(url, {"piece": "PCE-JOIN", "quantite": 2})
        self.assertEqual(m.Piece.objects.get(pk="PCE-JOIN").quantite_stock, stock - 2)

        refus = self.client.post(url, {"piece": "PCE-JOIN", "quantite": 500})
        self.assertContains(refus, "Stock insuffisant pour cette pièce.", status_code=422)
        self.assertEqual(m.Piece.objects.get(pk="PCE-JOIN").quantite_stock, stock - 2)

        stock_roul = m.Piece.objects.get(pk="PCE-ROUL").quantite_stock
        self.client.post(
            reverse("pieces_achat_creer"),
            {"piece": "PCE-ROUL", "fournisseur": "F001", "date_achat": "2026-11-01", "prix_achat": 3300, "quantite": 20},
        )
        self.assertEqual(m.Piece.objects.get(pk="PCE-ROUL").quantite_stock, stock_roul + 20)

    def test_maintenance_sans_operateur_refusee(self):
        self.connecter(COLLAB)
        reponse = self.client.post(
            reverse("maintenances_creer"), {"machine": 1, "date_heure_debut": "2026-10-30T09:00", "duree": 30}
        )
        self.assertContains(reponse, "Sélectionnez au moins un opérateur.", status_code=422)

    def test_retirer_une_piece_la_remet_en_stock(self):
        self.connecter(COLLAB)
        stock = m.Piece.objects.get(pk="PCE-COUR").quantite_stock
        self.client.post(reverse("maintenances_retirer_piece", args=[1, "PCE-COUR"]))
        self.assertEqual(m.Piece.objects.get(pk="PCE-COUR").quantite_stock, stock + 1)
        self.assertFalse(m.Consommer.objects.filter(maintenance_id=1, piece_id="PCE-COUR").exists())

    def test_nomenclature_sans_boucle(self):
        self.connecter(COLLAB)
        url = reverse("pieces_composant_ajouter", args=["PCE-ROUL"])
        reponse = self.client.post(url, {"composant": "PCE-MOTR", "quantite": 1})
        self.assertContains(reponse, "circulaire", status_code=422)
        reponse = self.client.post(url, {"composant": "PCE-ROUL", "quantite": 1})
        self.assertEqual(reponse.status_code, 422)

    def test_achat_en_double_refuse(self):
        self.connecter(COLLAB)
        reponse = self.client.post(
            reverse("pieces_achat_creer"),
            {"piece": "PCE-COUR", "fournisseur": "F001", "date_achat": "2026-09-10", "prix_achat": 1, "quantite": 1},
        )
        self.assertContains(reponse, "déjà enregistré à cette date", status_code=422)


class Comptes(TestUsine):
    def test_parcours_administrateur(self):
        """Parcours 4 : compte pour une opératrice, désactivation, fournisseur, refus de se désactiver."""
        self.connecter(ADMIN)
        self.client.post(
            reverse("utilisateurs_creer"),
            {"login": "agbagbo", "role": "OPERATEUR", "operateur": "OP007", "mot_de_passe": "Nouvelle@2026"},
        )
        compte = m.Utilisateur.objects.get(pk="agbagbo")
        self.assertTrue(verifier_mot_de_passe("Nouvelle@2026", compte.mot_de_passe))
        self.client.post(reverse("utilisateurs_activation", args=["agbagbo"]))
        self.assertFalse(m.Utilisateur.objects.get(pk="agbagbo").actif)

        self.client.post(reverse("fournisseurs_creer"), {"code_fournisseur": "F004", "raison_sociale": "Abidjan Roulements"})
        self.assertTrue(m.Fournisseur.objects.filter(pk="F004").exists())

        self.client.post(reverse("utilisateurs_activation", args=["admin"]))
        self.assertTrue(m.Utilisateur.objects.get(pk="admin").actif)

    def test_admin_ne_retire_pas_son_propre_role(self):
        self.connecter(ADMIN)
        reponse = self.client.post(reverse("utilisateurs_modifier", args=["admin"]), {"role": "OPERATEUR", "operateur": "OP007"})
        self.assertContains(reponse, "Vous ne pouvez pas retirer votre propre rôle", status_code=422)

    def test_compte_non_admin_doit_etre_lie(self):
        self.connecter(ADMIN)
        reponse = self.client.post(
            reverse("utilisateurs_creer"), {"login": "nouveau", "role": "OPERATEUR", "mot_de_passe": "Motdepasse1"}
        )
        self.assertContains(reponse, "doit être lié à une fiche opérateur", status_code=422)

    def test_changer_son_mot_de_passe(self):
        self.connecter(OPER)
        reponse = self.client.post(
            reverse("profil"), {"ancien": "faux", "nouveau": "Nouveau@2026", "confirmation": "Nouveau@2026"}
        )
        self.assertContains(reponse, "Le mot de passe actuel est incorrect.", status_code=422)
        self.client.post(
            reverse("profil"), {"ancien": "Operateur@2026", "nouveau": "Nouveau@2026", "confirmation": "Nouveau@2026"}
        )
        self.assertTrue(verifier_mot_de_passe("Nouveau@2026", m.Utilisateur.objects.get(pk=OPER).mot_de_passe))


class LogiqueDeLEnonce(TestUsine):
    """Règles tirées de l'énoncé : responsables uniques, interventions notées par leurs opérateurs."""

    def test_operateur_note_seulement_ses_interventions(self):
        self.connecter(OPER)
        reponse = self.client.post(
            reverse("maintenances_creer"),
            {"machine": 2, "date_heure_debut": "2026-10-30T10:00", "duree": 30, "operateurs": ["OP006"]},
        )
        self.assertContains(reponse, "vous ne pouvez noter que vos propres interventions", status_code=422)
        reponse = self.client.post(
            reverse("maintenances_modifier", args=[1]),
            {"machine": 1, "date_heure_debut": "2026-10-19T14:00", "duree": 60, "operateurs": ["OP006"]},
        )
        self.assertContains(reponse, "vous ne pouvez noter que vos propres interventions", status_code=422)

    def test_collaborateur_enregistre_pour_d_autres(self):
        self.connecter(COLLAB)
        self.client.post(
            reverse("maintenances_creer"),
            {"machine": 2, "date_heure_debut": "2026-10-30T10:00", "duree": 30, "operateurs": ["OP006"]},
        )
        self.assertTrue(m.Maintenance.objects.filter(machine_id=2, duree=30).exists())

    def test_dates_futures_refusees(self):
        self.connecter(ADMIN)
        reponse = self.client.post(
            reverse("lots_creer"),
            {"num_lot": 5008, "date_production": "2099-01-01", "ligne": 101, "produit": "PRD-ATT1K", "operateurs": ["OP001"]},
        )
        self.assertContains(reponse, "ne peut pas être dans le futur", status_code=422)
        reponse = self.client.post(
            reverse("pieces_achat_creer"),
            {"piece": "PCE-ROUL", "fournisseur": "F001", "date_achat": "2099-01-01", "prix_achat": 1, "quantite": 1},
        )
        self.assertContains(reponse, "ne peut pas être dans le futur", status_code=422)
        reponse = self.client.post(
            reverse("maintenances_creer"),
            {"machine": 1, "date_heure_debut": "2099-01-01T08:00", "duree": 10, "operateurs": ["OP005"]},
        )
        self.assertContains(reponse, "ne peut pas commencer dans le futur", status_code=422)

    def test_role_responsable_atelier_exige_un_atelier(self):
        self.connecter(ADMIN)
        reponse = self.client.post(
            reverse("utilisateurs_creer"),
            {"login": "kyao", "role": "RESPONSABLE_ATELIER", "operateur": "OP007", "mot_de_passe": "Motdepasse1"},
        )
        self.assertContains(reponse, "responsable d&#x27;aucun atelier", status_code=422)
        # OP001 dirige l'atelier embouteillage : le rôle lui convient.
        self.client.post(
            reverse("utilisateurs_creer"),
            {"login": "ykouassi", "role": "RESPONSABLE_ATELIER", "operateur": "OP001", "mot_de_passe": "Motdepasse1"},
        )
        self.assertTrue(m.Utilisateur.objects.filter(pk="ykouassi").exists())

    def test_role_collaborateur_exige_une_equipe(self):
        self.connecter(ADMIN)
        reponse = self.client.post(
            reverse("utilisateurs_creer"),
            {"login": "kyao", "role": "COLLABORATEUR_RESPONSABLE", "operateur": "OP007", "mot_de_passe": "Motdepasse1"},
        )
        self.assertContains(reponse, "ne dirige aucune équipe", status_code=422)

    def test_retirer_la_responsabilite_d_un_compte_responsable_refuse(self):
        # itoure (OP008) a le rôle Responsable atelier pour l'atelier 10.
        self.connecter(RESP)
        reponse = self.client.post(
            reverse("ateliers_modifier", args=[10]), {"libelle": "Atelier transformation", "responsable": "OP007"}
        )
        self.assertContains(reponse, "doit d&#x27;abord changer le rôle de ce compte", status_code=422)
        self.assertEqual(m.Atelier.objects.get(pk=10).responsable_id, "OP008")
        # mbamba (OP002) a le rôle Collaborateur responsable pour l'équipe 1.
        self.connecter(COLLAB)
        reponse = self.client.post(
            reverse("equipes_modifier", args=[1]), {"libelle": "Équipe du matin", "responsable": "OP001"}
        )
        self.assertContains(reponse, "doit d&#x27;abord changer le rôle de ce compte", status_code=422)

    def test_changer_responsable_sans_compte_autorise(self):
        # L'équipe 2 est dirigée par OP004, qui n'a pas de compte : le changement est libre.
        self.connecter(COLLAB)
        self.client.post(reverse("equipes_modifier", args=[2]), {"libelle": "Équipe de l'après-midi", "responsable": "OP003"})
        self.assertEqual(m.Equipe.objects.get(pk=2).responsable_id, "OP003")
