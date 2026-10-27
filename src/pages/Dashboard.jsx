import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Activity,
  Boxes,
  CalendarDays,
  ChartColumn,
  Clock,
  Cog,
  Factory,
  Package,
  PackageX,
  Plus,
  Rows3,
  ShieldCheck,
  ShoppingCart,
  Timer,
  TriangleAlert,
  Truck,
  UserPlus,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { LIBELLES_ROLES } from '../utils/permissions'
import { aujourdhui, formatDate, formatDateHeure, formatFCFA, formatNombre, initiales, nomComplet } from '../utils/format'
import BadgeRole from '../components/BadgeRole'
import { Chargement, Erreur } from '../components/Etats'
import styles from './Dashboard.module.css'

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

// Contenu propre à chaque rôle (section 5) : message, icônes des 4 cartes et raccourcis
const PAR_ROLE = {
  ADMINISTRATEUR: {
    message: "Vue globale de l'usine, des comptes et des fournisseurs.",
    icones: [
      [ShieldCheck, ''],
      [Truck, 'violet'],
      [Boxes, 'turquoise'],
      [Clock, 'rouge'],
    ],
    raccourcis: [
      { libelle: 'Gérer les comptes', chemin: '/utilisateurs', icone: ShieldCheck },
      { libelle: 'Ajouter un fournisseur', chemin: '/fournisseurs', icone: Truck },
    ],
  },
  RESPONSABLE_ATELIER: {
    message: 'Votre atelier, ses lignes et sa production.',
    icones: [
      [Boxes, ''],
      [Rows3, 'violet'],
      [Clock, 'rouge'],
      [Package, 'turquoise'],
    ],
    raccourcis: [
      { libelle: 'Nouveau lot', chemin: '/lots?nouveau=1', icone: Plus },
      { libelle: 'Nouvelle ligne', chemin: '/lignes?nouveau=1', icone: Rows3 },
    ],
  },
  COLLABORATEUR_RESPONSABLE: {
    message: 'Votre équipe et les incidents de production.',
    icones: [
      [Users, ''],
      [TriangleAlert, 'rouge'],
      [Clock, 'violet'],
      [UserRound, 'vert'],
    ],
    raccourcis: [
      { libelle: 'Déclarer un incident', chemin: '/incidents?nouveau=1', icone: TriangleAlert },
      { libelle: 'Ajouter un opérateur', chemin: '/operateurs?nouveau=1', icone: UserPlus },
    ],
  },
  OPERATEUR: {
    message: 'Vos maintenances, les machines de votre ligne et le stock de pièces.',
    icones: [
      [Wrench, ''],
      [Timer, 'violet'],
      [PackageX, 'rouge'],
      [Cog, 'turquoise'],
    ],
    raccourcis: [
      { libelle: 'Enregistrer une maintenance', chemin: '/maintenances?nouveau=1', icone: Wrench },
      { libelle: 'Enregistrer un achat de pièce', chemin: '/pieces?achat=1', icone: ShoppingCart },
    ],
  },
}

function Indicateur({ icone: Icone, couleur, libelle, valeur, detail }) {
  return (
    <div className={styles.indicateur}>
      <div className={styles.indicateurEntete}>
        <span className={styles.indicateurLibelle}>{libelle}</span>
        <span className={`pastille ${couleur || ''}`}>
          <Icone size={22} strokeWidth={1.8} />
        </span>
      </div>
      <span className={styles.valeur}>{formatNombre(valeur)}</span>
      {detail && <span className={styles.detail}>{detail}</span>}
    </div>
  )
}

function Carte({ icone: Icone, couleur, titre, aside, children, className = '' }) {
  return (
    <section className={`panel ${styles.carte} ${className}`}>
      <div className={styles.carteEntete}>
        <div className="panel-titre">
          <span className={`pastille sm ${couleur || ''}`}>
            <Icone size={18} strokeWidth={1.9} />
          </span>
          <h2>{titre}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Graphique({ donnees, unite }) {
  if (donnees.length === 0) return <p className={styles.vide}>Aucune donnée à afficher.</p>
  return (
    <div className={styles.graphique} role="img" aria-label={`Graphique, en ${unite}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={donnees} margin={{ top: 28, right: 8, left: -8, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="#edf0f5" strokeDasharray="4 4" />
          <XAxis
            dataKey="libelle"
            interval={0}
            tickFormatter={(l) => l.replace(/^Atelier\s+/i, '')}
            tickLine={false}
            axisLine={{ stroke: '#d3dae5' }}
            tick={{ fill: '#475467', fontSize: 14 }}
            tickMargin={10}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#98a2b3', fontSize: 14 }} width={48} />
          <Tooltip
            cursor={{ fill: 'rgba(31, 78, 140, 0.05)', radius: 8 }}
            formatter={(v) => [`${formatNombre(v)} ${unite}`, '']}
            separator=""
          />
          <Bar dataKey="valeur" fill="#1f4e8c" radius={[8, 8, 0, 0]} maxBarSize={72} label={{ position: 'top', fill: '#101828', fontSize: 14, fontWeight: 600 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ListePersonnes({ personnes, vide }) {
  if (personnes.length === 0) return <p className={styles.vide}>{vide}</p>
  return (
    <ul className={styles.liste}>
      {personnes.map((o) => (
        <li key={o.matricule}>
          <span className="avatar">{initiales(nomComplet(o))}</span>
          <div className={styles.listeTexte}>
            <Link to={`/operateurs/${o.matricule}`} className={styles.listeTitre}>
              {nomComplet(o)}
            </Link>
            <span className={styles.listeMeta}>Matricule {o.matricule}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function PiecesStockFaible({ pieces, seuil }) {
  return (
    <Carte icone={PackageX} couleur="rouge" titre="Pièces en stock faible" aside={<span className="badge badge-danger">{pieces.length}</span>}>
      {pieces.length === 0 ? (
        <p className={styles.vide}>Aucune pièce sous le seuil de {seuil} unités.</p>
      ) : (
        <ul className={styles.liste}>
          {pieces.map((p) => (
            <li key={p.reference}>
              <div className={styles.listeTexte}>
                <Link to={`/pieces/${encodeURIComponent(p.reference)}`} className={styles.listeTitre}>
                  {p.libelle}
                </Link>
                <span className={styles.listeMeta}>
                  <span className="chip">{p.reference}</span>
                  {formatFCFA(p.prix_unitaire_ht)}
                </span>
              </div>
              <span className="badge badge-danger">{p.quantite_stock === 0 ? 'Rupture' : `${p.quantite_stock} restant(s)`}</span>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.notePied}>Seuil d'alerte : {seuil} unités ou moins.</p>
    </Carte>
  )
}

/** Blocs complémentaires selon le rôle. */
function BlocsDuRole({ t }) {
  if (t.role === 'ADMINISTRATEUR') {
    return (
      <>
        <Carte icone={ShieldCheck} titre="Comptes par rôle" className={styles.moitie}>
          <table className={styles.tableau}>
            <thead>
              <tr>
                <th>Rôle</th>
                <th className="num">Actifs</th>
                <th className="num">Désactivés</th>
              </tr>
            </thead>
            <tbody>
              {t.comptes_par_role.map((c) => (
                <tr key={c.role}>
                  <td>
                    <BadgeRole role={c.role} />
                  </td>
                  <td className="num">{c.actifs}</td>
                  <td className="num">{c.desactives}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Carte>
        <Carte icone={Users} couleur="violet" titre="Comptes de l'application" className={styles.moitie} aside={<Link to="/utilisateurs">Gérer</Link>}>
          <ul className={styles.liste}>
            {t.comptes.map((c) => (
              <li key={c.login}>
                <span className="avatar">{initiales(c.nom_complet || c.login)}</span>
                <div className={styles.listeTexte}>
                  <span className={styles.listeTitre}>{c.nom_complet || 'Administrateur système'}</span>
                  <span className={styles.listeMeta}>
                    <span className="chip">{c.login}</span>
                    {LIBELLES_ROLES[c.role]}
                  </span>
                </div>
                <span className={`badge ${c.actif ? 'badge-success' : ''}`}>{c.actif ? 'Actif' : 'Désactivé'}</span>
              </li>
            ))}
          </ul>
        </Carte>
        <div className={styles.pleineLargeur}>
          <PiecesStockFaible pieces={t.pieces_stock_faible} seuil={t.seuil_stock_faible} />
        </div>
      </>
    )
  }
  if (t.role === 'RESPONSABLE_ATELIER') {
    return (
      <Carte icone={Package} couleur="turquoise" titre="Production par produit" aside={<span className="muted small">lots de mon atelier</span>} className={styles.pleine}>
        <Graphique donnees={t.production_par_produit} unite="lots" />
      </Carte>
    )
  }
  if (t.role === 'COLLABORATEUR_RESPONSABLE') {
    return (
      <Carte
        icone={Users}
        couleur="vert"
        titre={t.equipe ? `Membres de mon équipe - ${t.equipe.libelle}` : 'Membres de mon équipe'}
        aside={t.equipe && <Link to={`/equipes/${t.equipe.numero}`}>Voir l'équipe</Link>}
        className={styles.pleine}
      >
        <ListePersonnes personnes={t.membres_equipe} vide="Aucun membre dans votre équipe." />
      </Carte>
    )
  }
  return (
    <>
      <Carte icone={Cog} couleur="turquoise" titre="Machines de ma ligne" className={styles.moitie}>
        {t.machines.length === 0 ? (
          <p className={styles.vide}>Aucune ligne associée : vous n'avez encore participé à aucun lot ni aucune maintenance.</p>
        ) : (
          <ul className={styles.liste}>
            {t.machines.map((m) => (
              <li key={m.num_machine}>
                <span className={styles.numero}>{m.num_machine}</span>
                <div className={styles.listeTexte}>
                  <Link to={`/machines/${m.num_machine}`} className={styles.listeTitre}>
                    {m.designation}
                  </Link>
                  <span className={styles.listeMeta}>
                    Ligne {m.num_ligne} - {m.derniere_maintenance ? `dernière maintenance le ${formatDateHeure(m.derniere_maintenance)}` : 'jamais entretenue'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Carte>
      <div className={styles.moitieColonne}>
        <PiecesStockFaible pieces={t.pieces_stock_faible} seuil={t.seuil_stock_faible} />
      </div>
    </>
  )
}

export default function Dashboard() {
  const { utilisateur } = useAuth()
  const { donnees, chargement, erreur } = useApi({ tableau: '/dashboard' })
  const t = donnees.tableau
  const nom = utilisateur.nom_complet || utilisateur.login

  if (chargement) return <Chargement texte="Chargement du tableau de bord..." />
  if (erreur) return <Erreur message={erreur} />

  const role = PAR_ROLE[t.role]
  const contexte = t.atelier ? ` - ${t.atelier.libelle}` : t.equipe ? ` - ${t.equipe.libelle}` : ''

  return (
    <>
      <div className={styles.bandeau}>
        <div className={styles.bandeauTexte}>
          <span className={styles.date}>
            <CalendarDays size={16} />
            {JOURS[new Date().getDay()]} {formatDate(aujourdhui())}
          </span>
          <h1>Bonjour, {nom}</h1>
          <p>
            {LIBELLES_ROLES[t.role]}
            {contexte}. {role.message}
          </p>
          <div className={styles.raccourcis}>
            {role.raccourcis.map(({ libelle, chemin, icone: Icone }) => (
              <Link key={chemin} to={chemin} className={`btn ${styles.raccourci}`}>
                <Icone size={18} /> {libelle}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.indicateurs}>
        {t.indicateurs.map((ind, i) => {
          const [icone, couleur] = role.icones[i] || [Activity, '']
          return <Indicateur key={ind.libelle} icone={icone} couleur={couleur} {...ind} />
        })}
      </div>

      <div className={styles.grille}>
        <Carte icone={ChartColumn} titre={t.titre_graphique} aside={<span className="muted small">en {t.unite_graphique}</span>} className={styles.large}>
          <div className={styles.carteCorps}>
            <Graphique donnees={t.graphique} unite={t.unite_graphique} />
          </div>
        </Carte>

        <div className={styles.colonne}>
          <Carte icone={t.role === 'COLLABORATEUR_RESPONSABLE' ? TriangleAlert : t.role === 'OPERATEUR' ? Wrench : Factory} couleur="turquoise" titre={t.titre_activite}>
            {t.activite.length === 0 ? (
              <p className={styles.vide}>Aucune activité récente.</p>
            ) : (
              <ul className={styles.liste}>
                {t.activite.map((a) => (
                  <li key={`${a.lien}-${a.date}`}>
                    <div className={styles.listeTexte}>
                      {a.lien ? (
                        <Link to={a.lien} className={styles.listeTitre}>
                          {a.titre}
                        </Link>
                      ) : (
                        <span className={styles.listeTitre}>{a.titre}</span>
                      )}
                      <span className={styles.listeMeta}>{a.detail}</span>
                      <span className={styles.listeMeta}>
                        <CalendarDays size={14} />
                        {String(a.date).includes('T') ? formatDateHeure(a.date) : formatDate(a.date)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Carte>
        </div>

        <BlocsDuRole t={t} />
      </div>
    </>
  )
}
