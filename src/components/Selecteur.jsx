import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { normaliser } from '../utils/format'
import styles from './Selecteur.module.css'

/**
 * Liste déroulante avec recherche.
 * options : [{ valeur, libelle, detail? , desactive? }]
 * multiple=false : valeur est une chaîne ; multiple=true : un tableau, chaque choix apparaît en étiquette.
 */
export default function Selecteur({
  id,
  options,
  valeur,
  onChange,
  onBlur,
  multiple = false,
  placeholder = 'Choisir...',
  invalide = false,
  desactive = false,
  vide = 'Aucun résultat.',
}) {
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState('')
  const [actif, setActif] = useState(0)
  const racine = useRef(null)
  const saisie = useRef(null)
  const choisis = multiple ? valeur || [] : valeur ? [valeur] : []

  const filtrees = useMemo(() => {
    const q = normaliser(texte.trim())
    if (!q) return options
    return options.filter((o) => normaliser(`${o.valeur} ${o.libelle} ${o.detail || ''}`).includes(q))
  }, [options, texte])

  useEffect(() => {
    if (!ouvert) return undefined
    const dehors = (e) => {
      if (racine.current && !racine.current.contains(e.target)) {
        setOuvert(false)
        setTexte('')
        onBlur?.()
      }
    }
    document.addEventListener('mousedown', dehors)
    return () => document.removeEventListener('mousedown', dehors)
  }, [ouvert, onBlur])

  useEffect(() => setActif(0), [texte])

  const choisir = (o) => {
    if (!o || o.desactive) return
    if (multiple) {
      onChange(choisis.includes(o.valeur) ? choisis.filter((v) => v !== o.valeur) : [...choisis, o.valeur])
      setTexte('')
      saisie.current?.focus()
    } else {
      onChange(o.valeur)
      setOuvert(false)
      setTexte('')
      onBlur?.()
    }
  }

  const surTouche = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOuvert(true)
      setActif((a) => Math.min(a + 1, filtrees.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActif((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      if (ouvert) {
        e.preventDefault()
        choisir(filtrees[actif])
      }
    } else if (e.key === 'Escape' && ouvert) {
      e.stopPropagation()
      setOuvert(false)
    } else if (e.key === 'Backspace' && multiple && !texte && choisis.length) {
      onChange(choisis.slice(0, -1))
    }
  }

  const libelleDe = (v) => options.find((o) => o.valeur === v)?.libelle ?? v
  const affiche = !multiple && !ouvert && valeur ? libelleDe(valeur) : texte

  return (
    <div ref={racine} className={styles.racine}>
      {multiple && choisis.length > 0 && (
        <div className="etiquettes" style={{ marginBottom: 8 }}>
          {choisis.map((v) => (
            <span key={v} className="etiquette">
              {libelleDe(v)}
              {!desactive && (
                <button type="button" onClick={() => onChange(choisis.filter((x) => x !== v))} aria-label={`Retirer ${libelleDe(v)}`}>
                  <X size={14} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <div className={styles.champ}>
        <Search size={17} className={styles.loupe} />
        <input
          id={id}
          ref={saisie}
          className={`input ${styles.saisie} ${invalide ? 'invalid' : ''}`}
          role="combobox"
          aria-expanded={ouvert}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={desactive}
          placeholder={multiple ? (choisis.length ? 'Ajouter...' : placeholder) : valeur ? libelleDe(valeur) : placeholder}
          value={affiche}
          onFocus={() => setOuvert(true)}
          onClick={() => setOuvert(true)}
          onChange={(e) => {
            setTexte(e.target.value)
            setOuvert(true)
          }}
          onKeyDown={surTouche}
        />
        <ChevronDown size={18} className={styles.chevron} />
      </div>
      {ouvert && !desactive && (
        <ul className={styles.liste} role="listbox" aria-multiselectable={multiple}>
          {filtrees.length === 0 ? (
            <li className={styles.vide}>{vide}</li>
          ) : (
            filtrees.map((o, i) => {
              const choisi = choisis.includes(o.valeur)
              return (
                <li
                  key={o.valeur}
                  role="option"
                  aria-selected={choisi}
                  aria-disabled={o.desactive || undefined}
                  className={`${styles.option} ${i === actif ? styles.optionActive : ''} ${o.desactive ? styles.optionDesactivee : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActif(i)}
                  onClick={() => choisir(o)}
                >
                  <span className={styles.coche}>{choisi && <Check size={16} />}</span>
                  <span className={styles.texteOption}>{o.libelle}</span>
                  {o.detail && <span className={styles.detail}>{o.detail}</span>}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
