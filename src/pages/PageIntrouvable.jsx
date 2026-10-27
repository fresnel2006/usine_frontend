import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import styles from './PageMessage.module.css'

export default function PageIntrouvable() {
  return (
    <div className={styles.bloc}>
      <span className={`pastille ${styles.pastille}`}>
        <FileQuestion size={30} strokeWidth={1.8} />
      </span>
      <h1>Page introuvable</h1>
      <p className="muted">Cette page n'existe pas.</p>
      <Link to="/tableau-de-bord" className="btn btn-primary">
        Retour au tableau de bord
      </Link>
    </div>
  )
}
