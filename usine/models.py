"""Modèles Django des 18 tables du script database/gestion_usine.sql.

Les noms de tables et de colonnes sont strictement ceux du script (db_table, db_column).
managed = False : Django ne crée, ne modifie et ne supprime jamais ces tables ;
le schéma est uniquement défini par le script SQL.
Les suppressions en cascade (participer, effectuer, consommer) sont faites par PostgreSQL.
"""
from django.db import models

ADMIN = "ADMINISTRATEUR"
RESP_ATELIER = "RESPONSABLE_ATELIER"
COLLAB_RESP = "COLLABORATEUR_RESPONSABLE"
OPERATEUR = "OPERATEUR"

ROLES = [
    (ADMIN, "Administrateur"),
    (RESP_ATELIER, "Responsable atelier"),
    (COLLAB_RESP, "Collaborateur responsable"),
    (OPERATEUR, "Opérateur"),
]


class Equipe(models.Model):
    num_equipe = models.IntegerField(primary_key=True)
    libelle = models.CharField(max_length=100)
    responsable = models.OneToOneField(
        "Operateur",
        models.DO_NOTHING,
        db_column="matricule_responsable",
        null=True,
        blank=True,
        related_name="equipe_dirigee",
    )

    class Meta:
        managed = False
        db_table = "equipe"
        ordering = ["num_equipe"]

    def __str__(self):
        return f"{self.num_equipe} - {self.libelle}"


class Operateur(models.Model):
    matricule = models.CharField(primary_key=True, max_length=10)
    nom = models.CharField(max_length=60)
    prenom = models.CharField(max_length=80)
    date_entree = models.DateField()
    equipe = models.ForeignKey(Equipe, models.DO_NOTHING, db_column="num_equipe", related_name="operateurs")

    class Meta:
        managed = False
        db_table = "operateur"
        ordering = ["nom", "prenom"]

    def __str__(self):
        return f"{self.nom} {self.prenom}"

    @property
    def nom_complet(self):
        return f"{self.nom} {self.prenom}"


class Atelier(models.Model):
    num_atelier = models.IntegerField(primary_key=True)
    libelle = models.CharField(max_length=100)
    responsable = models.OneToOneField(
        Operateur, models.DO_NOTHING, db_column="matricule_responsable", related_name="atelier_dirige"
    )

    class Meta:
        managed = False
        db_table = "atelier"
        ordering = ["num_atelier"]

    def __str__(self):
        return f"{self.num_atelier} - {self.libelle}"


class LigneProduction(models.Model):
    num_ligne = models.IntegerField(primary_key=True)
    nb_operateurs_necessaires = models.IntegerField()
    atelier = models.ForeignKey(Atelier, models.DO_NOTHING, db_column="num_atelier", related_name="lignes")

    class Meta:
        managed = False
        db_table = "ligne_production"
        ordering = ["num_ligne"]

    def __str__(self):
        return f"Ligne {self.num_ligne}"


class Machine(models.Model):
    num_machine = models.IntegerField(primary_key=True)
    designation = models.CharField(max_length=100)
    ligne = models.ForeignKey(LigneProduction, models.DO_NOTHING, db_column="num_ligne", related_name="machines")

    class Meta:
        managed = False
        db_table = "machine"
        ordering = ["num_machine"]

    def __str__(self):
        return f"{self.num_machine} - {self.designation}"


class Produit(models.Model):
    reference = models.CharField(primary_key=True, max_length=20)
    designation = models.CharField(max_length=100)
    prix_vente_unitaire = models.DecimalField(max_digits=12, decimal_places=2)
    quantite_stock = models.IntegerField(default=0)

    class Meta:
        managed = False
        db_table = "produit"
        ordering = ["reference"]

    def __str__(self):
        return f"{self.reference} - {self.designation}"


class LotProduction(models.Model):
    num_lot = models.IntegerField(primary_key=True)
    date_production = models.DateField()
    ligne = models.ForeignKey(LigneProduction, models.DO_NOTHING, db_column="num_ligne", related_name="lots")
    produit = models.ForeignKey(Produit, models.DO_NOTHING, db_column="reference_produit", related_name="lots")

    class Meta:
        managed = False
        db_table = "lot_production"
        ordering = ["-date_production", "-num_lot"]

    def __str__(self):
        return f"Lot {self.num_lot}"


class Participer(models.Model):
    """Association « a oeuvré sur » : opérateurs d'un lot."""

    pk = models.CompositePrimaryKey("lot", "operateur")
    lot = models.ForeignKey(LotProduction, models.DO_NOTHING, db_column="num_lot", related_name="participations")
    operateur = models.ForeignKey(Operateur, models.DO_NOTHING, db_column="matricule", related_name="participations")

    class Meta:
        managed = False
        db_table = "participer"


class TypeIncident(models.Model):
    code_type = models.CharField(primary_key=True, max_length=10)
    libelle = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = "type_incident"
        ordering = ["code_type"]

    def __str__(self):
        return f"{self.code_type} - {self.libelle}"


class Incident(models.Model):
    num_incident = models.AutoField(primary_key=True)
    temps_arret = models.IntegerField()
    lot = models.ForeignKey(LotProduction, models.DO_NOTHING, db_column="num_lot", related_name="incidents")
    type_incident = models.ForeignKey(TypeIncident, models.DO_NOTHING, db_column="code_type", related_name="incidents")

    class Meta:
        managed = False
        db_table = "incident"
        ordering = ["-num_incident"]

    def __str__(self):
        return f"Incident {self.num_incident}"


class Maintenance(models.Model):
    num_maintenance = models.AutoField(primary_key=True)
    date_heure_debut = models.DateTimeField()
    duree = models.IntegerField()
    machine = models.ForeignKey(Machine, models.DO_NOTHING, db_column="num_machine", related_name="maintenances")

    class Meta:
        managed = False
        db_table = "maintenance"
        ordering = ["-date_heure_debut", "-num_maintenance"]

    def __str__(self):
        return f"Maintenance {self.num_maintenance}"


class Effectuer(models.Model):
    """Association « effectue » : opérateurs d'une maintenance."""

    pk = models.CompositePrimaryKey("maintenance", "operateur")
    maintenance = models.ForeignKey(
        Maintenance, models.DO_NOTHING, db_column="num_maintenance", related_name="interventions"
    )
    operateur = models.ForeignKey(Operateur, models.DO_NOTHING, db_column="matricule", related_name="interventions")

    class Meta:
        managed = False
        db_table = "effectuer"


class Piece(models.Model):
    reference = models.CharField(primary_key=True, max_length=20)
    libelle = models.CharField(max_length=100)
    prix_unitaire_ht = models.DecimalField(max_digits=12, decimal_places=2)
    quantite_stock = models.IntegerField(default=0)

    class Meta:
        managed = False
        db_table = "piece"
        ordering = ["reference"]

    def __str__(self):
        return f"{self.reference} - {self.libelle}"


class Consommer(models.Model):
    """Pièces consommées par une maintenance."""

    pk = models.CompositePrimaryKey("maintenance", "piece")
    maintenance = models.ForeignKey(
        Maintenance, models.DO_NOTHING, db_column="num_maintenance", related_name="consommations"
    )
    piece = models.ForeignKey(Piece, models.DO_NOTHING, db_column="reference_piece", related_name="consommations")
    quantite = models.IntegerField()

    class Meta:
        managed = False
        db_table = "consommer"


class Nomenclature(models.Model):
    """Une pièce composée contient « quantite » exemplaires d'une pièce composant."""

    pk = models.CompositePrimaryKey("composee", "composant")
    composee = models.ForeignKey(Piece, models.DO_NOTHING, db_column="reference_composee", related_name="composants")
    composant = models.ForeignKey(
        Piece, models.DO_NOTHING, db_column="reference_composant", related_name="entre_dans"
    )
    quantite = models.IntegerField()

    class Meta:
        managed = False
        db_table = "nomenclature"


class Fournisseur(models.Model):
    code_fournisseur = models.CharField(primary_key=True, max_length=10)
    raison_sociale = models.CharField(max_length=120)
    adresse = models.CharField(max_length=200, blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "fournisseur"
        ordering = ["code_fournisseur"]

    def __str__(self):
        return f"{self.code_fournisseur} - {self.raison_sociale}"


class Achat(models.Model):
    pk = models.CompositePrimaryKey("piece", "fournisseur", "date_achat")
    piece = models.ForeignKey(Piece, models.DO_NOTHING, db_column="reference_piece", related_name="achats")
    fournisseur = models.ForeignKey(
        Fournisseur, models.DO_NOTHING, db_column="code_fournisseur", related_name="achats"
    )
    date_achat = models.DateField()
    prix_achat = models.DecimalField(max_digits=12, decimal_places=2)
    quantite = models.IntegerField(default=1)

    class Meta:
        managed = False
        db_table = "achat"
        ordering = ["-date_achat"]


class Utilisateur(models.Model):
    login = models.CharField(primary_key=True, max_length=40)
    mot_de_passe = models.CharField(max_length=255)
    role = models.CharField(max_length=30, choices=ROLES)
    operateur = models.ForeignKey(
        Operateur, models.DO_NOTHING, db_column="matricule", null=True, blank=True, related_name="comptes"
    )
    actif = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "utilisateur"
        ordering = ["login"]

    def __str__(self):
        return self.login

    @property
    def nom_affiche(self):
        if self.operateur_id and self.operateur:
            return self.operateur.nom_complet
        return "Administrateur système" if self.role == ADMIN else self.login
