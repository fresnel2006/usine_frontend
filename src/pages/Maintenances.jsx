import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Plus, Trash2, Wrench } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useEdition } from '../hooks/useEdition'
import { useSuppression } from '../hooks/useSuppression'
import { regleNombre, useSoumission } from '../hooks/useSoumission'
import { peutModifierMaintenance } from '../utils/permissions'
import { formatDateHeure, formatNombre, maintenantLocal, nomComplet } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal, { PiedFormulaire } from '../components/Modal'
import FormField from '../components/FormField'
import Selecteur from '../components/Selecteur'
import ConfirmDialog from '../components/ConfirmDialog'
import Actions from '../components/Actions'
import { Erreur, LectureSeule } from '../components/Etats'
import { EtiquettesOperateurs } from './Lots'
import styles from './Maintenances.module.css'

/** Tableau dynamique des pièces consommées (facultatif) : Pièce, Stock disponible, Quantité. */
function PiecesConsommees({ control, register, errors, pieces }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'pieces' })
  const lignes = useWatch({ control, name: 'pieces' }) || []
  const stockDe = (ref) => pieces.find((p) => p.reference === ref)?.quantite_stock

  return (
    <div className="full stack" style={{ gap: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>
          Pièces consommées <span className="muted small">(facultatif)</span>
        </strong>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => append({ reference_piece: '', quantite: 1 })}>
          <Plus size={16} /> Ajouter une pièce
        </button>
      </div>
      {fields.length === 0 ? (
        <p className="muted small">Aucune pièce consommée. Une maintenance peut ne consommer aucune pièce.</p>
      ) : (
        <table className={styles.tableauPieces}>
          <thead>
            <tr>
              <th>Pièce</th>
              <th className="num">Stock disponible</th>
              <th className="num">Quantité</th>
              <th aria-label="Retirer" />
            </tr>
          </thead>
          <tbody>
            {fields.map((champ, i) => {
              const ligne = lignes[i] || {}
              const stock = stockDe(ligne.reference_piece)
              const insuffisant = stock !== undefined && Number(ligne.quantite) > stock
              const dejaChoisies = lignes.filter((_, j) => j !== i).map((l) => l.reference_piece)
              return (
                <tr key={champ.id} className={insuffisant ? styles.insuffisant : ''}>
                  <td>
                    <Controller
                      name={`pieces.${i}.reference_piece`}
                      control={control}
                      rules={{ required: 'Choisissez une pièce.' }}
                      render={({ field }) => (
                        <Selecteur
                          options={pieces.map((p) => ({
                            valeur: p.reference,
                            libelle: p.libelle,
                            detail: p.reference,
                            desactive: dejaChoisies.includes(p.reference),
                          }))}
                          valeur={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          invalide={Boolean(errors.pieces?.[i]?.reference_piece)}
                          placeholder="Rechercher une pièce"
                        />
                      )}
                    />
                    {errors.pieces?.[i]?.reference_piece && <span className="field-error">{errors.pieces[i].reference_piece.message}</span>}
                  </td>
                  <td className="num">{stock === undefined ? '-' : formatNombre(stock)}</td>
                  <td className="num">
                    <input
                      type="number"
                      min="1"
                      className={`input ${styles.quantite} ${insuffisant || errors.pieces?.[i]?.quantite ? 'invalid' : ''}`}
                      aria-label="Quantité"
                      {...register(`pieces.${i}.quantite`, {
                        ...regleNombre({ minExclusif: 0, libelle: 'La quantité' }),
                        validate: (v) => {
                          if (!Number.isInteger(v) || v <= 0) return 'La quantité doit être supérieure à 0.'
                          const s = stockDe(lignes[i]?.reference_piece)
                          return s === undefined || v <= s || 'Stock insuffisant'
                        },
                      })}
                    />
                    {insuffisant ? (
                      <span className="field-error">Stock insuffisant</span>
                    ) : (
                      errors.pieces?.[i]?.quantite && <span className="field-error">{errors.pieces[i].quantite.message}</span>
                    )}
                  </td>
                  <td>
                    <button type="button" className="icon-btn danger" title="Retirer" aria-label="Retirer la pièce" onClick={() => remove(i)}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

/** Formulaire long : fenêtre centrée. En modification, les pièces se gèrent depuis la fiche. */
export function FormulaireMaintenance({ maintenance, onFermer, onEnregistre }) {
  const modification = Boolean(maintenance)
  const { utilisateur } = useAuth()
  const { donnees } = useApi({ machines: '/machines', operateurs: '/operateurs', pieces: '/pieces' })
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: maintenance
      ? {
          num_machine: String(maintenance.num_machine),
          date_heure_debut: String(maintenance.date_heure_debut).slice(0, 16),
          duree: maintenance.duree,
          operateurs: maintenance.operateurs.map((o) => o.matricule),
          pieces: [],
        }
      : {
          num_machine: '',
          date_heure_debut: maintenantLocal(),
          duree: '',
          operateurs: utilisateur.matricule ? [utilisateur.matricule] : [],
          pieces: [],
        },
  })

  const soumettre = async (v) => {
    const corps = {
      num_machine: Number(v.num_machine),
      date_heure_debut: v.date_heure_debut,
      duree: v.duree,
      operateurs: v.operateurs,
    }
    const ok = await executer(
      () =>
        modification
          ? api.put(`/maintenances/${maintenance.num_maintenance}`, corps)
          : api.post('/maintenances', {
              ...corps,
              pieces: v.pieces.map((p) => ({ reference_piece: p.reference_piece, quantite: p.quantite })),
            }),
      { setError, succes: 'Maintenance enregistrée avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      large
      titre={modification ? `Modifier la maintenance ${maintenance.num_maintenance}` : 'Enregistrer une maintenance'}
      sousTitre="Les pièces consommées font baisser le stock."
      icone={Wrench}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-maintenance" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-maintenance" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="Machine" htmlFor="num_machine" required className="full" error={errors.num_machine}>
          <Controller
            name="num_machine"
            control={control}
            rules={{ required: 'Choisissez une machine.' }}
            render={({ field }) => (
              <Selecteur
                id="num_machine"
                options={(donnees.machines || []).map((m) => ({
                  valeur: String(m.num_machine),
                  libelle: m.designation,
                  detail: `N° ${m.num_machine} - Ligne ${m.num_ligne}`,
                }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.num_machine)}
                placeholder="Rechercher une machine"
              />
            )}
          />
        </FormField>
        <FormField label="Date et heure de début" htmlFor="date_heure_debut" required error={errors.date_heure_debut}>
          <input
            id="date_heure_debut"
            type="datetime-local"
            className={`input ${errors.date_heure_debut ? 'invalid' : ''}`}
            {...register('date_heure_debut', { required: 'La date et l\'heure de début sont obligatoires.' })}
          />
        </FormField>
        <FormField label="Durée (minutes)" htmlFor="duree" required error={errors.duree}>
          <input
            id="duree"
            type="number"
            min="1"
            className={`input ${errors.duree ? 'invalid' : ''}`}
            {...register('duree', regleNombre({ minExclusif: 0, libelle: 'La durée', message: 'La durée doit être supérieure à 0.' }))}
          />
        </FormField>
        <FormField label="Opérateurs" htmlFor="operateurs" required className="full" error={errors.operateurs}>
          <Controller
            name="operateurs"
            control={control}
            rules={{ validate: (v) => v.length > 0 || 'Choisissez au moins un opérateur.' }}
            render={({ field }) => (
              <Selecteur
                id="operateurs"
                multiple
                options={(donnees.operateurs || []).map((o) => ({ valeur: o.matricule, libelle: nomComplet(o), detail: o.matricule }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.operateurs)}
                placeholder="Rechercher un opérateur"
              />
            )}
          />
        </FormField>
        {modification ? (
          <p className="full muted small">Les pièces consommées se modifient depuis la fiche de la maintenance.</p>
        ) : (
          <PiecesConsommees control={control} register={register} errors={errors} pieces={donnees.pieces || []} />
        )}
      </form>
    </Modal>
  )
}

export default function Maintenances() {
  const navigate = useNavigate()
  const { utilisateur } = useAuth()
  const droits = useDroits('maintenances')
  const { donnees, chargement, erreur, recharger } = useApi({ maintenances: '/maintenances', machines: '/machines', operateurs: '/operateurs' })
  const [filtres, setFiltres] = useState({ machine: '', debut: '', fin: '', operateur: '' })
  const [edition, setEdition] = useEdition(droits.creer)
  const suppression = useSuppression(recharger)
  const changer = (cle) => (e) => setFiltres((f) => ({ ...f, [cle]: e.target.value }))

  const maintenances = (donnees.maintenances || []).filter((m) => {
    const jour = String(m.date_heure_debut).slice(0, 10)
    return (
      (!filtres.machine || m.num_machine === Number(filtres.machine)) &&
      (!filtres.debut || jour >= filtres.debut) &&
      (!filtres.fin || jour <= filtres.fin) &&
      (!filtres.operateur || m.operateurs.some((o) => o.matricule === filtres.operateur))
    )
  })

  const colonnes = [
    { cle: 'num_maintenance', libelle: 'N°', largeur: 80, rendu: (m) => <span className="chip">{m.num_maintenance}</span> },
    { cle: 'designation_machine', libelle: 'Machine', rendu: (m) => <strong>{m.designation_machine}</strong> },
    { cle: 'date_heure_debut', libelle: 'Début', rendu: (m) => formatDateHeure(m.date_heure_debut) },
    { cle: 'duree', libelle: 'Durée (min)', align: 'right' },
    {
      cle: 'operateurs',
      libelle: 'Opérateurs',
      triable: false,
      valeur: (m) => m.operateurs.map(nomComplet).join(' '),
      rendu: (m) => <EtiquettesOperateurs operateurs={m.operateurs} />,
    },
    { cle: 'pieces', libelle: 'Pièces consommées', align: 'right', valeur: (m) => m.pieces.length, rendu: (m) => m.pieces.length },
  ]

  return (
    <>
      <PageHeader titre="Maintenances" icone={Wrench} sousTitre="Interventions sur les machines et pièces consommées.">
        {droits.creer && (
          <button type="button" className="btn btn-primary" onClick={() => setEdition({})}>
            <Plus size={18} /> Enregistrer une maintenance
          </button>
        )}
      </PageHeader>
      {droits.lectureSeule && <LectureSeule />}

      {erreur ? (
        <Erreur message={erreur} />
      ) : (
        <DataTable
          columns={colonnes}
          rows={maintenances}
          rowKey={(m) => m.num_maintenance}
          chargement={chargement}
          onRowClick={(m) => navigate(`/maintenances/${m.num_maintenance}`)}
          rechercheTexte="Rechercher une maintenance"
          vide="Aucune maintenance enregistrée pour le moment."
          videIcone={Wrench}
          videAction={
            droits.creer && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdition({})}>
                <Plus size={18} /> Enregistrer la première maintenance
              </button>
            )
          }
          filtres={
            <>
              <select className="select" value={filtres.machine} onChange={changer('machine')} aria-label="Filtrer par machine">
                <option value="">Toutes les machines</option>
                {(donnees.machines || []).map((m) => (
                  <option key={m.num_machine} value={m.num_machine}>
                    {m.designation}
                  </option>
                ))}
              </select>
              <input type="date" className="input" value={filtres.debut} onChange={changer('debut')} aria-label="Du" title="Du" />
              <input type="date" className="input" value={filtres.fin} onChange={changer('fin')} aria-label="Au" title="Au" />
              <select className="select" value={filtres.operateur} onChange={changer('operateur')} aria-label="Filtrer par opérateur">
                <option value="">Tous les opérateurs</option>
                {(donnees.operateurs || []).map((o) => (
                  <option key={o.matricule} value={o.matricule}>
                    {nomComplet(o)}
                  </option>
                ))}
              </select>
              {Object.values(filtres).some(Boolean) && (
                <button type="button" className="btn btn-ghost" onClick={() => setFiltres({ machine: '', debut: '', fin: '', operateur: '' })}>
                  Réinitialiser
                </button>
              )}
            </>
          }
          actions={(m) => (
            <Actions
              voir={() => navigate(`/maintenances/${m.num_maintenance}`)}
              modifier={peutModifierMaintenance(utilisateur, m) && (() => setEdition({ maintenance: m }))}
              supprimer={
                droits.supprimer &&
                (() =>
                  suppression.demander(
                    `/maintenances/${m.num_maintenance}`,
                    `Supprimer la maintenance ${m.num_maintenance} (${m.designation_machine}) ? Les pièces consommées retourneront en stock.`,
                    'Maintenance supprimée avec succès.',
                  ))
              }
            />
          )}
        />
      )}

      {edition && (
        <FormulaireMaintenance
          maintenance={edition.maintenance}
          onFermer={() => setEdition(null)}
          onEnregistre={() => {
            setEdition(null)
            recharger()
          }}
        />
      )}
      <ConfirmDialog {...suppression.dialogue} />
    </>
  )
}
