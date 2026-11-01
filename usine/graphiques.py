"""Géométrie des graphiques SVG rendus côté serveur (aucune bibliothèque JavaScript)."""
import math
from decimal import Decimal

LARGEUR, HAUTEUR = 640, 220
MARGE_GAUCHE, MARGE_DROITE, MARGE_HAUT, MARGE_BAS = 92, 20, 16, 34


def _coord(valeur):
    """Coordonnée SVG en texte avec un point décimal (le gabarit localisé écrirait « 186,0 »)."""
    return f"{valeur:.1f}"


def _pas_rond(etendue, nb_graduations=4):
    """Pas « rond » (1, 2 ou 5 x 10^n) pour environ nb_graduations graduations."""
    brut = etendue / nb_graduations
    puissance = 10 ** math.floor(math.log10(brut))
    for facteur in (1, 2, 5, 10):
        if brut <= facteur * puissance:
            return facteur * puissance
    return 10 * puissance


def courbe_prix(achats):
    """Courbe du prix d'achat unitaire dans le temps.

    achats : liste d'objets Achat triés par date croissante.
    Renvoie None s'il n'y a aucun achat, sinon les coordonnées des points, des graduations
    et du tracé, dans un repère viewBox de LARGEUR x HAUTEUR.
    """
    achats = list(achats)
    if not achats:
        return None
    prix = [float(a.prix_achat) for a in achats]
    bas, haut = min(prix), max(prix)
    if bas == haut:
        marge = max(abs(bas) * 0.1, 1)
        bas, haut = bas - marge, haut + marge
    pas = _pas_rond(haut - bas)
    bas = max(math.floor(bas / pas) * pas, 0)
    haut = math.ceil(haut / pas) * pas

    jours = [a.date_achat.toordinal() for a in achats]
    premier, dernier = min(jours), max(jours)
    zone_l = LARGEUR - MARGE_GAUCHE - MARGE_DROITE
    zone_h = HAUTEUR - MARGE_HAUT - MARGE_BAS

    def x(jour):
        if dernier == premier:
            return MARGE_GAUCHE + zone_l / 2
        return MARGE_GAUCHE + (jour - premier) / (dernier - premier) * zone_l

    def y(valeur):
        return MARGE_HAUT + (haut - valeur) / (haut - bas) * zone_h

    points = [
        {
            "x": _coord(x(j)),
            "y": _coord(y(p)),
            "prix": Decimal(str(p)),
            "date": a.date_achat,
            "fournisseur": a.fournisseur.raison_sociale,
            "quantite": a.quantite,
        }
        for a, j, p in zip(achats, jours, prix)
    ]
    graduations = []
    valeur = bas
    while valeur <= haut + pas / 2:
        graduations.append({"y": _coord(y(valeur)), "valeur": Decimal(str(round(valeur, 2)))})
        valeur += pas
    dernier_point = points[-1]
    return {
        "etiquette_x": dernier_point["x"],
        "etiquette_y": _coord(float(dernier_point["y"]) - 12),
        "largeur": LARGEUR,
        "hauteur": HAUTEUR,
        "gauche": MARGE_GAUCHE,
        "droite": LARGEUR - MARGE_DROITE,
        "base": HAUTEUR - MARGE_BAS,
        "points": points,
        "trace": " ".join(f"{p['x']},{p['y']}" for p in points),
        "graduations": graduations,
        "premiere_date": achats[0].date_achat,
        "derniere_date": achats[-1].date_achat,
        "plusieurs_dates": dernier != premier,
    }
