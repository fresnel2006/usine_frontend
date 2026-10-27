import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { Cog, Plus } from 'lucide-react'
import api from '../api/client'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useEdition } from '../hooks/useEdition'
import { useSuppression } from '../hooks/useSuppression'
import { regleNombre, regleTexte, useSoumission } from '../hooks/useSoumission'
import { formatDateHeure } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal, { PiedFormulaire } from '../components/Modal'
import FormField from '../components/FormField'
import Selecteur from '../components/Selecteur'
import ConfirmDialog from '../components/ConfirmDialog'
import Actions from '../components/Actions'
import { Erreur, LectureSeule } from '../components/Etats'

export function FormulaireMachine({ machine, lignes, onFermer, onEnregistre }) {
  const modification = Boolean(machine)
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: machine
      ? { num_machine: machine.num_machine, designation: machine.designation, num_ligne: String(machine.num_ligne) }
      : { num_machine: '', designation: '', num_ligne: '' },
  })

  const soumettre = async (v) => {
    const corps = { designation: v.designation, num_ligne: Number(v.num_ligne) }
    const ok = await executer(
      () =>
        modification ? api.put(`/machines/${machine.num_machine}`, corps) : api.post('/machines', { ...corps, num_machine: v.num_machine }),
      { setError, succes: 'Machine enregistrée avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      panneau
      titre={modification ? `Modifier la machine ${machine.num_machine}` : 'Nouvelle machine'}
      sousTitre="Une machine est installée sur une seule ligne."
      icone={Cog}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-machine" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-machine" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="N° machine" htmlFor="num_machine" required error={errors.num_machine}>
          <input
            id="num_machine"
            type="number"
            className={`input ${errors.num_machine ? 'invalid' : ''}`}
            disabled={modification}
            {...register('num_machine', modification ? {} : regleNombre({ minExclusif: 0, libelle: 'Le numéro' }))}
          />
        </FormField>
        <FormField label="Désignation" htmlFor="designation" required error={errors.designation}>
          <input id="designation" className={`input ${errors.designation ? 'invalid' : ''}`} {...register('designation', regleTexte('La désignation', 100))} />
        </FormField>
        <FormField label="Ligne" htmlFor="num_ligne" required error={errors.num_ligne}>
          <Controller
            name="num_ligne"
            control={control}
            rules={{ required: 'Choisissez une ligne.' }}
            render={({ field }) => (
              <Selecteur
                id="num_ligne"
                options={lignes.map((l) => ({ valeur: String(l.num_ligne), libelle: `Ligne ${l.num_ligne}`, detail: l.atelier_libelle }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.num_ligne)}
                placeholder="Rechercher une ligne"
              />
            )}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export default function Machines() {
  const navigate = useNavigate()
  const droits = useDroits('machines')
  const { donnees, chargement, erreur, recharger } = useApi({ machines: '/machines', lignes: '/lignes' })
  const [filtreLigne, setFiltreLigne] = useState('')
  const [edition, setEdition] = useEdition(droits.creer)
  const suppression = useSuppression(recharger)
  const lignes = donnees.lignes || []
  const machines = (donnees.machines || []).filter((m) => !filtreLigne || m.num_ligne === Number(filtreLigne))

  const colonnes = [
    { cle: 'num_machine', libelle: 'N°', largeur: 80, rendu: (m) => <span className="chip">{m.num_machine}</span> },
    { cle: 'designation', libelle: 'Désignation', rendu: (m) => <strong>{m.designation}</strong> },
    { cle: 'num_ligne', libelle: 'Ligne', rendu: (m) => `Ligne ${m.num_ligne}` },
    { cle: 'atelier_libelle', libelle: 'Atelier' },
    {
      cle: 'derniere_maintenance',
      libelle: 'Dernière maintenance',
      rendu: (m) => (m.derniere_maintenance ? formatDateHeure(m.derniere_maintenance) : <span className="muted">Jamais</span>),
    },
  ]

  return (
    <>
      <PageHeader titre="Machines" icone={Cog} sousTitre="Machines installées sur les lignes de production.">
        {droits.creer && (
          <button type="button" className="btn btn-primary" onClick={() => setEdition({})}>
            <Plus size={18} /> Ajouter
          </button>
        )}
      </PageHeader>
      {droits.lectureSeule && <LectureSeule />}

      {erreur ? (
        <Erreur message={erreur} />
      ) : (
        <DataTable
          columns={colonnes}
          rows={machines}
          rowKey={(m) => m.num_machine}
          chargement={chargement}
          onRowClick={(m) => navigate(`/machines/${m.num_machine}`)}
          rechercheTexte="Rechercher une machine"
          vide="Aucune machine enregistrée pour le moment."
          videIcone={Cog}
          videAction={
            droits.creer && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdition({})}>
                <Plus size={18} /> Ajouter la première machine
              </button>
            )
          }
          filtres={
            <>
              <select className="select" value={filtreLigne} onChange={(e) => setFiltreLigne(e.target.value)} aria-label="Filtrer par ligne">
                <option value="">Toutes les lignes</option>
                {lignes.map((l) => (
                  <option key={l.num_ligne} value={l.num_ligne}>
                    Ligne {l.num_ligne} - {l.atelier_libelle}
                  </option>
                ))}
              </select>
              {filtreLigne && (
                <button type="button" className="btn btn-ghost" onClick={() => setFiltreLigne('')}>
                  Réinitialiser
                </button>
              )}
            </>
          }
          actions={(m) => (
            <Actions
              voir={() => navigate(`/machines/${m.num_machine}`)}
              modifier={droits.modifier && (() => setEdition({ machine: m }))}
              supprimer={
                droits.supprimer &&
                (() => suppression.demander(`/machines/${m.num_machine}`, `Supprimer la machine ${m.designation} ?`, 'Machine supprimée avec succès.'))
              }
            />
          )}
        />
      )}

      {edition && (
        <FormulaireMachine
          machine={edition.machine}
          lignes={lignes}
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
