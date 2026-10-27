import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Inbox, Search } from 'lucide-react'
import { normaliser } from '../utils/format'
import styles from './DataTable.module.css'

function valeurDe(col, ligne) {
  return col.valeur ? col.valeur(ligne) : ligne[col.cle]
}

/**
 * Tableau avec recherche, tri par colonne et pagination côté client.
 * columns : [{ cle, libelle, rendu?(ligne), valeur?(ligne), align?, largeur?, triable? }]
 * vide : message de liste vide ; videIcone et videAction (bouton « Ajouter le premier... ») sont facultatifs.
 */
export default function DataTable({
  columns,
  rows,
  rowKey,
  actions,
  filtres,
  rechercheTexte = 'Rechercher...',
  recherche = true,
  parPageDefaut = 10,
  vide = 'Aucun enregistrement.',
  videIcone: VideIcone = Inbox,
  videAction,
  onRowClick,
  chargement = false,
}) {
  const [texte, setTexte] = useState('')
  const [tri, setTri] = useState({ cle: null, sens: 'asc' })
  const [page, setPage] = useState(1)
  const [parPage, setParPage] = useState(parPageDefaut)

  const filtrees = useMemo(() => {
    const q = normaliser(texte.trim())
    if (!q) return rows
    return rows.filter((ligne) => columns.some((col) => normaliser(valeurDe(col, ligne)).includes(q)))
  }, [rows, texte, columns])

  const triees = useMemo(() => {
    if (!tri.cle) return filtrees
    const col = columns.find((c) => c.cle === tri.cle)
    if (!col) return filtrees
    const copie = [...filtrees]
    copie.sort((a, b) => {
      const va = valeurDe(col, a)
      const vb = valeurDe(col, b)
      if (va === vb) return 0
      if (va === null || va === undefined) return 1
      if (vb === null || vb === undefined) return -1
      const res =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'fr', { numeric: true, sensitivity: 'base' })
      return tri.sens === 'asc' ? res : -res
    })
    return copie
  }, [filtrees, tri, columns])

  const nbPages = Math.max(1, Math.ceil(triees.length / parPage))

  useEffect(() => {
    setPage(1)
  }, [texte, parPage])

  useEffect(() => {
    if (page > nbPages) setPage(nbPages)
  }, [page, nbPages])

  const visibles = triees.slice((page - 1) * parPage, page * parPage)
  const nbColonnes = columns.length + (actions ? 1 : 0)

  const trier = (col) => {
    if (col.triable === false) return
    setTri((t) =>
      t.cle === col.cle ? { cle: col.cle, sens: t.sens === 'asc' ? 'desc' : 'asc' } : { cle: col.cle, sens: 'asc' },
    )
  }

  const debut = triees.length === 0 ? 0 : (page - 1) * parPage + 1
  const fin = Math.min(page * parPage, triees.length)

  let corps
  if (chargement) {
    corps = Array.from({ length: 5 }, (_, i) => (
      <tr key={i} aria-hidden="true">
        {Array.from({ length: nbColonnes }, (__, j) => (
          <td key={j}>
            <span className="squelette" style={{ width: `${45 + ((i + j) % 4) * 15}%` }} />
          </td>
        ))}
      </tr>
    ))
  } else if (visibles.length === 0) {
    corps = (
      <tr>
        <td colSpan={nbColonnes} className={styles.vide}>
          {texte || rows.length > 0 ? (
            'Aucun résultat pour cette recherche.'
          ) : (
            <div className="vide-liste">
              <span className="pastille">
                <VideIcone size={26} strokeWidth={1.6} />
              </span>
              <span>{vide}</span>
              {videAction}
            </div>
          )}
        </td>
      </tr>
    )
  } else {
    corps = visibles.map((ligne) => (
      <tr
        key={rowKey(ligne)}
        className={onRowClick ? styles.cliquable : ''}
        onClick={onRowClick ? () => onRowClick(ligne) : undefined}
      >
        {columns.map((col) => (
          <td key={col.cle} style={{ textAlign: col.align }} className={col.align === 'right' ? 'num' : ''}>
            {col.rendu ? col.rendu(ligne) : (ligne[col.cle] ?? '-')}
          </td>
        ))}
        {actions && (
          <td className={styles.colActions} onClick={(e) => e.stopPropagation()}>
            <div className={styles.actions}>{actions(ligne)}</div>
          </td>
        )}
      </tr>
    ))
  }

  return (
    <div className={styles.conteneur}>
      {(recherche || filtres) && (
        <div className={styles.barre}>
          {recherche && (
            <div className={styles.recherche}>
              <Search size={18} />
              <input
                className="input"
                type="search"
                placeholder={rechercheTexte}
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                aria-label="Rechercher"
              />
            </div>
          )}
          {filtres && <div className={styles.filtres}>{filtres}</div>}
        </div>
      )}

      <div className={styles.defilement}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => {
                const triee = tri.cle === col.cle
                let icone = null
                if (col.triable !== false) {
                  if (!triee) icone = <ChevronsUpDown size={16} className={styles.iconeTri} />
                  else icone = tri.sens === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                }
                return (
                  <th
                    key={col.cle}
                    style={{ width: col.largeur, textAlign: col.align }}
                    className={col.triable === false ? '' : styles.triable}
                    onClick={() => trier(col)}
                    aria-sort={triee ? (tri.sens === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <span
                      className={styles.entete}
                      style={{ justifyContent: col.align === 'right' ? 'flex-end' : undefined }}
                    >
                      {col.libelle}
                      {icone}
                    </span>
                  </th>
                )
              })}
              {actions && <th className={styles.colActions}>Actions</th>}
            </tr>
          </thead>
          <tbody>{corps}</tbody>
        </table>
      </div>

      {(recherche || triees.length > parPageDefaut) && (
      <div className={styles.pied}>
        <span className="muted">
          {triees.length} résultat{triees.length > 1 ? 's' : ''}
          {triees.length > parPage ? ` - ${debut} à ${fin}` : ''}
        </span>
        <div className={styles.pagination}>
          <label className={styles.parPage}>
            Lignes par page
            <select className="select" value={parPage} onChange={(e) => setParPage(Number(e.target.value))}>
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft size={18} /> Précédent
          </button>
          <span className={styles.numeroPage}>
            Page {page} / {nbPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= nbPages}
          >
            Suivant <ChevronRight size={18} />
          </button>
        </div>
      </div>
      )}
    </div>
  )
}
