import axios from 'axios'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
export const CLE_JETON = 'gu_jeton'
export const CLE_UTILISATEUR = 'gu_utilisateur'
export const MESSAGE_SESSION_EXPIREE = 'Votre session a expiré, veuillez vous reconnecter.'
export const MESSAGE_INTERDIT = "Vous n'avez pas les droits pour effectuer cette action."

// Le jeton est gardé le temps de l'onglet (sessionStorage), comme demandé par le cahier des charges.
export const session = {
  jeton: () => sessionStorage.getItem(CLE_JETON),
  enregistrer(jeton, utilisateur) {
    sessionStorage.setItem(CLE_JETON, jeton)
    sessionStorage.setItem(CLE_UTILISATEUR, JSON.stringify(utilisateur))
  },
  majUtilisateur: (utilisateur) => sessionStorage.setItem(CLE_UTILISATEUR, JSON.stringify(utilisateur)),
  utilisateur() {
    try {
      const brut = sessionStorage.getItem(CLE_UTILISATEUR)
      return brut ? JSON.parse(brut) : null
    } catch {
      return null
    }
  },
  effacer() {
    sessionStorage.removeItem(CLE_JETON)
    sessionStorage.removeItem(CLE_UTILISATEUR)
  },
}

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 20000,
})

// Ajoute le jeton JWT à chaque requête
api.interceptors.request.use((config) => {
  const jeton = session.jeton()
  if (jeton) {
    config.headers.Authorization = `Bearer ${jeton}`
  }
  return config
})

// Jeton expiré ou invalide (401) : déconnexion automatique et retour à la connexion
api.interceptors.response.use(
  (reponse) => reponse,
  (erreur) => {
    const status = erreur.response?.status
    const url = erreur.config?.url || ''
    if (status === 401 && !url.includes('/auth/login')) {
      session.effacer()
      if (!window.location.pathname.startsWith('/connexion')) {
        window.location.assign('/connexion?session=expiree')
      }
    }
    return Promise.reject(erreur)
  },
)

/** Message d'erreur lisible, en français, à partir d'une erreur Axios. */
export function messageErreur(erreur) {
  if (!erreur?.response) {
    return "Impossible de joindre le serveur. Vérifiez que l'API est lancée sur " + API_URL + '.'
  }
  const detail = erreur.response.data?.detail
  if (typeof detail === 'string') return detail
  if (erreur.response.status === 403) return MESSAGE_INTERDIT
  if (erreur.response.status === 404) return 'Élément introuvable.'
  return 'Une erreur inattendue est survenue.'
}

/** Place les erreurs de validation renvoyées par l'API sous les champs du formulaire. */
export function appliquerErreursChamps(erreur, setError) {
  const erreurs = erreur?.response?.data?.erreurs
  if (!Array.isArray(erreurs)) return false
  let applique = false
  for (const e of erreurs) {
    if (e.champ) {
      setError(e.champ.split('.')[0], { type: 'serveur', message: e.message })
      applique = true
    }
  }
  return applique
}

export default api
