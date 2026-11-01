"""Formulaires de l'application : validation et messages d'erreur en français.

Chaque erreur s'affiche sous le champ concerné ; les erreurs générales (non_field_errors)
s'affichent en haut du formulaire.
"""
from django import forms

from usine import models as m

REQUIS = {"required": "Ce champ est obligatoire."}
ENTIER = {**REQUIS, "invalid": "Saisissez un nombre entier."}
DECIMAL = {**REQUIS, "invalid": "Saisissez un montant valide."}
DATE = {**REQUIS, "invalid": "Saisissez une date valide."}
CHOIX = {**REQUIS, "invalid_choice": "Sélectionnez une valeur de la liste."}


class FormulaireBase(forms.Form):
    """Ajoute les classes CSS de l'application aux champs."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for champ in self.fields.values():
            widget = champ.widget
            if isinstance(widget, forms.CheckboxSelectMultiple):
                continue
            if isinstance(widget, forms.CheckboxInput):
                widget.attrs.setdefault("class", "case")
            elif isinstance(widget, forms.Select):
                widget.attrs.setdefault("class", "select")
            elif isinstance(widget, forms.Textarea):
                widget.attrs.setdefault("class", "textarea")
            else:
                widget.attrs.setdefault("class", "input")

    def full_clean(self):
        """Après validation, les champs en erreur reçoivent la classe CSS « invalid »."""
        super().full_clean()
        for nom in self.errors:
            if nom in self.fields:
                widget = self.fields[nom].widget
                classes = widget.attrs.get("class", "")
                if "invalid" not in classes.split():
                    widget.attrs["class"] = f"{classes} invalid".strip()
                widget.attrs["aria-invalid"] = "true"


def champ_entier(libelle, minimum=None, **kwargs):
    """Entier ; avec minimum, Django ajoute le validateur et l'attribut HTML min."""
    messages = {**ENTIER, "min_value": f"La valeur doit être supérieure ou égale à {minimum}."}
    return forms.IntegerField(label=libelle, min_value=minimum, error_messages=messages, **kwargs)


def champ_date(libelle, **kwargs):
    return forms.DateField(
        label=libelle, error_messages=DATE, widget=forms.DateInput(attrs={"type": "date"}, format="%Y-%m-%d"), **kwargs
    )


def choix_objet(libelle, queryset, requis=True, vide="Choisir..."):
    return forms.ModelChoiceField(
        label=libelle,
        queryset=queryset,
        required=requis,
        empty_label=vide,
        error_messages={**REQUIS, "invalid_choice": "Sélectionnez une valeur de la liste."},
    )


class Etiquette(forms.ModelChoiceField):
    """Liste d'opérateurs affichée « NOM Prénom (matricule) »."""

    def label_from_instance(self, obj):
        return f"{obj.nom} {obj.prenom} ({obj.matricule})"


class EtiquettesMultiples(forms.ModelMultipleChoiceField):
    def label_from_instance(self, obj):
        return f"{obj.nom} {obj.prenom} ({obj.matricule})"


def verifier_non_negatif(valeur, message):
    if valeur is not None and valeur < 0:
        raise forms.ValidationError(message)
    return valeur


# ---------------------------------------------------------------------------
# Connexion et profil
# ---------------------------------------------------------------------------
class ConnexionForm(FormulaireBase):
    login = forms.CharField(label="Identifiant", max_length=40, error_messages=REQUIS)
    mot_de_passe = forms.CharField(label="Mot de passe", widget=forms.PasswordInput, error_messages=REQUIS)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["login"].widget.attrs.update({"autocomplete": "username", "autofocus": True})
        self.fields["mot_de_passe"].widget.attrs.update({"autocomplete": "current-password"})


class NouveauMotDePasseMixin(forms.Form):
    nouveau = forms.CharField(
        label="Nouveau mot de passe",
        widget=forms.PasswordInput(attrs={"autocomplete": "new-password"}),
        min_length=8,
        error_messages={**REQUIS, "min_length": "Le mot de passe doit contenir au moins 8 caractères."},
    )
    confirmation = forms.CharField(
        label="Confirmation",
        widget=forms.PasswordInput(attrs={"autocomplete": "new-password"}),
        error_messages=REQUIS,
    )

    def clean(self):
        donnees = super().clean()
        nouveau, confirmation = donnees.get("nouveau"), donnees.get("confirmation")
        if nouveau and confirmation and nouveau != confirmation:
            self.add_error("confirmation", "La confirmation ne correspond pas au nouveau mot de passe.")
        return donnees


class ChangerMotDePasseForm(NouveauMotDePasseMixin, FormulaireBase):
    ancien = forms.CharField(
        label="Mot de passe actuel",
        widget=forms.PasswordInput(attrs={"autocomplete": "current-password"}),
        error_messages=REQUIS,
    )
    field_order = ["ancien", "nouveau", "confirmation"]

    def __init__(self, *args, utilisateur, **kwargs):
        self.utilisateur = utilisateur
        super().__init__(*args, **kwargs)

    def clean_ancien(self):
        from usine.auth import verifier_mot_de_passe

        ancien = self.cleaned_data["ancien"]
        if not verifier_mot_de_passe(ancien, self.utilisateur.mot_de_passe):
            raise forms.ValidationError("Le mot de passe actuel est incorrect.")
        return ancien


class ReinitialiserMotDePasseForm(NouveauMotDePasseMixin, FormulaireBase):
    pass


# ---------------------------------------------------------------------------
# Production : ateliers, lignes, produits, lots
# ---------------------------------------------------------------------------
class AtelierForm(FormulaireBase):
    num_atelier = champ_entier("Numéro d'atelier", minimum=1)
    libelle = forms.CharField(label="Libellé", max_length=100, error_messages=REQUIS)
    responsable = Etiquette(
        label="Responsable",
        queryset=m.Operateur.objects.none(),
        empty_label="Choisir un opérateur...",
        error_messages=CHOIX,
        help_text="Un opérateur ne peut être responsable que d'un seul atelier.",
    )

    def __init__(self, *args, instance=None, **kwargs):
        self.instance = instance
        super().__init__(*args, **kwargs)
        deja = m.Atelier.objects.all()
        if instance is not None:
            deja = deja.exclude(pk=instance.pk)
            self.fields["num_atelier"].disabled = True
        self.fields["responsable"].queryset = m.Operateur.objects.exclude(
            matricule__in=deja.values("responsable_id")
        )

    def clean_num_atelier(self):
        num = self.cleaned_data["num_atelier"]
        if self.instance is None and m.Atelier.objects.filter(pk=num).exists():
            raise forms.ValidationError(f"Un atelier porte déjà le numéro {num}.")
        return num

    def enregistrer(self):
        d = self.cleaned_data
        atelier = self.instance or m.Atelier(num_atelier=d["num_atelier"])
        atelier.libelle = d["libelle"]
        atelier.responsable = d["responsable"]
        atelier.save(force_insert=self.instance is None)
        return atelier


class LigneForm(FormulaireBase):
    num_ligne = champ_entier("Numéro de ligne", minimum=1)
    atelier = choix_objet("Atelier", m.Atelier.objects.all())
    nb_operateurs_necessaires = champ_entier("Opérateurs nécessaires", minimum=1)

    def __init__(self, *args, instance=None, **kwargs):
        self.instance = instance
        super().__init__(*args, **kwargs)
        if instance is not None:
            self.fields["num_ligne"].disabled = True
        self.fields["nb_operateurs_necessaires"].error_messages["min_value"] = (
            "Le nombre d'opérateurs nécessaires doit être supérieur à 0."
        )

    def clean_num_ligne(self):
        num = self.cleaned_data["num_ligne"]
        if self.instance is None and m.LigneProduction.objects.filter(pk=num).exists():
            raise forms.ValidationError(f"Une ligne porte déjà le numéro {num}.")
        return num

    def enregistrer(self):
        d = self.cleaned_data
        ligne = self.instance or m.LigneProduction(num_ligne=d["num_ligne"])
        ligne.atelier = d["atelier"]
        ligne.nb_operateurs_necessaires = d["nb_operateurs_necessaires"]
        ligne.save(force_insert=self.instance is None)
        return ligne


class ProduitForm(FormulaireBase):
    reference = forms.CharField(label="Référence", max_length=20, error_messages=REQUIS)
    designation = forms.CharField(label="Désignation", max_length=100, error_messages=REQUIS)
    prix_vente_unitaire = forms.DecimalField(
        label="Prix de vente unitaire (FCFA)", max_digits=12, decimal_places=2, error_messages=DECIMAL
    )
    quantite_stock = champ_entier("Quantité en stock")

    def __init__(self, *args, instance=None, **kwargs):
        self.instance = instance
        super().__init__(*args, **kwargs)
        if instance is not None:
            self.fields["reference"].disabled = True
        self.fields["prix_vente_unitaire"].widget.attrs.update({"min": 0, "step": "0.01"})
        self.fields["quantite_stock"].widget.attrs["min"] = 0

    def clean_reference(self):
        ref = self.cleaned_data["reference"].strip().upper()
        if self.instance is None and m.Produit.objects.filter(pk=ref).exists():
            raise forms.ValidationError(f"Un produit porte déjà la référence {ref}.")
        return ref

    def clean_prix_vente_unitaire(self):
        return verifier_non_negatif(self.cleaned_data["prix_vente_unitaire"], "Le prix ne peut pas être négatif.")

    def clean_quantite_stock(self):
        return verifier_non_negatif(self.cleaned_data["quantite_stock"], "Le stock ne peut pas être négatif.")

    def enregistrer(self):
        d = self.cleaned_data
        produit = self.instance or m.Produit(reference=d["reference"])
        produit.designation = d["designation"]
        produit.prix_vente_unitaire = d["prix_vente_unitaire"]
        produit.quantite_stock = d["quantite_stock"]
        produit.save(force_insert=self.instance is None)
        return produit


class LotForm(FormulaireBase):
    num_lot = champ_entier("Numéro de lot", minimum=1)
    date_production = champ_date("Date de production")
    ligne = choix_objet("Ligne de production", m.LigneProduction.objects.select_related("atelier"))
    produit = choix_objet("Produit fabriqué", m.Produit.objects.all())
    operateurs = EtiquettesMultiples(
        label="Opérateurs ayant oeuvré sur le lot",
        queryset=m.Operateur.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        error_messages={"required": "Sélectionnez au moins un opérateur.", "invalid_choice": "Opérateur inconnu."},
    )

    def __init__(self, *args, instance=None, **kwargs):
        self.instance = instance
        if instance is not None:
            kwargs.setdefault("initial", {}).setdefault(
                "operateurs", [p.operateur_id for p in instance.participations.all()]
            )
        super().__init__(*args, **kwargs)
        self.fields["ligne"].label_from_instance = lambda l: f"Ligne {l.num_ligne} - {l.atelier.libelle}"
        if instance is not None:
            self.fields["num_lot"].disabled = True

    def clean_num_lot(self):
        num = self.cleaned_data["num_lot"]
        if self.instance is None and m.LotProduction.objects.filter(pk=num).exists():
            raise forms.ValidationError(f"Un lot porte déjà le numéro {num}.")
        return num

    def enregistrer(self):
        d = self.cleaned_data
        lot = self.instance or m.LotProduction(num_lot=d["num_lot"])
        lot.date_production = d["date_production"]
        lot.ligne = d["ligne"]
        lot.produit = d["produit"]
        lot.save(force_insert=self.instance is None)
        m.Participer.objects.filter(lot=lot).delete()
        m.Participer.objects.bulk_create([m.Participer(lot=lot, operateur=o) for o in d["operateurs"]])
        return lot


# ---------------------------------------------------------------------------
# Personnel : opérateurs, équipes
# ---------------------------------------------------------------------------
class OperateurForm(FormulaireBase):
    matricule = forms.CharField(label="Matricule", max_length=10, error_messages=REQUIS)
    nom = forms.CharField(label="Nom", max_length=60, error_messages=REQUIS)
    prenom = forms.CharField(label="Prénom", max_length=80, error_messages=REQUIS)
    date_entree = champ_date("Date d'entrée dans la société")
    equipe = choix_objet("Équipe", m.Equipe.objects.all())

    def __init__(self, *args, instance=None, **kwargs):
        self.instance = instance
        super().__init__(*args, **kwargs)
        if instance is not None:
            self.fields["matricule"].disabled = True

    def clean_matricule(self):
        matricule = self.cleaned_data["matricule"].strip().upper()
        if self.instance is None and m.Operateur.objects.filter(pk=matricule).exists():
            raise forms.ValidationError(f"Le matricule {matricule} est déjà attribué.")
        return matricule

    def clean_nom(self):
        return self.cleaned_data["nom"].strip().upper()

    def clean(self):
        donnees = super().clean()
        equipe = donnees.get("equipe")
        if self.instance is not None and equipe is not None:
            dirigee = m.Equipe.objects.filter(responsable=self.instance).exclude(pk=equipe.pk).first()
            if dirigee is not None:
                self.add_error(
                    "equipe",
                    f"Cet opérateur est responsable de l'équipe « {dirigee.libelle} » : "
                    "désignez d'abord un autre responsable pour cette équipe.",
                )
        return donnees

    def enregistrer(self):
        d = self.cleaned_data
        operateur = self.instance or m.Operateur(matricule=d["matricule"])
        operateur.nom = d["nom"]
        operateur.prenom = d["prenom"].strip()
        operateur.date_entree = d["date_entree"]
        operateur.equipe = d["equipe"]
        operateur.save(force_insert=self.instance is None)
        return operateur


class EquipeForm(FormulaireBase):
    num_equipe = champ_entier("Numéro d'équipe", minimum=1)
    libelle = forms.CharField(label="Libellé", max_length=100, error_messages=REQUIS)
    responsable = Etiquette(
        label="Collaborateur responsable",
        queryset=m.Operateur.objects.none(),
        required=False,
        empty_label="Aucun pour le moment",
        error_messages=CHOIX,
        help_text="Choisi parmi les membres de l'équipe ; il ne dirige aucune autre équipe.",
    )

    def __init__(self, *args, instance=None, **kwargs):
        self.instance = instance
        super().__init__(*args, **kwargs)
        if instance is not None:
            self.fields["num_equipe"].disabled = True
            deja = m.Equipe.objects.exclude(pk=instance.pk).exclude(responsable=None)
            self.fields["responsable"].queryset = m.Operateur.objects.filter(equipe=instance).exclude(
                matricule__in=deja.values("responsable_id")
            )
        else:
            # Une nouvelle équipe n'a pas encore de membres : le responsable sera désigné ensuite.
            self.fields["responsable"].widget = forms.HiddenInput()

    def clean_num_equipe(self):
        num = self.cleaned_data["num_equipe"]
        if self.instance is None and m.Equipe.objects.filter(pk=num).exists():
            raise forms.ValidationError(f"Une équipe porte déjà le numéro {num}.")
        return num

    def enregistrer(self):
        d = self.cleaned_data
        equipe = self.instance or m.Equipe(num_equipe=d["num_equipe"])
        equipe.libelle = d["libelle"]
        equipe.responsable = d.get("responsable") if self.instance is not None else None
        equipe.save(force_insert=self.instance is None)
        return equipe


# ---------------------------------------------------------------------------
# Incidents
# ---------------------------------------------------------------------------
class TypeIncidentForm(FormulaireBase):
    code_type = forms.CharField(label="Code", max_length=10, error_messages=REQUIS)
    libelle = forms.CharField(label="Libellé", max_length=100, error_messages=REQUIS)

    def __init__(self, *args, instance=None, **kwargs):
        self.instance = instance
        super().__init__(*args, **kwargs)
        if instance is not None:
            self.fields["code_type"].disabled = True

    def clean_code_type(self):
        code = self.cleaned_data["code_type"].strip().upper()
        if self.instance is None and m.TypeIncident.objects.filter(pk=code).exists():
            raise forms.ValidationError(f"Le code {code} est déjà utilisé.")
        return code

    def enregistrer(self):
        d = self.cleaned_data
        type_incident = self.instance or m.TypeIncident(code_type=d["code_type"])
        type_incident.libelle = d["libelle"]
        type_incident.save(force_insert=self.instance is None)
        return type_incident


class IncidentForm(FormulaireBase):
    lot = choix_objet("Lot concerné", m.LotProduction.objects.select_related("produit"))
    type_incident = choix_objet("Type d'incident", m.TypeIncident.objects.all())
    temps_arret = champ_entier("Temps d'arrêt (minutes)", minimum=1)

    def __init__(self, *args, instance=None, **kwargs):
        self.instance = instance
        if instance is not None:
            kwargs.setdefault("initial", {}).update(
                {"lot": instance.lot_id, "type_incident": instance.type_incident_id, "temps_arret": instance.temps_arret}
            )
        super().__init__(*args, **kwargs)
        self.fields["lot"].label_from_instance = (
            lambda l: f"Lot {l.num_lot} - {l.produit.designation} ({l.date_production:%d/%m/%Y})"
        )
        self.fields["temps_arret"].error_messages["min_value"] = "Le temps d'arrêt doit être supérieur à 0."

    def enregistrer(self):
        d = self.cleaned_data
        incident = self.instance or m.Incident()
        incident.lot = d["lot"]
        incident.type_incident = d["type_incident"]
        incident.temps_arret = d["temps_arret"]
        incident.save()
        return incident


# ---------------------------------------------------------------------------
# Machines et maintenances
# ---------------------------------------------------------------------------
class MachineForm(FormulaireBase):
    num_machine = champ_entier("Numéro de machine", minimum=1)
    designation = forms.CharField(label="Désignation", max_length=100, error_messages=REQUIS)
    ligne = choix_objet("Ligne de production", m.LigneProduction.objects.select_related("atelier"))

    def __init__(self, *args, instance=None, **kwargs):
        self.instance = instance
        super().__init__(*args, **kwargs)
        self.fields["ligne"].label_from_instance = lambda l: f"Ligne {l.num_ligne} - {l.atelier.libelle}"
        if instance is not None:
            self.fields["num_machine"].disabled = True

    def clean_num_machine(self):
        num = self.cleaned_data["num_machine"]
        if self.instance is None and m.Machine.objects.filter(pk=num).exists():
            raise forms.ValidationError(f"Une machine porte déjà le numéro {num}.")
        return num

    def enregistrer(self):
        d = self.cleaned_data
        machine = self.instance or m.Machine(num_machine=d["num_machine"])
        machine.designation = d["designation"]
        machine.ligne = d["ligne"]
        machine.save(force_insert=self.instance is None)
        return machine


class MaintenanceForm(FormulaireBase):
    machine = choix_objet("Machine", m.Machine.objects.all())
    date_heure_debut = forms.DateTimeField(
        label="Date et heure de début",
        input_formats=["%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S"],
        widget=forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M"),
        error_messages={**REQUIS, "invalid": "Saisissez une date et une heure valides."},
    )
    duree = champ_entier("Durée (minutes)", minimum=1)
    operateurs = EtiquettesMultiples(
        label="Opérateurs ayant effectué la maintenance",
        queryset=m.Operateur.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        error_messages={"required": "Sélectionnez au moins un opérateur.", "invalid_choice": "Opérateur inconnu."},
    )

    def __init__(self, *args, instance=None, **kwargs):
        self.instance = instance
        if instance is not None:
            kwargs.setdefault("initial", {}).update(
                {
                    "machine": instance.machine_id,
                    "date_heure_debut": instance.date_heure_debut,
                    "duree": instance.duree,
                    "operateurs": [e.operateur_id for e in instance.interventions.all()],
                }
            )
        super().__init__(*args, **kwargs)
        self.fields["duree"].error_messages["min_value"] = "La durée doit être supérieure à 0."

    def enregistrer(self):
        d = self.cleaned_data
        maintenance = self.instance or m.Maintenance()
        maintenance.machine = d["machine"]
        maintenance.date_heure_debut = d["date_heure_debut"]
        maintenance.duree = d["duree"]
        maintenance.save()
        m.Effectuer.objects.filter(maintenance=maintenance).delete()
        m.Effectuer.objects.bulk_create(
            [m.Effectuer(maintenance=maintenance, operateur=o) for o in d["operateurs"]]
        )
        return maintenance


class ConsommationForm(FormulaireBase):
    piece = choix_objet("Pièce", m.Piece.objects.all())
    quantite = champ_entier("Quantité consommée", minimum=1)

    def __init__(self, *args, maintenance, **kwargs):
        self.maintenance = maintenance
        super().__init__(*args, **kwargs)
        self.fields["piece"].label_from_instance = (
            lambda p: f"{p.reference} - {p.libelle} (stock : {p.quantite_stock})"
        )
        self.fields["quantite"].error_messages["min_value"] = "La quantité doit être supérieure à 0."


# ---------------------------------------------------------------------------
# Pièces, nomenclature, achats, fournisseurs
# ---------------------------------------------------------------------------
class PieceForm(FormulaireBase):
    reference = forms.CharField(label="Référence", max_length=20, error_messages=REQUIS)
    libelle = forms.CharField(label="Libellé", max_length=100, error_messages=REQUIS)
    prix_unitaire_ht = forms.DecimalField(
        label="Prix unitaire HT (FCFA)", max_digits=12, decimal_places=2, error_messages=DECIMAL
    )
    quantite_stock = champ_entier("Quantité en stock")

    def __init__(self, *args, instance=None, **kwargs):
        self.instance = instance
        super().__init__(*args, **kwargs)
        if instance is not None:
            self.fields["reference"].disabled = True
        self.fields["prix_unitaire_ht"].widget.attrs.update({"min": 0, "step": "0.01"})
        self.fields["quantite_stock"].widget.attrs["min"] = 0

    def clean_reference(self):
        ref = self.cleaned_data["reference"].strip().upper()
        if self.instance is None and m.Piece.objects.filter(pk=ref).exists():
            raise forms.ValidationError(f"Une pièce porte déjà la référence {ref}.")
        return ref

    def clean_prix_unitaire_ht(self):
        return verifier_non_negatif(self.cleaned_data["prix_unitaire_ht"], "Le prix ne peut pas être négatif.")

    def clean_quantite_stock(self):
        return verifier_non_negatif(self.cleaned_data["quantite_stock"], "Le stock ne peut pas être négatif.")

    def enregistrer(self):
        d = self.cleaned_data
        piece = self.instance or m.Piece(reference=d["reference"])
        piece.libelle = d["libelle"]
        piece.prix_unitaire_ht = d["prix_unitaire_ht"]
        piece.quantite_stock = d["quantite_stock"]
        piece.save(force_insert=self.instance is None)
        return piece


def composants_recursifs(reference: str) -> set[str]:
    """Toutes les pièces qui entrent, directement ou non, dans la composition de « reference »."""
    vus: set[str] = set()
    a_voir = [reference]
    while a_voir:
        courante = a_voir.pop()
        for composant in m.Nomenclature.objects.filter(composee_id=courante).values_list("composant_id", flat=True):
            if composant not in vus:
                vus.add(composant)
                a_voir.append(composant)
    return vus


class NomenclatureForm(FormulaireBase):
    composant = choix_objet("Pièce composant", m.Piece.objects.all())
    quantite = champ_entier("Quantité", minimum=1)

    def __init__(self, *args, piece, **kwargs):
        self.piece = piece
        super().__init__(*args, **kwargs)
        self.fields["composant"].queryset = m.Piece.objects.exclude(pk=piece.pk)
        self.fields["quantite"].error_messages["min_value"] = "La quantité doit être supérieure à 0."

    def clean_composant(self):
        composant = self.cleaned_data["composant"]
        if composant.pk == self.piece.pk:
            raise forms.ValidationError("Une pièce ne peut pas se composer d'elle-même.")
        if m.Nomenclature.objects.filter(composee=self.piece, composant=composant).exists():
            raise forms.ValidationError("Ce composant figure déjà dans la nomenclature de la pièce.")
        if self.piece.pk in composants_recursifs(composant.pk):
            raise forms.ValidationError(
                f"{composant.reference} contient déjà {self.piece.reference} : la nomenclature serait circulaire."
            )
        return composant


class AchatForm(FormulaireBase):
    piece = choix_objet("Pièce", m.Piece.objects.all())
    fournisseur = choix_objet("Fournisseur", m.Fournisseur.objects.all())
    date_achat = champ_date("Date d'achat")
    prix_achat = forms.DecimalField(
        label="Prix d'achat unitaire (FCFA)", max_digits=12, decimal_places=2, error_messages=DECIMAL
    )
    quantite = champ_entier("Quantité achetée", minimum=1)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["prix_achat"].widget.attrs.update({"min": 0, "step": "0.01"})
        self.fields["quantite"].error_messages["min_value"] = "La quantité doit être supérieure à 0."

    def clean_prix_achat(self):
        return verifier_non_negatif(self.cleaned_data["prix_achat"], "Le prix ne peut pas être négatif.")

    def clean(self):
        d = super().clean()
        if d.get("piece") and d.get("fournisseur") and d.get("date_achat"):
            if m.Achat.objects.filter(piece=d["piece"], fournisseur=d["fournisseur"], date_achat=d["date_achat"]).exists():
                raise forms.ValidationError(
                    "Un achat de cette pièce chez ce fournisseur est déjà enregistré à cette date."
                )
        return d


class FournisseurForm(FormulaireBase):
    code_fournisseur = forms.CharField(label="Code", max_length=10, error_messages=REQUIS)
    raison_sociale = forms.CharField(label="Raison sociale", max_length=120, error_messages=REQUIS)
    adresse = forms.CharField(label="Adresse", max_length=200, required=False)
    telephone = forms.RegexField(
        label="Téléphone",
        max_length=20,
        required=False,
        regex=r"^[0-9+ ().-]{6,20}$",
        error_messages={"invalid": "Saisissez un numéro de téléphone valide (chiffres, espaces, +)."},
    )

    def __init__(self, *args, instance=None, **kwargs):
        self.instance = instance
        super().__init__(*args, **kwargs)
        if instance is not None:
            self.fields["code_fournisseur"].disabled = True

    def clean_code_fournisseur(self):
        code = self.cleaned_data["code_fournisseur"].strip().upper()
        if self.instance is None and m.Fournisseur.objects.filter(pk=code).exists():
            raise forms.ValidationError(f"Le code {code} est déjà attribué à un fournisseur.")
        return code

    def enregistrer(self):
        d = self.cleaned_data
        fournisseur = self.instance or m.Fournisseur(code_fournisseur=d["code_fournisseur"])
        fournisseur.raison_sociale = d["raison_sociale"]
        fournisseur.adresse = d["adresse"] or None
        fournisseur.telephone = d["telephone"] or None
        fournisseur.save(force_insert=self.instance is None)
        return fournisseur


# ---------------------------------------------------------------------------
# Comptes utilisateurs
# ---------------------------------------------------------------------------
def admins_actifs_autres_que(login):
    return m.Utilisateur.objects.filter(role=m.ADMIN, actif=True).exclude(login=login).count()


class UtilisateurForm(FormulaireBase):
    login = forms.RegexField(
        label="Identifiant",
        max_length=40,
        regex=r"^[a-zA-Z0-9._-]{3,40}$",
        error_messages={**REQUIS, "invalid": "3 à 40 caractères : lettres, chiffres, point, tiret ou tiret bas."},
    )
    role = forms.ChoiceField(label="Rôle", choices=[("", "Choisir un rôle...")] + m.ROLES, error_messages=CHOIX)
    operateur = Etiquette(
        label="Fiche opérateur liée",
        queryset=m.Operateur.objects.all(),
        required=False,
        empty_label="Aucune (administrateur)",
        error_messages=CHOIX,
    )
    mot_de_passe = forms.CharField(
        label="Mot de passe initial",
        widget=forms.PasswordInput(attrs={"autocomplete": "new-password"}),
        min_length=8,
        error_messages={**REQUIS, "min_length": "Le mot de passe doit contenir au moins 8 caractères."},
    )

    def __init__(self, *args, instance=None, utilisateur_connecte=None, **kwargs):
        self.instance = instance
        self.utilisateur_connecte = utilisateur_connecte
        if instance is not None:
            kwargs.setdefault("initial", {}).update(
                {"login": instance.login, "role": instance.role, "operateur": instance.operateur_id}
            )
        super().__init__(*args, **kwargs)
        if instance is not None:
            self.fields["login"].disabled = True
            del self.fields["mot_de_passe"]

    def clean_login(self):
        login = self.cleaned_data["login"].strip().lower()
        if self.instance is None and m.Utilisateur.objects.filter(login__iexact=login).exists():
            raise forms.ValidationError(f"L'identifiant « {login} » est déjà utilisé.")
        return login

    def clean(self):
        d = super().clean()
        role, operateur = d.get("role"), d.get("operateur")
        if role and role != m.ADMIN and operateur is None:
            self.add_error("operateur", "Un compte non administrateur doit être lié à une fiche opérateur.")
        if operateur is not None:
            autre = m.Utilisateur.objects.filter(operateur=operateur)
            if self.instance is not None:
                autre = autre.exclude(pk=self.instance.pk)
            if autre.exists():
                self.add_error("operateur", f"L'opérateur {operateur.matricule} a déjà un compte ({autre.first().login}).")
        if (
            self.instance is not None
            and self.instance.role == m.ADMIN
            and role
            and role != m.ADMIN
        ):
            if self.utilisateur_connecte and self.instance.login == self.utilisateur_connecte.login:
                self.add_error("role", "Vous ne pouvez pas retirer votre propre rôle d'Administrateur.")
            elif self.instance.actif and admins_actifs_autres_que(self.instance.login) == 0:
                self.add_error("role", "Il doit toujours rester au moins un Administrateur actif.")
        return d

    def enregistrer(self):
        from usine.auth import hacher_mot_de_passe

        d = self.cleaned_data
        if self.instance is None:
            compte = m.Utilisateur(login=d["login"], mot_de_passe=hacher_mot_de_passe(d["mot_de_passe"]), actif=True)
        else:
            compte = self.instance
        compte.role = d["role"]
        compte.operateur = d["operateur"]
        compte.save(force_insert=self.instance is None)
        return compte


class FiltreLotsForm(FormulaireBase):
    """Filtres de la liste des lots (requête GET)."""

    du = forms.DateField(label="Du", required=False, widget=forms.DateInput(attrs={"type": "date"}))
    au = forms.DateField(label="Au", required=False, widget=forms.DateInput(attrs={"type": "date"}))
    ligne = forms.ModelChoiceField(
        label="Ligne", queryset=m.LigneProduction.objects.all(), required=False, empty_label="Toutes les lignes"
    )
    produit = forms.ModelChoiceField(
        label="Produit", queryset=m.Produit.objects.all(), required=False, empty_label="Tous les produits"
    )

    def filtrer(self, lots):
        if not self.is_valid():
            return lots
        d = self.cleaned_data
        if d.get("du"):
            lots = lots.filter(date_production__gte=d["du"])
        if d.get("au"):
            lots = lots.filter(date_production__lte=d["au"])
        if d.get("ligne"):
            lots = lots.filter(ligne=d["ligne"])
        if d.get("produit"):
            lots = lots.filter(produit=d["produit"])
        return lots

