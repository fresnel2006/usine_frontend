import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, CircleUserRound, Factory, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { initiales } from '../utils/format'
import BadgeRole from './BadgeRole'
import { AUTRES_PAGES, MENU } from './menu'
import styles from './Layout.module.css'

/** Fil d'Ariane : Tableau de bord > Ateliers > Atelier 10 */
function filAriane(chemin) {
  if (chemin === '/tableau-de-bord') return [{ libelle: 'Tableau de bord' }]
  const racine = [{ libelle: 'Tableau de bord', chemin: '/tableau-de-bord' }]
  for (const groupe of MENU) {
    for (const entree of groupe.entrees) {
      if (chemin === entree.chemin) return [...racine, { libelle: entree.libelle }]
      if (chemin.startsWith(`${entree.chemin}/`)) {
        const cle = decodeURIComponent(chemin.slice(entree.chemin.length + 1))
        return [...racine, { libelle: entree.libelle, chemin: entree.chemin }, { libelle: `${entree.singulier} ${cle}` }]
      }
    }
  }
  const autre = AUTRES_PAGES.find((p) => p.chemin === chemin)
  return [...racine, { libelle: autre ? autre.libelle : 'Page introuvable' }]
}

export default function Layout() {
  const { utilisateur, deconnexion } = useAuth()
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [compteOuvert, setCompteOuvert] = useState(false)
  const compte = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const ariane = filAriane(location.pathname)
  const nom = utilisateur.nom_complet || utilisateur.login

  useEffect(() => {
    setMenuOuvert(false)
    setCompteOuvert(false)
  }, [location.pathname])

  useEffect(() => {
    if (!compteOuvert) return undefined
    const dehors = (e) => {
      if (compte.current && !compte.current.contains(e.target)) setCompteOuvert(false)
    }
    document.addEventListener('mousedown', dehors)
    return () => document.removeEventListener('mousedown', dehors)
  }, [compteOuvert])

  const quitter = () => {
    deconnexion()
    navigate('/connexion', { replace: true })
  }

  return (
    <div className={styles.app}>
      <aside className={`${styles.sidebar} ${menuOuvert ? styles.ouvert : ''}`}>
        <div className={styles.sidebarInterieur}>
          <div className={styles.marque}>
            <span className={styles.logo}>
              <Factory size={22} strokeWidth={1.8} />
            </span>
            <div className={styles.texteMarque}>
              <div className={styles.nomApp}>Gestion de l'usine</div>
              <div className={styles.societe}>Akwaba Agro-Industrie</div>
            </div>
            <button
              type="button"
              className={styles.fermerMenu}
              onClick={() => setMenuOuvert(false)}
              aria-label="Fermer le menu"
            >
              <X size={20} />
            </button>
          </div>

          <nav className={styles.nav}>
            {MENU.map((groupe, i) => {
              const entrees = groupe.entrees.filter((e) => !e.roles || e.roles.includes(utilisateur.role))
              if (entrees.length === 0) return null
              return (
                <div key={groupe.titre || i} className={styles.groupe}>
                  {groupe.titre && <div className={styles.titreGroupe}>{groupe.titre}</div>}
                  {entrees.map(({ chemin, libelle, icone: Icone }) => (
                    <NavLink
                      key={chemin}
                      to={chemin}
                      title={libelle}
                      className={({ isActive }) => `${styles.lien} ${isActive ? styles.actif : ''}`}
                    >
                      <Icone size={20} strokeWidth={1.8} />
                      <span className={styles.texteLien}>{libelle}</span>
                    </NavLink>
                  ))}
                </div>
              )
            })}
          </nav>

          <button type="button" className={styles.deconnexionMenu} onClick={quitter} title="Se déconnecter">
            <LogOut size={19} />
            <span className={styles.texteLien}>Se déconnecter</span>
          </button>
        </div>
      </aside>
      {menuOuvert && <div className={styles.voile} onClick={() => setMenuOuvert(false)} />}

      <div className={styles.principal}>
        <header className={styles.entete}>
          <button type="button" className={styles.boutonMenu} onClick={() => setMenuOuvert(true)} aria-label="Ouvrir le menu">
            <Menu size={22} />
          </button>
          <nav className={styles.ariane} aria-label="Fil d'Ariane">
            {ariane.map((etape, i) => (
              <span key={etape.libelle} className={styles.etape}>
                {i > 0 && <ChevronRight size={16} />}
                {etape.chemin ? (
                  <Link to={etape.chemin}>{etape.libelle}</Link>
                ) : (
                  <span className={styles.arianeActif}>{etape.libelle}</span>
                )}
              </span>
            ))}
          </nav>
          <div className={styles.espace} />
          <div className={styles.utilisateur} ref={compte}>
            <button
              type="button"
              className={styles.boutonCompte}
              onClick={() => setCompteOuvert((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={compteOuvert}
            >
              <div className={styles.identite}>
                <span className={styles.nom}>{nom}</span>
                <BadgeRole role={utilisateur.role} />
              </div>
              <span className={styles.avatar}>{initiales(nom)}</span>
              <ChevronDown size={18} className={styles.chevron} />
            </button>
            {compteOuvert && (
              <div className={styles.menuCompte} role="menu">
                <div className={styles.menuCompteEntete}>
                  <strong>{nom}</strong>
                  <span className="muted small">
                    {utilisateur.login}
                    {utilisateur.matricule ? ` - ${utilisateur.matricule}` : ''}
                  </span>
                </div>
                <Link to="/profil" role="menuitem" className={styles.menuCompteLien}>
                  <CircleUserRound size={18} /> Mon profil
                </Link>
                <button type="button" role="menuitem" className={styles.menuCompteLien} onClick={quitter}>
                  <LogOut size={18} /> Se déconnecter
                </button>
              </div>
            )}
          </div>
        </header>
        <main className={styles.contenu} key={location.pathname}>
          <div className="page-entree">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
