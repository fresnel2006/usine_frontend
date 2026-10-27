import { useState } from 'react'
import api, { messageErreur } from '../api/client'
import { useToast } from '../context/ToastContext'

/**
 * Gère la confirmation et l'appel DELETE. Un refus de l'API (règle métier, droits) est affiché
 * dans la fenêtre de confirmation, qui reste ouverte.
 */
export function useSuppression(apresSuppression) {
  const toast = useToast()
  const [cible, setCible] = useState(null)
  const [erreur, setErreur] = useState(null)
  const [enCours, setEnCours] = useState(false)

  const demander = (url, message, succes) => {
    setErreur(null)
    setCible({ url, message, succes })
  }
  const annuler = () => {
    setCible(null)
    setErreur(null)
  }

  const confirmer = async () => {
    if (!cible) return
    setEnCours(true)
    try {
      await api.delete(cible.url)
      toast.succes(cible.succes)
      setCible(null)
      await apresSuppression?.()
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setEnCours(false)
    }
  }

  return {
    demander,
    dialogue: {
      ouvert: Boolean(cible),
      message: cible?.message,
      erreur,
      enCours,
      onConfirmer: confirmer,
      onAnnuler: annuler,
    },
  }
}
