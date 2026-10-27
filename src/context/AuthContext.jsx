import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { session } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(() => (session.jeton() ? session.utilisateur() : null))

  // Vérifie au chargement que le jeton enregistré est toujours valide (sinon l'intercepteur déconnecte)
  useEffect(() => {
    if (!session.jeton()) return
    api
      .get('/auth/me')
      .then(({ data }) => {
        session.majUtilisateur(data)
        setUtilisateur(data)
      })
      .catch(() => {})
  }, [])

  const connexion = useCallback(async (login, motDePasse) => {
    const { data } = await api.post('/auth/login', { login, mot_de_passe: motDePasse })
    session.enregistrer(data.access_token, data.utilisateur)
    setUtilisateur(data.utilisateur)
    return data.utilisateur
  }, [])

  const deconnexion = useCallback(() => {
    session.effacer()
    setUtilisateur(null)
  }, [])

  const valeur = useMemo(
    () => ({ utilisateur, role: utilisateur?.role ?? null, connexion, deconnexion }),
    [utilisateur, connexion, deconnexion],
  )

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
