import { useState } from 'react'
import { appliquerErreursChamps, messageErreur } from '../api/client'
import { useToast } from '../context/ToastContext'

/**
 * Envoie un formulaire à l'API : notification de succès, erreurs de validation placées
 * sous les champs, message d'erreur global (doublon 409, droits 403...) et notification d'erreur.
 */
export function useSoumission() {
  const toast = useToast()
  const [erreurGlobale, setErreurGlobale] = useState(null)

  const executer = async (appel, { setError, succes } = {}) => {
    setErreurGlobale(null)
    try {
      const reponse = await appel()
      if (succes) toast.succes(succes)
      return reponse?.data ?? true
    } catch (e) {
      if (setError) appliquerErreursChamps(e, setError)
      const message = messageErreur(e)
      setErreurGlobale(message)
      toast.erreur(message)
      return null
    }
  }

  return { erreurGlobale, setErreurGlobale, executer }
}

/** Règle react-hook-form pour un champ numérique obligatoire (valueAsNumber). */
export function regleNombre({ min, minExclusif, entier = true, libelle = 'Ce champ', message } = {}) {
  return {
    valueAsNumber: true,
    validate: (v) => {
      if (v === undefined || v === null || Number.isNaN(v)) return `${libelle} est obligatoire.`
      if (entier && !Number.isInteger(v)) return 'Un nombre entier est attendu.'
      if (minExclusif !== undefined && v <= minExclusif) return message || `La valeur doit être supérieure à ${minExclusif}.`
      if (min !== undefined && v < min) return message || `La valeur ne peut pas être inférieure à ${min}.`
      return true
    },
  }
}

/** Règle react-hook-form pour un texte obligatoire. */
export function regleTexte(libelle, max) {
  return {
    required: `${libelle} est obligatoire.`,
    maxLength: { value: max, message: `Au plus ${max} caractères.` },
    validate: (v) => String(v).trim() !== '' || `${libelle} est obligatoire.`,
  }
}
