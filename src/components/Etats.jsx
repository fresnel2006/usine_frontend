import { CircleAlert, Eye, Info } from 'lucide-react'

export function Chargement({ texte = 'Chargement...' }) {
  return (
    <div className="loading-block">
      <span className="spinner" />
      {texte}
    </div>
  )
}

export function Erreur({ message }) {
  return (
    <div className="alert alert-danger">
      <CircleAlert size={18} />
      <span>{message}</span>
    </div>
  )
}

export function Information({ children }) {
  return (
    <div className="alert alert-info">
      <Info size={18} />
      <span>{children}</span>
    </div>
  )
}

/** Bandeau gris discret sous le titre d'une page consultée sans droit de modification. */
export function LectureSeule() {
  return (
    <div className="lecture-seule" title="Lecture seule">
      <Eye size={17} />
      Vous consultez cette page en lecture seule.
    </div>
  )
}
