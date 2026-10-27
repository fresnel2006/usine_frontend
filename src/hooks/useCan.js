import { useAuth } from '../context/AuthContext'
import { lectureSeule, peut } from '../utils/permissions'

/** const peutCreer = useCan('creer', 'ateliers') : affiche ou masque un bouton selon le rôle. */
export function useCan(action, ressource) {
  const { utilisateur } = useAuth()
  return peut(utilisateur, action, ressource)
}

/** Les quatre droits d'une ressource d'un coup : { creer, lire, modifier, supprimer, lectureSeule }. */
export function useDroits(ressource) {
  const { utilisateur } = useAuth()
  return {
    creer: peut(utilisateur, 'creer', ressource),
    lire: peut(utilisateur, 'lire', ressource),
    modifier: peut(utilisateur, 'modifier', ressource),
    supprimer: peut(utilisateur, 'supprimer', ressource),
    lectureSeule: lectureSeule(utilisateur, ressource),
  }
}
