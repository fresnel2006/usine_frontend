import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { Plus, UserRound } from 'lucide-react'
import api from '../api/client'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useEdition } from '../hooks/useEdition'
import { useSuppression } from '../hooks/useSuppression'
import { regleTexte, useSoumission } from '../hooks/useSoumission'
import { aujourdhui, formatAnciennete, formatDate, initiales, moisAnciennete, nomComplet } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal, { PiedFormulaire } from '../components/Modal'
import FormField from '../components/FormField'
import Selecteur from '../components/Selecteur'
import ConfirmDialog from '../components/ConfirmDialog'
import Actions from '../components/Actions'
import { Erreur, LectureSeule } from '../components/Etats'

export function FormulaireOperateur({ operateur, equipes, equipeParDefaut, onFermer, onEnregistre }) {
  const modification = Boolean(operateur)
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: operateur
      ? { ...operateur, num_equipe: String(operateur.num_equipe) }
      : { matricule: '', nom: '', prenom: '', date_entree: aujourdhui(), num_equipe: equipeParDefaut ? String(equipeParDefaut) : '' },
  })

  const soumettre = async (v) => {
    const corps = { nom: v.nom, prenom: v.prenom, date_entree: v.date_entree, num_equipe: Number(v.num_equipe) }
    const ok = await executer(
      () =>
        modification
          ? api.put(`/operateurs/${encodeURIComponent(operateur.matricule)}`, corps)
          : api.post('/operateurs', { ...corps, matricule: v.matricule }),
      { setError, succes: 'Opérateur enregistré avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      panneau
      titre={modification ? `Modifier l'opérateur ${operateur.matricule}` : 'Nouvel opérateur'}
      sousTitre="Un opérateur appartient à une seule équipe."
      icone={UserRound}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-operateur" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-operateur" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="Matricule" htmlFor="matricule" required error={errors.matricule} hint="Exemple : OP009">
          <input
            id="matricule"
            className={`input mono ${errors.matricule ? 'invalid' : ''}`}
            disabled={modification}
            {...register('matricule', modification ? {} : regleTexte('Le matricule', 10))}
          />
        </FormField>
        <FormField label="Nom" htmlFor="nom" required error={errors.nom}>
          <input id="nom" className={`input ${errors.nom ? 'invalid' : ''}`} {...register('nom', regleTexte('Le nom', 60))} />
        </FormField>
        <FormField label="Prénom" htmlFor="prenom" required error={errors.prenom}>
          <input id="prenom" className={`input ${errors.prenom ? 'invalid' : ''}`} {...register('prenom', regleTexte('Le prénom', 80))} />
        </FormField>
        <FormField label="Date d'entrée" htmlFor="date_entree" required error={errors.date_entree}>
          <input
            id="date_entree"
            type="date"
            className={`input ${errors.date_entree ? 'invalid' : ''}`}
            {...register('date_entree', { required: "La date d'entrée est obligatoire." })}
          />
        </FormField>
        <FormField label="Équipe" htmlFor="num_equipe" required error={errors.num_equipe}>
          <Controller
            name="num_equipe"
            control={control}
            rules={{ required: 'Choisissez une équipe.' }}
            render={({ field }) => (
              <Selecteur
                id="num_equipe"
                options={equipes.map((e) => ({ valeur: String(e.num_equipe), libelle: e.libelle, detail: `N° ${e.num_equipe}` }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.num_equipe)}
                placeholder="Rechercher une équipe"
              />
            )}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export default function Operateurs() {
  const navigate = useNavigate()
  const droits = useDroits('operateurs')
  const { donnees, chargement, erreur, recharger } = useApi({ operateurs: '/operateurs', equipes: '/equipes' })
  const [filtreEquipe, setFiltreEquipe] = useState('')
  const [edition, setEdition] = useEdition(droits.creer)
  const suppression = useSuppression(recharger)
  const equipes = donnees.equipes || []
  const operateurs = (donnees.operateurs || []).filter((o) => !filtreEquipe || o.num_equipe === Number(filtreEquipe))
  const voir = (o) => navigate(`/operateurs/${encodeURIComponent(o.matricule)}`)

  const colonnes = [
    { cle: 'matricule', libelle: 'Matricule', rendu: (o) => <span className="chip">{o.matricule}</span> },
    {
      cle: 'nom',
      libelle: 'Nom',
      rendu: (o) => (
        <div className="personne">
          <span className="avatar">{initiales(nomComplet(o))}</span>
          <strong>{o.nom}</strong>
        </div>
      ),
    },
    { cle: 'prenom', libelle: 'Prénom' },
    { cle: 'date_entree', libelle: "Date d'entrée", rendu: (o) => formatDate(o.date_entree) },
    {
      cle: 'equipe_libelle',
      libelle: 'Équipe',
      rendu: (o) => (
        <span className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {o.equipe_libelle}
          {o.est_responsable_equipe && <span className="badge badge-primary sans-point">Responsable</span>}
        </span>
      ),
    },
    { cle: 'anciennete', libelle: 'Ancienneté', valeur: (o) => moisAnciennete(o.date_entree), rendu: (o) => formatAnciennete(o.date_entree) },
  ]

  return (
    <>
      <PageHeader titre="Opérateurs" icone={UserRound} sousTitre="Personnel de production : chaque opérateur appartient à une seule équipe.">
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
          rows={operateurs}
          rowKey={(o) => o.matricule}
          chargement={chargement}
          onRowClick={voir}
          rechercheTexte="Rechercher un nom, un prénom, un matricule"
          vide="Aucun opérateur enregistré pour le moment."
          videIcone={UserRound}
          videAction={
            droits.creer && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdition({})}>
                <Plus size={18} /> Ajouter le premier opérateur
              </button>
            )
          }
          filtres={
            <>
              <select className="select" value={filtreEquipe} onChange={(e) => setFiltreEquipe(e.target.value)} aria-label="Filtrer par équipe">
                <option value="">Toutes les équipes</option>
                {equipes.map((e) => (
                  <option key={e.num_equipe} value={e.num_equipe}>
                    {e.libelle}
                  </option>
                ))}
              </select>
              {filtreEquipe && (
                <button type="button" className="btn btn-ghost" onClick={() => setFiltreEquipe('')}>
                  Réinitialiser
                </button>
              )}
            </>
          }
          actions={(o) => (
            <Actions
              voir={() => voir(o)}
              modifier={droits.modifier && (() => setEdition({ operateur: o }))}
              supprimer={
                droits.supprimer &&
                (() =>
                  suppression.demander(
                    `/operateurs/${encodeURIComponent(o.matricule)}`,
                    `Supprimer l'opérateur ${nomComplet(o)} ?`,
                    'Opérateur supprimé avec succès.',
                  ))
              }
            />
          )}
        />
      )}

      {edition && (
        <FormulaireOperateur
          operateur={edition.operateur}
          equipes={equipes}
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
