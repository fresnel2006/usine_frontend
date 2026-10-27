import { useCallback, useEffect, useState } from 'react'
import api, { messageErreur } from '../api/client'

/**
 * Charge une ou plusieurs ressources de l'API.
 * urls : { cle: '/chemin' } -> donnees.cle
 */
export function useApi(urls, dependances = []) {
  const [donnees, setDonnees] = useState({})
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const cle = JSON.stringify(urls)

  const recharger = useCallback(async () => {
    setErreur(null)
    try {
      const entrees = Object.entries(JSON.parse(cle))
      const reponses = await Promise.all(entrees.map(([, url]) => api.get(url)))
      setDonnees(Object.fromEntries(entrees.map(([nom], i) => [nom, reponses[i].data])))
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setChargement(false)
    }
  }, [cle])

  useEffect(() => {
    setChargement(true)
    recharger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recharger, ...dependances])

  return { donnees, chargement, erreur, recharger }
}
