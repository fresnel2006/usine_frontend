import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Protège une route : sans connexion, renvoie vers /connexion (puis retour à la page demandée) ;
 * si le rôle n'est pas dans « roles », renvoie vers /acces-refuse. Sans « roles », tout rôle connecté passe.
 */
export default function RequireRole({ roles, children }) {
  const { utilisateur } = useAuth()
  const location = useLocation()

  if (!utilisateur) {
    return <Navigate to="/connexion" replace state={{ depuis: location.pathname + location.search }} />
  }
  if (roles && !roles.includes(utilisateur.role)) {
    return <Navigate to="/acces-refuse" replace />
  }
  return children
}
