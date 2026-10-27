import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { Info, Pencil, Plus, Trash2, Users, Warehouse, Wrench } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useSuppression } from '../hooks/useSuppression'
import { regleNombre, useSoumission } from '../hooks/useSoumission'
import { peutModifierMaintenance } from '../utils/permissions'
import { formatDateHeure, formatDuree, formatFCFA, formatNombre, initiales, nomComplet } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Onglets from '../components/Onglets'
import Modal, { PiedFormulaire } from '../components/Modal'
import FormField from '../components/FormField'
import Selecteur from '../components/Selecteur'
import ConfirmDialog from '../components/ConfirmDialog'
import Actions from '../components/Actions'
import { Chargement, Erreur, LectureSeule } from '../components/Etats'
import { FormulaireMaintenance } from './Maintenances'

/** Ajout d'une pièce consommée, ou modification de sa quantité (le stock est ajusté par l'API). */
function FormulairePiece({ maintenance, consommation, pieces, onFermer, onEnregistre }) {
  const modification = Boolean(consommation)
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: consommation
      ? { reference_piece: consommation.reference_piece, quantite: consommation.quantite }
      : { reference_piece: '', quantite: 1 },
  })
  const reference = watch('reference_piece')
  const piece = pieces.find((p) => p.reference === reference)
  // En modification, le stock disponible inclut la quantité déjà consommée
  const disponible = piece ? piece.quantite_stock + (consommation?.quantite || 0) : undefined
  const dejaNotees = maintenance.pieces.map((p) => p.reference_piece)
  const base = `/maintenances/${maintenance.num_maintenance}/pieces`

  const soumettre = async (v) => {
    const ok = await executer(
      () =>
        modification
          ? api.put(`${base}/${encodeURIComponent(consommation.reference_piece)}`, { quantite: v.quantite })
          : api.post(base, { reference_piece: v.reference_piece, quantite: v.quantite }),
      { setError, succes: 'Pièce consommée enregistrée avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      panneau
      titre={modification ? `Modifier la quantité de ${consommation.libelle}` : 'Noter une pièce consommée'}
      sousTitre="Le stock de la pièce est mis à jour automatiquement."
      icone={Warehouse}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-piece-consommee" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-piece-consommee" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="Pièce" htmlFor="reference_piece" required error={errors.reference_piece}>
          <Controller
            name="reference_piece"
            control={control}
            rules={{ required: 'Choisissez une pièce.' }}
            render={({ field }) => (
              <Selecteur
                id="reference_piece"
                desactive={modification}
                options={pieces.map((p) => ({
                  valeur: p.reference,
                  libelle: p.libelle,
                  detail: `${p.reference} - ${formatNombre(p.quantite_stock)} en stock`,
                  desactive: !modification && dejaNotees.includes(p.reference),
                }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.reference_piece)}
                placeholder="Rechercher une pièce"
              />
            )}
          />
        </FormField>
        <FormField
          label="Quantité"
          htmlFor="quantite"
          required
          error={errors.quantite}
          hint={disponible !== undefined ? `Stock disponible : ${formatNombre(disponible)}` : undefined}
        >
          <input
            id="quantite"
            type="number"
            min="1"
            className={`input ${errors.quantite ? 'invalid' : ''}`}
            {...register('quantite', {
              ...regleNombre({ minExclusif: 0, libelle: 'La quantité' }),
              validate: (v) => {
                if (!Number.isInteger(v) || v <= 0) return 'La quantité doit être supérieure à 0.'
                return disponible === undefined || v <= disponible || 'Stock insuffisant pour cette pièce.'
              },
            })}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export default function MaintenanceDetail() {
  const { num } = useParams()
  const navigate = useNavigate()
  const { utilisateur } = useAuth()
  const droits = useDroits('maintenances')
  const droitsPieces = useDroits('pieces_consommees')
  const { donnees, chargement, erreur, recharger } = useApi({ maintenance: `/maintenances/${num}`, pieces: '/pieces' })
  const [onglet, setOnglet] = useState('infos')
  const [edition, setEdition] = useState(null)
  const suppression = useSuppression(() => navigate('/maintenances'))
  const suppressionPiece = useSuppression(() => recharger())
  const m = donnees.maintenance

  if (chargement) return <Chargement />
  if (erreur) return <Erreur message={erreur} />

  // Un opérateur ne modifie que les maintenances qu'il a effectuées (même règle que l'API)
  const modifiable = peutModifierMaintenance(utilisateur, m)
  const piecesModifiables = modifiable && droitsPieces.modifier
  const fermer = () => setEdition(null)
  const enregistre = () => {
    setEdition(null)
    recharger()
  }

  return (
    <>
      <PageHeader
        titre={`Maintenance ${m.num_maintenance}`}
        sousTitre={
          <span className="row" style={{ flexWrap: 'wrap' }}>
            <span className="badge badge-primary">{m.designation_machine}</span>
            <span className="badge">{formatDateHeure(m.date_heure_debut)}</span>
            <span className="badge">{formatDuree(m.duree)}</span>
          </span>
        }
        retour={{ chemin: '/maintenances', libelle: 'Maintenances' }}
        icone={Wrench}
      >
        {modifiable && (
          <button type="button" className="btn btn-secondary" onClick={() => setEdition({ type: 'maintenance' })}>
            <Pencil size={18} /> Modifier
          </button>
        )}
        {droits.supprimer && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() =>
              suppression.demander(
                `/maintenances/${m.num_maintenance}`,
                `Supprimer la maintenance ${m.num_maintenance} ? Les pièces consommées retourneront en stock.`,
                'Maintenance supprimée avec succès.',
              )
            }
          >
            <Trash2 size={18} /> Supprimer
          </button>
        )}
      </PageHeader>
      {!modifiable && <LectureSeule />}

      <Onglets
        onglets={[
          { cle: 'infos', libelle: 'Informations', icone: Info },
          { cle: 'operateurs', libelle: 'Opérateurs', icone: Users, nombre: m.operateurs.length },
          { cle: 'pieces', libelle: 'Pièces consommées', icone: Warehouse, nombre: m.pieces.length },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === 'infos' && (
        <section className="panel panel-body">
          <dl className="details">
            <dt>N° maintenance</dt>
            <dd>{m.num_maintenance}</dd>
            <dt>Machine</dt>
            <dd>
              <Link to={`/machines/${m.num_machine}`}>{m.designation_machine}</Link> (ligne {m.num_ligne})
            </dd>
            <dt>Début</dt>
            <dd>{formatDateHeure(m.date_heure_debut)}</dd>
            <dt>Durée</dt>
            <dd>
              {m.duree} min ({formatDuree(m.duree)})
            </dd>
            <dt>Coût des pièces</dt>
            <dd>{formatFCFA(m.cout_pieces)}</dd>
          </dl>
        </section>
      )}
      {onglet === 'operateurs' && (
        <DataTable
          columns={[
            {
              cle: 'nom',
              libelle: 'Opérateur',
              valeur: nomComplet,
              rendu: (o) => (
                <div className="personne">
                  <span className="avatar">{initiales(nomComplet(o))}</span>
                  <span className="personne-nom">{nomComplet(o)}</span>
                </div>
              ),
            },
            { cle: 'matricule', libelle: 'Matricule', rendu: (o) => <span className="chip">{o.matricule}</span> },
          ]}
          rows={m.operateurs}
          rowKey={(o) => o.matricule}
          recherche={false}
          onRowClick={(o) => navigate(`/operateurs/${o.matricule}`)}
        />
      )}
      {onglet === 'pieces' && (
        <div className="stack" style={{ gap: 16 }}>
          {modifiable && droitsPieces.creer && (
            <div>
              <button type="button" className="btn btn-primary" onClick={() => setEdition({ type: 'piece' })}>
                <Plus size={18} /> Ajouter une pièce
              </button>
            </div>
          )}
          <DataTable
            columns={[
              { cle: 'reference_piece', libelle: 'Référence', rendu: (p) => <span className="chip">{p.reference_piece}</span> },
              { cle: 'libelle', libelle: 'Pièce', rendu: (p) => <strong>{p.libelle}</strong> },
              { cle: 'quantite', libelle: 'Quantité', align: 'right' },
              { cle: 'prix_unitaire_ht', libelle: 'Prix unitaire HT', align: 'right', rendu: (p) => formatFCFA(p.prix_unitaire_ht) },
              { cle: 'montant', libelle: 'Montant', align: 'right', rendu: (p) => formatFCFA(p.montant) },
            ]}
            rows={m.pieces}
            rowKey={(p) => p.reference_piece}
            recherche={false}
            vide="Aucune pièce consommée pendant cette maintenance."
            videIcone={Warehouse}
            onRowClick={(p) => navigate(`/pieces/${encodeURIComponent(p.reference_piece)}`)}
            actions={
              piecesModifiables || droitsPieces.supprimer
                ? (p) => (
                    <Actions
                      modifier={piecesModifiables && (() => setEdition({ type: 'piece', consommation: p }))}
                      supprimer={
                        droitsPieces.supprimer &&
                        (() =>
                          suppressionPiece.demander(
                            `/maintenances/${m.num_maintenance}/pieces/${encodeURIComponent(p.reference_piece)}`,
                            `Retirer la pièce ${p.libelle} de cette maintenance ? Elle retournera en stock.`,
                            'Pièce retirée avec succès.',
                          ))
                      }
                    />
                  )
                : undefined
            }
          />
        </div>
      )}

      {edition?.type === 'maintenance' && <FormulaireMaintenance maintenance={m} onFermer={fermer} onEnregistre={enregistre} />}
      {edition?.type === 'piece' && (
        <FormulairePiece
          maintenance={m}
          consommation={edition.consommation}
          pieces={donnees.pieces}
          onFermer={fermer}
          onEnregistre={enregistre}
        />
      )}
      <ConfirmDialog {...suppression.dialogue} />
      <ConfirmDialog {...suppressionPiece.dialogue} />
    </>
  )
}
