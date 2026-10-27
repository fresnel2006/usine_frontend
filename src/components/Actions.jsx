import { Eye, Pencil, Trash2 } from 'lucide-react'

/** Icônes Voir / Modifier / Supprimer d'une ligne de tableau ; seules celles fournies s'affichent. */
export default function Actions({ voir, modifier, supprimer }) {
  return (
    <>
      {voir && (
        <button type="button" className="icon-btn" title="Voir" aria-label="Voir" onClick={voir}>
          <Eye size={18} />
        </button>
      )}
      {modifier && (
        <button type="button" className="icon-btn" title="Modifier" aria-label="Modifier" onClick={modifier}>
          <Pencil size={18} />
        </button>
      )}
      {supprimer && (
        <button type="button" className="icon-btn danger" title="Supprimer" aria-label="Supprimer" onClick={supprimer}>
          <Trash2 size={18} />
        </button>
      )}
    </>
  )
}
