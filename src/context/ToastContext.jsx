import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import styles from './Toast.module.css'

const ToastContext = createContext(null)
let compteur = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const retirer = useCallback((id) => {
    setToasts((liste) => liste.filter((t) => t.id !== id))
  }, [])

  const afficher = useCallback(
    (type, message) => {
      const id = ++compteur
      setToasts((liste) => [...liste, { id, type, message }])
      setTimeout(() => retirer(id), 4000)
    },
    [retirer],
  )

  const valeur = useMemo(
    () => ({
      succes: (message) => afficher('succes', message),
      erreur: (message) => afficher('erreur', message),
    }),
    [afficher],
  )

  return (
    <ToastContext.Provider value={valeur}>
      {children}
      <div className={styles.zone} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${t.type === 'erreur' ? styles.erreur : styles.succes}`}>
            {t.type === 'erreur' ? <CircleAlert size={21} /> : <CircleCheck size={21} />}
            <span className={styles.message}>{t.message}</span>
            <button type="button" className={styles.fermer} onClick={() => retirer(t.id)} aria-label="Fermer">
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
