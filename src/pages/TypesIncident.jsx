import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Tags } from 'lucide-react'
import api from '../api/client'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useSuppression } from '../hooks/useSuppression'
import { regleTexte, useSoumission } from '../hooks/useSoumission'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal, { PiedFormulaire } from '../components/Modal'
import FormField from '../components/FormField'
import ConfirmDialog from '../components/ConfirmDialog'
import Actions from '../components/Actions'
import { Erreur, LectureSeule } from '../components/Etats'

function FormulaireType({ type, onFermer, onEnregistre }) {
  const modification = Boolean(type)
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched', defaultValues: type || { code_type: '', libelle: '' } })

  const soumettre = async (v) => {
    const ok = await executer(
      () =>
        modification
          ? api.put(`/types-incident/${encodeURIComponent(type.code_type)}`, { libelle: v.libelle })
          : api.post('/types-incident', v),
      { setError, succes: "Type d'incident enregistré avec succès." },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      panneau
      titre={modification ? `Modifier le type ${type.code_type}` : "Nouveau type d'incident"}
      icone={Tags}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-type" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-type" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="Code type" htmlFor="code_type" required error={errors.code_type} hint="Exemple : PAN">
          <input
            id="code_type"
            className={`input mono ${errors.code_type ? 'invalid' : ''}`}
            disabled={modification}
            {...register('code_type', modification ? {} : regleTexte('Le code', 10))}
          />
        </FormField>
        <FormField label="Libellé" htmlFor="libelle" required error={errors.libelle}>
          <input id="libelle" className={`input ${errors.libelle ? 'invalid' : ''}`} {...register('libelle', regleTexte('Le libellé', 100))} />
        </FormField>
      </form>
    </Modal>
  )
}

export default function TypesIncident() {
  const droits = useDroits('types_incident')
  const { donnees, chargement, erreur, recharger } = useApi({ types: '/types-incident' })
  const [edition, setEdition] = useState(null)
  const suppression = useSuppression(recharger)

  return (
    <>
      <PageHeader
        titre="Types d'incident"
        icone={Tags}
        sousTitre="Catégories utilisées pour déclarer les incidents."
        retour={{ chemin: '/incidents', libelle: 'Incidents' }}
      >
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
          columns={[
            { cle: 'code_type', libelle: 'Code', largeur: 120, rendu: (t) => <span className="chip">{t.code_type}</span> },
            { cle: 'libelle', libelle: 'Libellé', rendu: (t) => <strong>{t.libelle}</strong> },
            { cle: 'nb_incidents', libelle: 'Incidents', align: 'right' },
          ]}
          rows={donnees.types || []}
          rowKey={(t) => t.code_type}
          chargement={chargement}
          rechercheTexte="Rechercher un type"
          vide="Aucun type d'incident enregistré pour le moment."
          videIcone={Tags}
          videAction={
            droits.creer && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdition({})}>
                <Plus size={18} /> Ajouter le premier type
              </button>
            )
          }
          actions={
            droits.modifier || droits.supprimer
              ? (t) => (
                  <Actions
                    modifier={droits.modifier && (() => setEdition({ type: t }))}
                    supprimer={
                      droits.supprimer &&
                      (() =>
                        suppression.demander(
                          `/types-incident/${encodeURIComponent(t.code_type)}`,
                          `Supprimer le type d'incident ${t.libelle} ?`,
                          "Type d'incident supprimé avec succès.",
                        ))
                    }
                  />
                )
              : undefined
          }
        />
      )}

      {edition && (
        <FormulaireType
          type={edition.type}
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
