import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { Factory, Plus } from 'lucide-react'
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

export function FormulaireAtelier({ atelier, onFermer, onEnregistre }) {
  const modification = Boolean(atelier)
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
    defaultValues: atelier
      ? { num_atelier: atelier.num_atelier, libelle: atelier.libelle, matricule_responsable: atelier.matricule_responsable }
      : { num_atelier: '', libelle: '', matricule_responsable: '' },
  })

  useEffect(() => {
    const parametre = atelier ? `?atelier=${atelier.num_atelier}` : ''
    api.get(`/ateliers/responsables-disponibles${parametre}`).then(({ data }) => setResponsables(data))
  }, [atelier])

  const soumettre = async (v) => {
    const corps = { libelle: v.libelle, matricule_responsable: v.matricule_responsable }
    const ok = await executer(
      () =>
        modification
          ? api.put(`/ateliers/${atelier.num_atelier}`, corps)
          : api.post('/ateliers', { ...corps, num_atelier: v.num_atelier }),
      { setError, succes: 'Atelier enregistré avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      panneau
      titre={modification ? `Modifier l'atelier ${atelier.num_atelier}` : 'Nouvel atelier'}
      sousTitre="Un atelier a un seul responsable."
      icone={Factory}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-atelier" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-atelier" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="N° atelier" htmlFor="num_atelier" required error={errors.num_atelier}>
          <input
            id="num_atelier"
            type="number"
            className={`input ${errors.num_atelier ? 'invalid' : ''}`}
            disabled={modification}
            {...register('num_atelier', modification ? {} : regleNombre({ minExclusif: 0, libelle: 'Le numéro' }))}
          />
        </FormField>
        <FormField label="Libellé" htmlFor="libelle" required error={errors.libelle}>
          <input id="libelle" className={`input ${errors.libelle ? 'invalid' : ''}`} {...register('libelle', regleTexte('Le libellé', 100))} />
        </FormField>
        <FormField
          label="Responsable"
          htmlFor="matricule_responsable"
          required
          error={errors.matricule_responsable}
          hint="Seuls les opérateurs qui ne sont pas déjà responsables d'un atelier sont proposés."
        >
          <Controller
            name="matricule_responsable"
            control={control}
            rules={{ required: 'Choisissez un responsable.' }}
            render={({ field }) => (
              <Selecteur
                id="matricule_responsable"
                options={responsables.map((o) => ({ valeur: o.matricule, libelle: nomComplet(o), detail: o.matricule }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.matricule_responsable)}
                placeholder="Rechercher un opérateur"
              />
            )}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export default function Ateliers() {
  const navigate = useNavigate()
  const droits = useDroits('ateliers')
  const { donnees, chargement, erreur, recharger } = useApi({ ateliers: '/ateliers' })
  const [edition, setEdition] = useEdition(droits.creer)
  const suppression = useSuppression(recharger)

  const colonnes = [
    { cle: 'num_atelier', libelle: 'N°', largeur: 90, rendu: (a) => <span className="chip">{a.num_atelier}</span> },
    { cle: 'libelle', libelle: 'Libellé', rendu: (a) => <strong>{a.libelle}</strong> },
    {
      cle: 'responsable',
      libelle: 'Responsable',
      valeur: (a) => nomComplet(a.responsable),
      rendu: (a) => (
        <div className="personne">
          <span className="avatar">{initiales(nomComplet(a.responsable))}</span>
          <div>
            <div className="personne-nom">{nomComplet(a.responsable)}</div>
            <div className="personne-detail">Matricule {a.matricule_responsable}</div>
          </div>
        </div>
      ),
    },
    {
      cle: 'nb_lignes',
      libelle: 'Nombre de lignes',
      align: 'right',
      rendu: (a) => <span className={`badge ${a.nb_lignes ? 'badge-primary' : ''}`}>{a.nb_lignes}</span>,
    },
  ]

  return (
    <>
      <PageHeader titre="Ateliers" icone={Factory} sousTitre="Chaque atelier a un seul responsable et comporte plusieurs lignes de production.">
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
          rows={donnees.ateliers || []}
          rowKey={(a) => a.num_atelier}
          chargement={chargement}
          onRowClick={(a) => navigate(`/ateliers/${a.num_atelier}`)}
          rechercheTexte="Rechercher un atelier ou un responsable"
          vide="Aucun atelier enregistré pour le moment."
          videIcone={Factory}
          videAction={
            droits.creer && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdition({})}>
                <Plus size={18} /> Ajouter le premier atelier
              </button>
            )
          }
          actions={(a) => (
            <Actions
              voir={() => navigate(`/ateliers/${a.num_atelier}`)}
              modifier={droits.modifier && (() => setEdition({ atelier: a }))}
              supprimer={
                droits.supprimer &&
                (() =>
                  suppression.demander(`/ateliers/${a.num_atelier}`, `Supprimer l'atelier ${a.libelle} ?`, 'Atelier supprimé avec succès.'))
              }
            />
          )}
        />
      )}

      {edition && (
        <FormulaireAtelier
          atelier={edition.atelier}
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
