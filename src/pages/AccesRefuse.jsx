import { Link } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import styles from './PageMessage.module.css'

export default function AccesRefuse() {
  return (
    <div className={styles.bloc}>
      <span className={`pastille rouge ${styles.pastille}`}>
        <LockKeyhole size={30} strokeWidth={1.8} />
      </span>
      <h1>Accès refusé</h1>
      <p className="muted">Votre rôle ne vous permet pas d'ouvrir cette page.</p>
      <Link to="/tableau-de-bord" className="btn btn-primary">
        Retour au tableau de bord
      </Link>
    </div>
  )
}
