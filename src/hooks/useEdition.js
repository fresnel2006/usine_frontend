import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * État du formulaire d'une page de liste. Ouvert d'emblée si l'adresse contient ?nouveau=1
 * (raccourcis du tableau de bord) et que le rôle a le droit de créer.
 */
export function useEdition(autorise, parametre = 'nouveau') {
  const [params, setParams] = useSearchParams()
  const [edition, setEditionBrute] = useState(() => (autorise && params.get(parametre) ? {} : null))

  const setEdition = (valeur) => {
    setEditionBrute(valeur)
    if (!valeur && params.get(parametre)) {
      const suite = new URLSearchParams(params)
      suite.delete(parametre)
      setParams(suite, { replace: true })
    }
  }

  return [edition, setEdition]
}
