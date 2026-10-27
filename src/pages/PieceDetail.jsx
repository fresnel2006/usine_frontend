import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown, ChevronRight, Info, Network, Pencil, Plus, ShoppingCart, Trash2, Warehouse, Wrench } from 'lucide-react'
import api from '../api/client'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useSuppression } from '../hooks/useSuppression'
import { regleNombre, useSoumission } from '../hooks/useSoumission'
import { formatDate, formatDateHeure, formatFCFA, formatNombre } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Onglets from '../components/Onglets'
import Modal, { PiedFormulaire } from '../components/Modal'
import FormField from '../components/FormField'
import Selecteur from '../components/Selecteur'
import ConfirmDialog from '../components/ConfirmDialog'
import Actions from '../components/Actions'
import { Chargement, Erreur, LectureSeule } from '../components/Etats'
import { BadgeStockPiece, FormulaireAchat, FormulairePiece } from './Pieces'
import styles from './PieceDetail.module.css'

/** Noeud de l'arbre de nomenclature, dépliable. */
function Noeud({ noeud, niveau = 0 }) {
  const [ouvert, setOuvert] = useState(niveau < 1)
  const enfants = noeud.composants.length > 0
  return (
    <li>
      <div className={styles.noeud} style={{ paddingLeft: niveau * 28 }}>
        {enfants ? (
          <button type="button" className={styles.basculer} onClick={() => setOuvert((v) => !v)} aria-label={ouvert ? 'Replier' : 'Déplier'}>
            {ouvert ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        ) : (
          <span className={styles.basculer} />
        )}
        <span className="chip">{noeud.quantite} x</span>
        <Link to={`/pieces/${encodeURIComponent(noeud.reference)}`}>{noeud.libelle}</Link>
        <span className="muted small">{noeud.reference}</span>
        <span style={{ marginLeft: 'auto' }}>
          <BadgeStockPiece stock={noeud.quantite_stock} />
        </span>
      </div>
      {enfants && ouvert && (
        <ul className={styles.arbre}>
          {noeud.composants.map((n) => (
            <Noeud key={n.reference} noeud={n} niveau={niveau + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

function FormulaireComposant({ piece, composant, pieces, onFermer, onEnregistre }) {
  const modification = Boolean(composant)
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: composant ? { reference_composant: composant.reference, quantite: composant.quantite } : { reference_composant: '', quantite: 1 },
  })
  const base = `/pieces/${encodeURIComponent(piece.reference)}/composants`
  const deja = piece.nomenclature.composants.map((c) => c.reference)

  const soumettre = async (v) => {
    const ok = await executer(
      () =>
        modification
          ? api.put(`${base}/${encodeURIComponent(composant.reference)}`, { quantite: v.quantite })
          : api.post(base, { reference_composant: v.reference_composant, quantite: v.quantite }),
      { setError, succes: 'Nomenclature enregistrée avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      panneau
      titre={modification ? `Modifier la quantité de ${composant.libelle}` : 'Ajouter un composant'}
      sousTitre={`Pièces qui composent ${piece.libelle}.`}
      icone={Network}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-composant" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-composant" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="Pièce composant" htmlFor="reference_composant" required error={errors.reference_composant}>
          <Controller
            name="reference_composant"
            control={control}
            rules={{ required: 'Choisissez une pièce.' }}
            render={({ field }) => (
              <Selecteur
                id="reference_composant"
                desactive={modification}
                // Une pièce ne peut pas se composer d'elle-même
                options={pieces
                  .filter((p) => p.reference !== piece.reference)
                  .map((p) => ({ valeur: p.reference, libelle: p.libelle, detail: p.reference, desactive: !modification && deja.includes(p.reference) }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.reference_composant)}
                placeholder="Rechercher une pièce"
              />
            )}
          />
        </FormField>
        <FormField label="Quantité" htmlFor="quantite" required error={errors.quantite}>
          <input
            id="quantite"
            type="number"
            min="1"
            className={`input ${errors.quantite ? 'invalid' : ''}`}
            {...register('quantite', regleNombre({ minExclusif: 0, libelle: 'La quantité', message: 'La quantité doit être supérieure à 0.' }))}
          />
        </FormField>
      </form>
    </Modal>
  )
}

function CourbePrix({ achats }) {
  const points = achats.map((a) => ({ date: formatDate(a.date_achat), prix: a.prix_achat, fournisseur: a.raison_sociale }))
  if (points.length < 2) return null
  return (
    <section className="panel panel-body">
      <h2 style={{ marginBottom: 12 }}>Évolution du prix d'achat</h2>
      <div style={{ height: 220 }} role="img" aria-label="Évolution du prix d'achat">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#edf0f5" strokeDasharray="4 4" />
            <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: '#d3dae5' }} tick={{ fill: '#475467', fontSize: 14 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#98a2b3', fontSize: 14 }} width={80} tickFormatter={(v) => formatNombre(v)} />
            <Tooltip formatter={(v) => [formatFCFA(v), "Prix d'achat"]} labelFormatter={(l, p) => `${l} - ${p?.[0]?.payload.fournisseur ?? ''}`} />
            <Line type="monotone" dataKey="prix" stroke="#1f4e8c" strokeWidth={2.5} dot={{ r: 4, fill: '#1f4e8c' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default function PieceDetail() {
  const { ref } = useParams()
  const navigate = useNavigate()
  const droits = useDroits('pieces')
  const droitsNomenclature = useDroits('nomenclature')
  const droitsAchats = useDroits('achats')
  const code = encodeURIComponent(ref)
  const { donnees, chargement, erreur, recharger } = useApi({ piece: `/pieces/${code}`, pieces: '/pieces' })
  const [onglet, setOnglet] = useState('infos')
  const [edition, setEdition] = useState(null)
  const suppression = useSuppression(() => navigate('/pieces'))
  const suppressionLiee = useSuppression(() => recharger())
  const p = donnees.piece

  if (chargement) return <Chargement />
  if (erreur) return <Erreur message={erreur} />

  const fermer = () => setEdition(null)
  const enregistre = () => {
    setEdition(null)
    recharger()
  }
  const urlAchat = (a) => `/achats/${encodeURIComponent(a.reference_piece)}/${encodeURIComponent(a.code_fournisseur)}/${a.date_achat}`

  return (
    <>
      <PageHeader
        titre={p.libelle}
        sousTitre={
          <span className="row" style={{ flexWrap: 'wrap' }}>
            <span className="chip">{p.reference}</span>
            <BadgeStockPiece stock={p.quantite_stock} />
            <span className="badge">{formatFCFA(p.prix_unitaire_ht)} HT</span>
          </span>
        }
        retour={{ chemin: '/pieces', libelle: 'Pièces et stock' }}
        icone={Warehouse}
      >
        {droitsAchats.creer && (
          <button type="button" className="btn btn-secondary" onClick={() => setEdition({ type: 'achat' })}>
            <ShoppingCart size={18} /> Enregistrer un achat
          </button>
        )}
        {droits.modifier && (
          <button type="button" className="btn btn-secondary" onClick={() => setEdition({ type: 'piece' })}>
            <Pencil size={18} /> Modifier
          </button>
        )}
        {droits.supprimer && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => suppression.demander(`/pieces/${code}`, `Supprimer la pièce ${p.libelle} ?`, 'Pièce supprimée avec succès.')}
          >
            <Trash2 size={18} /> Supprimer
          </button>
        )}
      </PageHeader>
      {droits.lectureSeule && droitsAchats.lectureSeule && <LectureSeule />}

      <Onglets
        onglets={[
          { cle: 'infos', libelle: 'Informations', icone: Info },
          { cle: 'nomenclature', libelle: 'Nomenclature', icone: Network, nombre: p.nomenclature.composants.length },
          { cle: 'achats', libelle: 'Historique des achats', icone: ShoppingCart, nombre: p.achats.length },
          { cle: 'maintenances', libelle: 'Maintenances', icone: Wrench, nombre: p.maintenances.length },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === 'infos' && (
        <section className="panel panel-body">
          <dl className="details">
            <dt>Référence</dt>
            <dd>{p.reference}</dd>
            <dt>Libellé</dt>
            <dd>{p.libelle}</dd>
            <dt>Prix unitaire HT</dt>
            <dd>{formatFCFA(p.prix_unitaire_ht)}</dd>
            <dt>Quantité en stock</dt>
            <dd>
              {formatNombre(p.quantite_stock)}
              {p.stock_faible && <span className="muted small"> - stock faible (5 ou moins)</span>}
            </dd>
            <dt>Composée de</dt>
            <dd>{p.nb_composants ? `${p.nb_composants} pièce(s)` : 'Pièce simple'}</dd>
            <dt>Entre dans</dt>
            <dd>{p.nomenclature.utilisee_dans.length ? p.nomenclature.utilisee_dans.map((u) => u.libelle).join(', ') : 'Aucune autre pièce'}</dd>
          </dl>
        </section>
      )}

      {onglet === 'nomenclature' && (
        <div className="stack" style={{ gap: 16 }}>
          {droitsNomenclature.creer && (
            <div>
              <button type="button" className="btn btn-primary" onClick={() => setEdition({ type: 'composant' })}>
                <Plus size={18} /> Ajouter un composant
              </button>
            </div>
          )}
          <section className="panel panel-body">
            <h2 style={{ marginBottom: 12 }}>Composition de {p.libelle}</h2>
            {p.nomenclature.composants.length === 0 ? (
              <p className="muted">Cette pièce n'est composée d'aucune autre pièce.</p>
            ) : (
              <ul className={styles.arbre}>
                {p.nomenclature.composants.map((n) => (
                  <Noeud key={n.reference} noeud={n} />
                ))}
              </ul>
            )}
          </section>
          {p.nomenclature.composants.length > 0 && (droitsNomenclature.modifier || droitsNomenclature.supprimer) && (
            <DataTable
              columns={[
                { cle: 'reference', libelle: 'Composant direct', rendu: (c) => <span className="chip">{c.reference}</span> },
                { cle: 'libelle', libelle: 'Libellé' },
                { cle: 'quantite', libelle: 'Quantité', align: 'right' },
              ]}
              rows={p.nomenclature.composants}
              rowKey={(c) => c.reference}
              recherche={false}
              actions={(c) => (
                <Actions
                  modifier={droitsNomenclature.modifier && (() => setEdition({ type: 'composant', composant: c }))}
                  supprimer={
                    droitsNomenclature.supprimer &&
                    (() =>
                      suppressionLiee.demander(
                        `/pieces/${code}/composants/${encodeURIComponent(c.reference)}`,
                        `Retirer ${c.libelle} de la nomenclature de ${p.libelle} ?`,
                        'Composant retiré avec succès.',
                      ))
                  }
                />
              )}
            />
          )}
          {p.nomenclature.utilisee_dans.length > 0 && (
            <section className="panel panel-body">
              <h2 style={{ marginBottom: 12 }}>Pièces qui utilisent {p.libelle}</h2>
              <ul className={styles.arbre}>
                {p.nomenclature.utilisee_dans.map((n) => (
                  <Noeud key={n.reference} noeud={n} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {onglet === 'achats' && (
        <div className="stack">
          <DataTable
            columns={[
              { cle: 'date_achat', libelle: 'Date', rendu: (a) => formatDate(a.date_achat) },
              {
                cle: 'raison_sociale',
                libelle: 'Fournisseur',
                rendu: (a) => <Link to={`/fournisseurs/${encodeURIComponent(a.code_fournisseur)}`}>{a.raison_sociale}</Link>,
              },
              { cle: 'prix_achat', libelle: "Prix d'achat", align: 'right', rendu: (a) => formatFCFA(a.prix_achat) },
              { cle: 'quantite', libelle: 'Quantité', align: 'right' },
              { cle: 'montant', libelle: 'Montant', align: 'right', rendu: (a) => formatFCFA(a.montant) },
            ]}
            rows={[...p.achats].reverse()}
            rowKey={(a) => `${a.code_fournisseur}-${a.date_achat}`}
            recherche={false}
            vide="Aucun achat de cette pièce."
            videIcone={ShoppingCart}
            actions={
              droitsAchats.modifier || droitsAchats.supprimer
                ? (a) => (
                    <Actions
                      modifier={droitsAchats.modifier && (() => setEdition({ type: 'achat', achat: a }))}
                      supprimer={
                        droitsAchats.supprimer &&
                        (() =>
                          suppressionLiee.demander(
                            urlAchat(a),
                            `Supprimer l'achat du ${formatDate(a.date_achat)} chez ${a.raison_sociale} ? Les ${a.quantite} pièce(s) seront retirées du stock.`,
                            'Achat supprimé avec succès.',
                          ))
                      }
                    />
                  )
                : undefined
            }
          />
          <CourbePrix achats={p.achats} />
        </div>
      )}

      {onglet === 'maintenances' && (
        <DataTable
          columns={[
            { cle: 'num_maintenance', libelle: 'N°', largeur: 90, rendu: (m) => <span className="chip">{m.num_maintenance}</span> },
            { cle: 'designation_machine', libelle: 'Machine' },
            { cle: 'date_heure_debut', libelle: 'Début', rendu: (m) => formatDateHeure(m.date_heure_debut) },
            { cle: 'quantite', libelle: 'Quantité consommée', align: 'right' },
          ]}
          rows={p.maintenances}
          rowKey={(m) => m.num_maintenance}
          recherche={false}
          onRowClick={(m) => navigate(`/maintenances/${m.num_maintenance}`)}
          vide="Cette pièce n'a été consommée lors d'aucune maintenance."
          videIcone={Wrench}
        />
      )}

      {edition?.type === 'piece' && <FormulairePiece piece={p} onFermer={fermer} onEnregistre={enregistre} />}
      {edition?.type === 'achat' && <FormulaireAchat achat={edition.achat} pieceParDefaut={p.reference} onFermer={fermer} onEnregistre={enregistre} />}
      {edition?.type === 'composant' && (
        <FormulaireComposant piece={p} composant={edition.composant} pieces={donnees.pieces} onFermer={fermer} onEnregistre={enregistre} />
      )}
      <ConfirmDialog {...suppression.dialogue} />
      <ConfirmDialog {...suppressionLiee.dialogue} />
    </>
  )
}
