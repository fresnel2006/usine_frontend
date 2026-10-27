const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

/** 1500 -> "1 500" (espace insécable comme séparateur de milliers) */
export function formatNombre(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '-'
  return nombre.format(Number(valeur)).replace(/[  ]/g, ' ')
}

/** 1500 -> "1 500 FCFA" */
export function formatFCFA(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '-'
  return `${formatNombre(valeur)} FCFA`
}

/** "2026-10-19" -> "19/10/2026" */
export function formatDate(valeur) {
  if (!valeur) return '-'
  const [date] = String(valeur).split('T')
  const [a, m, j] = date.split('-')
  return a && m && j ? `${j}/${m}/${a}` : String(valeur)
}

/** "2026-10-19T14:00:00" -> "19/10/2026 14:00" */
export function formatDateHeure(valeur) {
  if (!valeur) return '-'
  const [date, heure = ''] = String(valeur).split('T')
  return `${formatDate(date)} ${heure.slice(0, 5)}`.trim()
}

/** 90 -> "1 h 30 min" */
export function formatDuree(minutes) {
  if (minutes === null || minutes === undefined) return '-'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** "KOUASSI Yao Serge" -> "KY" ; "test@gmail.com" -> "T" */
export function initiales(texte) {
  return String(texte || '?')
    .split('@')[0]
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0])
    .join('')
    .toUpperCase()
}

export function nomComplet(o) {
  return o ? `${o.nom} ${o.prenom}` : '-'
}

/** Date du jour au format AAAA-MM-JJ, pour les champs de type date */
export function aujourdhui() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Valeur pour un champ datetime-local : "2026-10-19T14:00" */
export function maintenantLocal() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${aujourdhui()}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Normalise un texte pour la recherche (minuscules, sans accents) */
export function normaliser(texte) {
  return String(texte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** "2019-03-04" -> "7 ans 7 mois" (à la date du jour) */
export function formatAnciennete(dateEntree) {
  if (!dateEntree) return '-'
  const [a, m, j] = String(dateEntree).split('-').map(Number)
  const now = new Date()
  let mois = (now.getFullYear() - a) * 12 + (now.getMonth() + 1 - m)
  if (now.getDate() < j) mois -= 1
  if (mois < 1) return "Moins d'un mois"
  const ans = Math.floor(mois / 12)
  const reste = mois % 12
  const texteAns = ans ? `${ans} an${ans > 1 ? 's' : ''}` : ''
  const texteMois = reste ? `${reste} mois` : ''
  return [texteAns, texteMois].filter(Boolean).join(' ')
}

/** Nombre de mois d'ancienneté, pour trier la colonne. */
export function moisAnciennete(dateEntree) {
  const [a, m] = String(dateEntree).split('-').map(Number)
  const now = new Date()
  return (now.getFullYear() - a) * 12 + (now.getMonth() + 1 - m)
}
