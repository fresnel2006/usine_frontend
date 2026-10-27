import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import styles from './PageHeader.module.css'

export default function PageHeader({ titre, sousTitre, retour, icone: Icone, children }) {
  return (
    <div className={styles.entete}>
      <div className={styles.gauche}>
        {retour && (
          <Link to={retour.chemin} className={styles.retour}>
            <ArrowLeft size={16} />
            {retour.libelle}
          </Link>
        )}
        <div className={styles.titreLigne}>
          {Icone && (
            <span className={styles.icone}>
              <Icone size={26} strokeWidth={1.8} />
            </span>
          )}
          <div className={styles.textes}>
            <h1>{titre}</h1>
            {sousTitre && <p className={styles.sousTitre}>{sousTitre}</p>}
          </div>
        </div>
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  )
}
