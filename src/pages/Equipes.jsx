import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { Plus, Users } from 'lucide-react'
import api from '../api/client'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useEdition } from '../hooks/useEdition'
import { useSuppression } from '../hooks/useSuppression'
import { regleNombre, regleTexte, useSoumission } from '../hooks/useSoumission'
import { initiales, nomComplet } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal, { PiedFormulaire } from '../components/Modal'
import FormField from '../components/FormField'
import Selecteur from '../components/Selecteur'
import ConfirmDialog from '../components/ConfirmDialog'
import Actions from '../components/Actions'
import { Erreur, LectureSeule } from '../components/Etats'

export function FormulaireEquipe({ equipe, onFermer, onEnregistre }) {
  const modification = Boolean(equipe)
  const [responsables, setResponsables] = useState([])
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: equipe
      ? { num_equipe: equipe.num_equipe, libelle: equipe.libelle, matricule_responsable: equipe.matricule_responsable || '' }
      : { num_equipe: '', libelle: '', matricule_responsable: '' },
  })

  useEffect(() => {
    const parametre = equipe ? `?equipe=${equipe.num_equipe}` : ''
    api.get(`/equipes/responsables-disponibles${parametre}`).then(({ data }) => setResponsables(data))
  }, [equipe])

  const soumettre = async (v) => {
    const corps = { libelle: v.libelle, matricule_responsable: v.matricule_responsable || null }
    const ok = await executer(
      () => (modification ? api.put(`/equipes/${equipe.num_equipe}`, corps) : api.post('/equipes', { ...corps, num_equipe: v.num_equipe })),
      { setError, succes: 'Équipe enregistrée avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      panneau
      titre={modification ? `Modifier l'équipe ${equipe.num_equipe}` : 'Nouvelle équipe'}
      sousTitre="Une équipe a un seul collaborateur responsable."
      icone={Users}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-equipe" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-equipe" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="N° équipe" htmlFor="num_equipe" required error={errors.num_equipe}>
          <input
            id="num_equipe"
            type="number"
            className={`input ${errors.num_equipe ? 'invalid' : ''}`}
            disabled={modification}
            {...register('num_equipe', modification ? {} : regleNombre({ minExclusif: 0, libelle: 'Le numéro' }))}
          />
        </FormField>
        <FormField label="Libellé" htmlFor="libelle" required error={errors.libelle}>
          <input id="libelle" className={`input ${errors.libelle ? 'invalid' : ''}`} {...register('libelle', regleTexte('Le libellé', 100))} />
        </FormField>
        <FormField
          label="Collaborateur responsable"
          htmlFor="matricule_responsable"
          error={errors.matricule_responsable}
          hint="Facultatif. Seuls les opérateurs qui ne dirigent pas déjà une équipe sont proposés."
        >
          <Controller
            name="matricule_responsable"
            control={control}
            render={({ field }) => (
              <Selecteur
                id="matricule_responsable"
                options={[
                  { valeur: '', libelle: 'Aucun responsable' },
                  ...responsables.map((o) => ({ valeur: o.matricule, libelle: nomComplet(o), detail: o.matricule })),
                ]}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="Rechercher un opérateur"
              />
            )}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export default function Equipes() {
  const navigate = useNavigate()
  const droits = useDroits('equipes')
  const { donnees, chargement, erreur, recharger } = useApi({ equipes: '/equipes' })
  const [edition, setEdition] = useEdition(droits.creer)
  const suppression = useSuppression(recharger)

  const colonnes = [
    { cle: 'num_equipe', libelle: 'N°', largeur: 90, rendu: (e) => <span className="chip">{e.num_equipe}</span> },
    { cle: 'libelle', libelle: 'Libellé', rendu: (e) => <strong>{e.libelle}</strong> },
    {
      cle: 'responsable',
      libelle: 'Responsable',
      valeur: (e) => (e.responsable ? nomComplet(e.responsable) : ''),
      rendu: (e) =>
        e.responsable ? (
          <div className="personne">
            <span className="avatar">{initiales(nomComplet(e.responsable))}</span>
            <div>
              <div className="personne-nom">{nomComplet(e.responsable)}</div>
              <div className="personne-detail">Matricule {e.matricule_responsable}</div>
            </div>
          </div>
        ) : (
          <span className="muted">Aucun</span>
        ),
    },
    { cle: 'nb_operateurs', libelle: "Nombre d'opérateurs", align: 'right', rendu: (e) => <span className="badge badge-primary">{e.nb_operateurs}</span> },
  ]

  return (
    <>
      <PageHeader titre="Équipes" icone={Users} sousTitre="Chaque équipe est dirigée par un seul collaborateur responsable.">
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
          rows={donnees.equipes || []}
          rowKey={(e) => e.num_equipe}
          chargement={chargement}
          onRowClick={(e) => navigate(`/equipes/${e.num_equipe}`)}
          rechercheTexte="Rechercher une équipe ou un responsable"
          vide="Aucune équipe enregistrée pour le moment."
          videIcone={Users}
          videAction={
            droits.creer && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdition({})}>
                <Plus size={18} /> Ajouter la première équipe
              </button>
            )
          }
          actions={(e) => (
            <Actions
              voir={() => navigate(`/equipes/${e.num_equipe}`)}
              modifier={droits.modifier && (() => setEdition({ equipe: e }))}
              supprimer={
                droits.supprimer &&
                (() => suppression.demander(`/equipes/${e.num_equipe}`, `Supprimer l'équipe ${e.libelle} ?`, 'Équipe supprimée avec succès.'))
              }
            />
          )}
        />
      )}

      {edition && (
        <FormulaireEquipe
          equipe={edition.equipe}
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
