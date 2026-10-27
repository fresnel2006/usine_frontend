import { CircleAlert, TriangleAlert } from 'lucide-react'
import Modal from './Modal'

/** Confirmation avant suppression ; si l'API refuse (règle métier), la raison s'affiche ici. */
export default function ConfirmDialog({
  ouvert,
  titre = 'Confirmer la suppression',
  message,
  erreur,
  libelleConfirmer = 'Supprimer',
  definitif = true,
  enCours = false,
  onConfirmer,
  onAnnuler,
}) {
  return (
    <Modal
      ouvert={ouvert}
      titre={erreur ? 'Suppression impossible' : titre}
      onFermer={enCours ? () => {} : onAnnuler}
      pied={
        erreur ? (
          <button type="button" className="btn btn-secondary" onClick={onAnnuler}>
            Fermer
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={onAnnuler} disabled={enCours}>
              Annuler
            </button>
            <button type="button" className="btn btn-danger" onClick={onConfirmer} disabled={enCours}>
              {enCours && <span className="spinner spinner-blanc" />}
              {libelleConfirmer}
            </button>
          </>
        )
      }
    >
      {erreur ? (
        <div className="alert alert-danger" role="alert">
          <CircleAlert size={18} />
          <span>{erreur}</span>
        </div>
      ) : (
        <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
          <TriangleAlert size={25} color="var(--danger)" style={{ flexShrink: 0 }} />
          <p>
            {message}
            {definitif && ' Cette action est définitive.'}
          </p>
        </div>
      )}
    </Modal>
  )
}
