import { useEffect } from 'react'
import { X } from 'lucide-react'
import styles from './Modal.module.css'

/**
 * Fenêtre centrée (formulaires longs : lot, maintenance, utilisateur), ou panneau latéral
 * de 480 px qui glisse depuis la droite (panneau=true, formulaires courts).
 */
export default function Modal({
  ouvert,
  titre,
  sousTitre,
  icone: Icone,
  onFermer,
  children,
  pied,
  large = false,
  panneau = false,
}) {
  useEffect(() => {
    if (!ouvert) return undefined
    const surTouche = (e) => {
      if (e.key === 'Escape') onFermer()
    }
    document.addEventListener('keydown', surTouche)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', surTouche)
      document.body.style.overflow = ''
    }
  }, [ouvert, onFermer])

  if (!ouvert) return null

  return (
    <div className={`${styles.fond} ${panneau ? styles.fondPanneau : ''}`} onMouseDown={onFermer}>
      <div
        className={`${styles.fenetre} ${large ? styles.large : ''} ${panneau ? styles.panneau : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.entete}>
          {Icone && (
            <span className="pastille">
              <Icone size={22} strokeWidth={1.8} />
            </span>
          )}
          <div className={styles.titres}>
            <h2>{titre}</h2>
            {sousTitre && <p className="muted small">{sousTitre}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onFermer} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <div className={styles.corps}>{children}</div>
        {pied && <div className={styles.pied}>{pied}</div>}
      </div>
    </div>
  )
}

/** Boutons « Annuler » (gris) et « Enregistrer » (bleu, roue de chargement pendant l'envoi). */
export function PiedFormulaire({ formulaire, enCours, onAnnuler, libelle = 'Enregistrer' }) {
  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={onAnnuler} disabled={enCours}>
        Annuler
      </button>
      <button type="submit" form={formulaire} className="btn btn-primary" disabled={enCours}>
        {enCours && <span className="spinner spinner-blanc" />}
        {libelle}
      </button>
    </>
  )
}
