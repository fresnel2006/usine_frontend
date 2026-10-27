import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Plus, Truck } from 'lucide-react'
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

export function FormulaireFournisseur({ fournisseur, onFermer, onEnregistre }) {
  const modification = Boolean(fournisseur)
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: fournisseur
      ? { ...fournisseur, adresse: fournisseur.adresse || '', telephone: fournisseur.telephone || '' }
      : { code_fournisseur: '', raison_sociale: '', adresse: '', telephone: '+225 ' },
  })

  const soumettre = async (v) => {
    const telephone = v.telephone.trim() === '+225' ? '' : v.telephone.trim()
    const corps = { raison_sociale: v.raison_sociale, adresse: v.adresse || null, telephone: telephone || null }
    const ok = await executer(
      () =>
        modification
          ? api.put(`/fournisseurs/${encodeURIComponent(fournisseur.code_fournisseur)}`, corps)
          : api.post('/fournisseurs', { ...corps, code_fournisseur: v.code_fournisseur }),
      { setError, succes: 'Fournisseur enregistré avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      panneau
      titre={modification ? `Modifier le fournisseur ${fournisseur.code_fournisseur}` : 'Nouveau fournisseur'}
      icone={Truck}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-fournisseur" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-fournisseur" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="Code" htmlFor="code_fournisseur" required error={errors.code_fournisseur} hint="Exemple : F004">
          <input
            id="code_fournisseur"
            className={`input mono ${errors.code_fournisseur ? 'invalid' : ''}`}
            disabled={modification}
            {...register('code_fournisseur', modification ? {} : regleTexte('Le code', 10))}
          />
        </FormField>
        <FormField label="Raison sociale" htmlFor="raison_sociale" required error={errors.raison_sociale}>
          <input id="raison_sociale" className={`input ${errors.raison_sociale ? 'invalid' : ''}`} {...register('raison_sociale', regleTexte('La raison sociale', 120))} />
        </FormField>
        <FormField label="Adresse" htmlFor="adresse" error={errors.adresse}>
          <input id="adresse" className="input" {...register('adresse', { maxLength: { value: 200, message: 'Au plus 200 caractères.' } })} />
        </FormField>
        <FormField label="Téléphone" htmlFor="telephone" error={errors.telephone} hint="Format : +225 27 21 00 11 22">
          <input
            id="telephone"
            type="tel"
            className={`input ${errors.telephone ? 'invalid' : ''}`}
            {...register('telephone', {
              maxLength: { value: 20, message: 'Au plus 20 caractères.' },
              validate: (v) => !v.trim() || v.trim() === '+225' || /^\+?[0-9 ]{8,20}$/.test(v.trim()) || 'Numéro de téléphone invalide.',
            })}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export default function Fournisseurs() {
  const navigate = useNavigate()
  const droits = useDroits('fournisseurs')
  const { donnees, chargement, erreur, recharger } = useApi({ fournisseurs: '/fournisseurs' })
  const [edition, setEdition] = useState(null)
  const suppression = useSuppression(recharger)
  const voir = (f) => navigate(`/fournisseurs/${encodeURIComponent(f.code_fournisseur)}`)

  const colonnes = [
    { cle: 'code_fournisseur', libelle: 'Code', rendu: (f) => <span className="chip">{f.code_fournisseur}</span> },
    { cle: 'raison_sociale', libelle: 'Raison sociale', rendu: (f) => <strong>{f.raison_sociale}</strong> },
    { cle: 'adresse', libelle: 'Adresse', rendu: (f) => f.adresse || '-' },
    { cle: 'telephone', libelle: 'Téléphone', rendu: (f) => (f.telephone ? <span style={{ whiteSpace: 'nowrap' }}>{f.telephone}</span> : '-') },
    { cle: 'nb_pieces', libelle: 'Pièces fournies', align: 'right' },
  ]

  return (
    <>
      <PageHeader titre="Fournisseurs" icone={Truck} sousTitre="Fournisseurs de pièces détachées. Seul l'Administrateur les gère.">
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
          rows={donnees.fournisseurs || []}
          rowKey={(f) => f.code_fournisseur}
          chargement={chargement}
          onRowClick={voir}
          rechercheTexte="Rechercher un fournisseur"
          vide="Aucun fournisseur enregistré pour le moment."
          videIcone={Truck}
          videAction={
            droits.creer && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdition({})}>
                <Plus size={18} /> Ajouter le premier fournisseur
              </button>
            )
          }
          actions={(f) => (
            <Actions
              voir={() => voir(f)}
              modifier={droits.modifier && (() => setEdition({ fournisseur: f }))}
              supprimer={
                droits.supprimer &&
                (() =>
                  suppression.demander(
                    `/fournisseurs/${encodeURIComponent(f.code_fournisseur)}`,
                    `Supprimer le fournisseur ${f.raison_sociale} ?`,
                    'Fournisseur supprimé avec succès.',
                  ))
              }
            />
          )}
        />
      )}

      {edition && (
        <FormulaireFournisseur
          fournisseur={edition.fournisseur}
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
