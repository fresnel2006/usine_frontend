import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { Plus, Rows3 } from 'lucide-react'
import api from '../api/client'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useEdition } from '../hooks/useEdition'
import { useSuppression } from '../hooks/useSuppression'
import { regleNombre, useSoumission } from '../hooks/useSoumission'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal, { PiedFormulaire } from '../components/Modal'
import FormField from '../components/FormField'
import Selecteur from '../components/Selecteur'
import ConfirmDialog from '../components/ConfirmDialog'
import Actions from '../components/Actions'
import { Erreur, LectureSeule } from '../components/Etats'

export function FormulaireLigne({ ligne, ateliers, atelierParDefaut, onFermer, onEnregistre }) {
  const modification = Boolean(ligne)
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: ligne
      ? { num_ligne: ligne.num_ligne, nb_operateurs_necessaires: ligne.nb_operateurs_necessaires, num_atelier: String(ligne.num_atelier) }
      : { num_ligne: '', nb_operateurs_necessaires: '', num_atelier: atelierParDefaut ? String(atelierParDefaut) : '' },
  })

  const soumettre = async (v) => {
    const corps = { nb_operateurs_necessaires: v.nb_operateurs_necessaires, num_atelier: Number(v.num_atelier) }
    const ok = await executer(
      () => (modification ? api.put(`/lignes/${ligne.num_ligne}`, corps) : api.post('/lignes', { ...corps, num_ligne: v.num_ligne })),
      { setError, succes: 'Ligne de production enregistrée avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      panneau
      titre={modification ? `Modifier la ligne ${ligne.num_ligne}` : 'Nouvelle ligne de production'}
      sousTitre="Une ligne appartient à un seul atelier."
      icone={Rows3}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-ligne" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-ligne" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="N° ligne" htmlFor="num_ligne" required error={errors.num_ligne}>
          <input
            id="num_ligne"
            type="number"
            className={`input ${errors.num_ligne ? 'invalid' : ''}`}
            disabled={modification}
            {...register('num_ligne', modification ? {} : regleNombre({ minExclusif: 0, libelle: 'Le numéro' }))}
          />
        </FormField>
        <FormField label="Atelier" htmlFor="num_atelier" required error={errors.num_atelier}>
          <Controller
            name="num_atelier"
            control={control}
            rules={{ required: 'Choisissez un atelier.' }}
            render={({ field }) => (
              <Selecteur
                id="num_atelier"
                options={ateliers.map((a) => ({ valeur: String(a.num_atelier), libelle: a.libelle, detail: `N° ${a.num_atelier}` }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.num_atelier)}
                placeholder="Rechercher un atelier"
              />
            )}
          />
        </FormField>
        <FormField label="Nombre d'opérateurs nécessaires" htmlFor="nb_operateurs_necessaires" required error={errors.nb_operateurs_necessaires}>
          <input
            id="nb_operateurs_necessaires"
            type="number"
            min="1"
            className={`input ${errors.nb_operateurs_necessaires ? 'invalid' : ''}`}
            {...register(
              'nb_operateurs_necessaires',
              regleNombre({ minExclusif: 0, libelle: 'Le nombre', message: "Le nombre d'opérateurs doit être supérieur à 0." }),
            )}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export default function Lignes() {
  const navigate = useNavigate()
  const droits = useDroits('lignes')
  const { donnees, chargement, erreur, recharger } = useApi({ lignes: '/lignes', ateliers: '/ateliers' })
  const [filtreAtelier, setFiltreAtelier] = useState('')
  const [edition, setEdition] = useEdition(droits.creer)
  const suppression = useSuppression(recharger)

  const ateliers = donnees.ateliers || []
  const lignes = (donnees.lignes || []).filter((l) => !filtreAtelier || l.num_atelier === Number(filtreAtelier))

  const colonnes = [
    { cle: 'num_ligne', libelle: 'N°', largeur: 100, rendu: (l) => <span className="chip">{l.num_ligne}</span> },
    {
      cle: 'atelier_libelle',
      libelle: 'Atelier',
      rendu: (l) => (
        <div>
          <div className="personne-nom">{l.atelier_libelle}</div>
          <div className="personne-detail">Atelier n° {l.num_atelier}</div>
        </div>
      ),
    },
    { cle: 'nb_operateurs_necessaires', libelle: 'Opérateurs nécessaires', align: 'right' },
    { cle: 'nb_machines', libelle: 'Nombre de machines', align: 'right' },
    { cle: 'nb_lots', libelle: 'Nombre de lots', align: 'right' },
  ]

  return (
    <>
      <PageHeader titre="Lignes de production" icone={Rows3} sousTitre="Cliquez sur une ligne pour voir ses machines et ses lots.">
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
          rows={lignes}
          rowKey={(l) => l.num_ligne}
          chargement={chargement}
          onRowClick={(l) => navigate(`/lignes/${l.num_ligne}`)}
          rechercheTexte="Rechercher une ligne ou un atelier"
          vide="Aucune ligne de production enregistrée pour le moment."
          videIcone={Rows3}
          videAction={
            droits.creer && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdition({})}>
                <Plus size={18} /> Ajouter la première ligne
              </button>
            )
          }
          filtres={
            <>
              <select className="select" value={filtreAtelier} onChange={(e) => setFiltreAtelier(e.target.value)} aria-label="Filtrer par atelier">
                <option value="">Tous les ateliers</option>
                {ateliers.map((a) => (
                  <option key={a.num_atelier} value={a.num_atelier}>
                    {a.libelle}
                  </option>
                ))}
              </select>
              {filtreAtelier && (
                <button type="button" className="btn btn-ghost" onClick={() => setFiltreAtelier('')}>
                  Réinitialiser
                </button>
              )}
            </>
          }
          actions={(l) => (
            <Actions
              voir={() => navigate(`/lignes/${l.num_ligne}`)}
              modifier={droits.modifier && (() => setEdition({ ligne: l }))}
              supprimer={
                droits.supprimer &&
                (() =>
                  suppression.demander(`/lignes/${l.num_ligne}`, `Supprimer la ligne de production ${l.num_ligne} ?`, 'Ligne de production supprimée avec succès.'))
              }
            />
          )}
        />
      )}

      {edition && (
        <FormulaireLigne
          ligne={edition.ligne}
          ateliers={ateliers}
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
