// Droits de l'application, définis à un seul endroit pour l'interface.
// Copie conforme de DROITS dans backend/app/security.py (section 4 du document des droits) :
// backend/tests/test_droits.py lit ce fichier et vérifie que les deux matrices sont identiques.
// Garder le format « une ressource par ligne ».

const A = 'ADMINISTRATEUR'
const R = 'RESPONSABLE_ATELIER'
const C = 'COLLABORATEUR_RESPONSABLE'
const O = 'OPERATEUR'
const TOUS = [A, R, C, O]
const AUCUN = []

export const ROLES = TOUS

export const LIBELLES_ROLES = {
  [A]: 'Administrateur',
  [R]: 'Responsable atelier',
  [C]: 'Collaborateur responsable',
  [O]: 'Opérateur',
}

export const DROITS = {
  ateliers: { creer: [A, R], lire: TOUS, modifier: [A, R], supprimer: [A, R] },
  lignes: { creer: [A, R], lire: TOUS, modifier: [A, R], supprimer: [A, R] },
  lots: { creer: [A, R], lire: TOUS, modifier: [A, R], supprimer: [A, R] },
  produits: { creer: [A, R], lire: TOUS, modifier: [A, R], supprimer: [A, R] },
  operateurs: { creer: [A, C], lire: TOUS, modifier: [A, C], supprimer: [A, C] },
  equipes: { creer: [A, C], lire: TOUS, modifier: [A, C], supprimer: [A, C] },
  types_incident: { creer: [A, C], lire: TOUS, modifier: [A, C], supprimer: [A, C] },
  incidents: { creer: [A, C, O], lire: TOUS, modifier: [A, C], supprimer: [A, C] },
  machines: { creer: [A, C, O], lire: TOUS, modifier: [A, C, O], supprimer: [A, C, O] },
  maintenances: { creer: [A, C, O], lire: TOUS, modifier: [A, C, O], supprimer: [A, C] },
  pieces_consommees: { creer: [A, C, O], lire: TOUS, modifier: [A, C, O], supprimer: [A, C] },
  pieces: { creer: [A, C, O], lire: TOUS, modifier: [A, C, O], supprimer: [A, C, O] },
  nomenclature: { creer: [A, C, O], lire: TOUS, modifier: [A, C, O], supprimer: [A, C, O] },
  achats: { creer: [A, C, O], lire: TOUS, modifier: [A, C, O], supprimer: [A, C] },
  fournisseurs: { creer: [A], lire: TOUS, modifier: [A], supprimer: [A] },
  utilisateurs: { creer: [A], lire: [A], modifier: [A], supprimer: [A] },
  profil: { creer: AUCUN, lire: TOUS, modifier: TOUS, supprimer: AUCUN },
}

/** peut(utilisateur, 'creer', 'ateliers') -> true / false */
export function peut(utilisateur, action, ressource) {
  return Boolean(utilisateur && DROITS[ressource]?.[action]?.includes(utilisateur.role))
}

/** Une ressource dont le rôle peut seulement consulter le contenu. */
export function lectureSeule(utilisateur, ressource) {
  return !['creer', 'modifier', 'supprimer'].some((action) => peut(utilisateur, action, ressource))
}

/**
 * Un opérateur ne modifie que les maintenances qu'il a effectuées ; le collaborateur
 * responsable et l'administrateur les modifient toutes (même règle que l'API).
 */
export function peutModifierMaintenance(utilisateur, maintenance) {
  if (!peut(utilisateur, 'modifier', 'maintenances')) return false
  if (utilisateur.role !== O) return true
  return maintenance.operateurs.some((o) => o.matricule === utilisateur.matricule)
}

/** Rôles autorisés à ouvrir chaque page (section 9.3). */
export const ACCES_PAGES = {
  utilisateurs: DROITS.utilisateurs.lire,
}
