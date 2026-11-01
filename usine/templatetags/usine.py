"""Filtres et balises de gabarit de l'application (chargés partout via settings.TEMPLATES builtins)."""
from datetime import date, datetime
from decimal import Decimal

from django import template
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from usine import permissions
from usine.icones import ICONES
from usine.models import ROLES

register = template.Library()

LIBELLES_ROLES = dict(ROLES)
CLASSES_ROLES = {
    "ADMINISTRATEUR": "badge-dark",
    "RESPONSABLE_ATELIER": "badge-primary",
    "COLLABORATEUR_RESPONSABLE": "badge-primary-strong",
    "OPERATEUR": "badge",
}


@register.simple_tag
def icone(nom, taille=16, classe=""):
    """Icône Lucide en SVG intégré : {% icone "factory" 18 %}."""
    contenu = ICONES[nom]
    return mark_safe(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{int(taille)}" height="{int(taille)}" '
        f'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
        f'stroke-linecap="round" stroke-linejoin="round" class="icone {classe}" aria-hidden="true">'
        f"{contenu}</svg>"
    )


@register.filter
def nombre(valeur):
    """1500 -> « 1 500 » ; 1500.5 -> « 1 500,5 »."""
    if valeur is None or valeur == "":
        return "-"
    valeur = Decimal(str(valeur))
    entier = int(valeur)
    texte = f"{abs(entier):,}".replace(",", " ")
    if entier < 0 or (valeur < 0 and entier == 0):
        texte = "-" + texte
    decimales = abs(valeur - entier)
    if decimales:
        texte += "," + f"{decimales:.2f}"[2:].rstrip("0")
    return texte


@register.filter
def fcfa(valeur):
    """1500 -> « 1 500 FCFA »."""
    texte = nombre(valeur)
    return texte if texte == "-" else f"{texte} FCFA"


@register.filter
def date_fr(valeur):
    """date(2026, 10, 19) -> « 19/10/2026 »."""
    if not valeur:
        return "-"
    if isinstance(valeur, (date, datetime)):
        return valeur.strftime("%d/%m/%Y")
    return str(valeur)


@register.filter
def date_heure_fr(valeur):
    """datetime(2026, 10, 19, 14, 0) -> « 19/10/2026 14:00 »."""
    if not valeur:
        return "-"
    return valeur.strftime("%d/%m/%Y %H:%M")


@register.filter
def duree(minutes):
    """90 -> « 1 h 30 min »."""
    if minutes is None or minutes == "":
        return "-"
    minutes = int(minutes)
    heures, reste = divmod(minutes, 60)
    if heures == 0:
        return f"{reste} min"
    return f"{heures} h" if reste == 0 else f"{heures} h {reste} min"


@register.filter
def anciennete_mois(date_entree, reference=None):
    """Nombre de mois complets depuis la date d'entrée (pour le tri)."""
    if not date_entree:
        return 0
    fin = reference or date.today()
    mois = (fin.year - date_entree.year) * 12 + fin.month - date_entree.month
    if fin.day < date_entree.day:
        mois -= 1
    return max(mois, 0)


@register.filter
def anciennete(date_entree, reference=None):
    """date(2020, 6, 15) -> « 6 ans 4 mois » au 01/11/2026."""
    if not date_entree:
        return "-"
    annees, mois = divmod(anciennete_mois(date_entree, reference), 12)
    morceaux = []
    if annees:
        morceaux.append(f"{annees} an{'s' if annees > 1 else ''}")
    if mois or not annees:
        morceaux.append(f"{mois} mois")
    return " ".join(morceaux)


@register.filter
def libelle_role(role):
    return LIBELLES_ROLES.get(role, role)


@register.simple_tag
def badge_role(role):
    return format_html('<span class="badge {}">{}</span>', CLASSES_ROLES.get(role, "badge"), libelle_role(role))


@register.filter
def initiales(texte):
    mots = [m for m in str(texte or "").split() if m]
    return "".join(m[0] for m in mots[:2]).upper() or "?"


@register.simple_tag(takes_context=True)
def peut(context, ressource, action="lire"):
    """{% peut "ateliers" "creer" as droit_creer %} : même matrice que les vues."""
    return permissions.peut(context.get("utilisateur"), ressource, action)


@register.filter
def fois(valeur, facteur):
    """Produit de deux nombres : prix unitaire x quantité."""
    try:
        return Decimal(str(valeur)) * Decimal(str(facteur))
    except (TypeError, ValueError, ArithmeticError):
        return None


@register.filter
def pourcentage(valeur, maximum):
    """Largeur d'une barre de graphique, en pourcentage du maximum."""
    try:
        valeur, maximum = float(valeur), float(maximum)
    except (TypeError, ValueError):
        return 0
    if maximum <= 0:
        return 0
    return round(max(valeur, 0) * 100 / maximum, 1)
