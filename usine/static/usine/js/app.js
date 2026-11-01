/* Comportements de l'interface « Gestion de l'usine ».
   Tout reste utilisable sans JavaScript : les liens et formulaires ouvrent alors des pages complètes. */
(function () {
  'use strict'

  const ENTETE_MODALE = 'X-Fenetre-Modale'

  /* ---------------------------------------------------------------- */
  /* Barre latérale repliable (tablette)                               */
  /* ---------------------------------------------------------------- */
  function initMenu() {
    const app = document.querySelector('.app')
    if (!app) return
    document.querySelectorAll('[data-menu-ouvrir]').forEach((b) =>
      b.addEventListener('click', () => app.classList.add('menu-ouvert'))
    )
    document.querySelectorAll('[data-menu-fermer]').forEach((b) =>
      b.addEventListener('click', () => app.classList.remove('menu-ouvert'))
    )
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') app.classList.remove('menu-ouvert')
    })
  }

  /* ---------------------------------------------------------------- */
  /* Messages (toasts) : fermeture manuelle et automatique             */
  /* ---------------------------------------------------------------- */
  function initToasts() {
    document.querySelectorAll('.toast').forEach((toast) => {
      const fermer = () => toast.remove()
      toast.querySelector('.toast-fermer')?.addEventListener('click', fermer)
      if (toast.classList.contains('succes')) setTimeout(fermer, 5000)
    })
  }

  /* ---------------------------------------------------------------- */
  /* Fenêtre modale : formulaires et confirmations                     */
  /* ---------------------------------------------------------------- */
  const fenetre = document.createElement('dialog')
  fenetre.className = 'fenetre'
  fenetre.addEventListener('click', (e) => {
    if (e.target === fenetre) fenetre.close()
  })
  fenetre.addEventListener('close', () => {
    fenetre.innerHTML = ''
  })

  function afficherDansFenetre(html) {
    fenetre.innerHTML = html
    const contenu = fenetre.querySelector('.fenetre-contenu')
    fenetre.classList.toggle('large', Boolean(contenu && contenu.dataset.large === '1'))
    fenetre.querySelectorAll('[data-fermer]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.preventDefault()
        fenetre.close()
      })
    )
    const formulaire = fenetre.querySelector('form')
    if (formulaire) formulaire.addEventListener('submit', soumettre)
    initMotsDePasse(fenetre)
    if (!fenetre.open) fenetre.showModal()
    const premier = fenetre.querySelector('input:not([type=hidden]):not([disabled]), select, textarea')
    if (premier) premier.focus()
  }

  async function traiterReponse(reponse) {
    const type = reponse.headers.get('Content-Type') || ''
    if (type.includes('application/json')) {
      const donnees = await reponse.json()
      window.location.assign(donnees.redirection)
      return
    }
    if (reponse.redirected) {
      window.location.assign(reponse.url)
      return
    }
    afficherDansFenetre(await reponse.text())
  }

  async function ouvrir(url) {
    try {
      const reponse = await fetch(url, { headers: { [ENTETE_MODALE]: '1' }, credentials: 'same-origin' })
      await traiterReponse(reponse)
    } catch {
      window.location.assign(url)
    }
  }

  async function soumettre(e) {
    e.preventDefault()
    const formulaire = e.currentTarget
    const bouton = formulaire.querySelector('[type=submit]')
    if (bouton) bouton.disabled = true
    try {
      const reponse = await fetch(formulaire.action, {
        method: 'POST',
        body: new FormData(formulaire),
        headers: { [ENTETE_MODALE]: '1' },
        credentials: 'same-origin',
      })
      await traiterReponse(reponse)
    } catch {
      formulaire.removeEventListener('submit', soumettre)
      formulaire.submit()
    } finally {
      if (bouton) bouton.disabled = false
    }
  }

  function initModales() {
    document.body.appendChild(fenetre)
    document.addEventListener('click', (e) => {
      const lien = e.target.closest('a[data-modal]')
      if (!lien || e.ctrlKey || e.metaKey || e.shiftKey) return
      e.preventDefault()
      ouvrir(lien.href)
    })
  }

  /* ---------------------------------------------------------------- */
  /* Afficher / masquer le mot de passe                                 */
  /* ---------------------------------------------------------------- */
  function initMotsDePasse(racine) {
    racine.querySelectorAll('[data-oeil]').forEach((bouton) => {
      bouton.addEventListener('click', () => {
        const champ = bouton.parentElement.querySelector('input')
        const visible = champ.type === 'text'
        champ.type = visible ? 'password' : 'text'
        bouton.querySelector('.oeil-ouvert').hidden = !visible
        bouton.querySelector('.oeil-ferme').hidden = visible
        bouton.setAttribute('aria-label', visible ? 'Afficher le mot de passe' : 'Masquer le mot de passe')
      })
    })
  }

  /* ---------------------------------------------------------------- */
  /* Tableaux : recherche, tri et pagination côté navigateur           */
  /* ---------------------------------------------------------------- */
  function normaliser(texte) {
    return String(texte || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
  }

  function valeurTri(cellule, type) {
    const brute = cellule.dataset.valeur !== undefined ? cellule.dataset.valeur : cellule.textContent
    if (type === 'nombre') {
      const n = parseFloat(String(brute).replace(/\s/g, '').replace(',', '.'))
      return Number.isNaN(n) ? -Infinity : n
    }
    return normaliser(brute)
  }

  function initTableau(conteneur) {
    const table = conteneur.querySelector('table')
    const corps = table.tBodies[0]
    const lignes = Array.from(corps.rows).filter((r) => !r.classList.contains('ligne-vide'))
    const ligneVide = corps.querySelector('.ligne-vide')
    const champRecherche = conteneur.querySelector('[data-recherche]')
    const choixParPage = conteneur.querySelector('[data-par-page]')
    const info = conteneur.querySelector('[data-info]')
    const numero = conteneur.querySelector('[data-numero]')
    const precedent = conteneur.querySelector('[data-precedent]')
    const suivant = conteneur.querySelector('[data-suivant]')
    const textes = lignes.map((l) => normaliser(l.textContent))
    let page = 1
    let ordre = lignes.slice()

    function afficher() {
      const filtre = normaliser(champRecherche ? champRecherche.value : '')
      const visibles = ordre.filter((l) => !filtre || textes[lignes.indexOf(l)].includes(filtre))
      const parPage = choixParPage ? parseInt(choixParPage.value, 10) : 1000
      const pages = Math.max(1, Math.ceil(visibles.length / parPage))
      page = Math.min(page, pages)
      const debut = (page - 1) * parPage
      ordre.forEach((l) => {
        l.hidden = true
      })
      visibles.slice(debut, debut + parPage).forEach((l) => {
        l.hidden = false
      })
      ordre.forEach((l) => corps.appendChild(l))
      if (ligneVide) {
        ligneVide.hidden = visibles.length > 0
        corps.appendChild(ligneVide)
      }
      if (info) {
        info.textContent = visibles.length
          ? `${debut + 1} à ${Math.min(debut + parPage, visibles.length)} sur ${visibles.length}`
          : '0 résultat'
      }
      if (numero) numero.textContent = `Page ${page} / ${pages}`
      if (precedent) precedent.disabled = page <= 1
      if (suivant) suivant.disabled = page >= pages
    }

    table.querySelectorAll('th[data-tri]').forEach((th) => {
      th.tabIndex = 0
      const trier = () => {
        const index = Array.from(th.parentElement.children).indexOf(th)
        const croissant = th.getAttribute('aria-sort') !== 'ascending'
        table.querySelectorAll('th[aria-sort]').forEach((autre) => autre.removeAttribute('aria-sort'))
        th.setAttribute('aria-sort', croissant ? 'ascending' : 'descending')
        const type = th.dataset.tri
        ordre = lignes.slice().sort((a, b) => {
          const va = valeurTri(a.cells[index], type)
          const vb = valeurTri(b.cells[index], type)
          if (va < vb) return croissant ? -1 : 1
          if (va > vb) return croissant ? 1 : -1
          return 0
        })
        page = 1
        afficher()
      }
      th.addEventListener('click', trier)
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          trier()
        }
      })
    })

    if (champRecherche) {
      champRecherche.addEventListener('input', () => {
        page = 1
        afficher()
      })
    }
    if (choixParPage) {
      choixParPage.addEventListener('change', () => {
        page = 1
        afficher()
      })
    }
    if (precedent) {
      precedent.addEventListener('click', () => {
        page -= 1
        afficher()
      })
    }
    if (suivant) {
      suivant.addEventListener('click', () => {
        page += 1
        afficher()
      })
    }
    afficher()
  }

  /* ---------------------------------------------------------------- */
  /* Filtres envoyés automatiquement (listes filtrées côté serveur)     */
  /* ---------------------------------------------------------------- */
  function initFiltres() {
    document.querySelectorAll('form[data-filtres]').forEach((formulaire) => {
      formulaire.querySelectorAll('select, input[type=date]').forEach((champ) =>
        champ.addEventListener('change', () => formulaire.submit())
      )
    })
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMenu()
    initToasts()
    initModales()
    initMotsDePasse(document)
    initFiltres()
    document.querySelectorAll('[data-tableau]').forEach(initTableau)
  })
})()
