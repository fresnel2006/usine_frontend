import { useForm } from 'react-hook-form'
import { CircleUserRound, KeyRound } from 'lucide-react'
import api from '../api/client'
import { useApi } from '../hooks/useApi'
import { useSoumission } from '../hooks/useSoumission'
import { formatAnciennete, formatDate, initiales } from '../utils/format'
import PageHeader from '../components/PageHeader'
import FormField from '../components/FormField'
import BadgeRole from '../components/BadgeRole'
import { Chargement, Erreur, Information } from '../components/Etats'
import styles from './Profil.module.css'

function ChangementMotDePasse() {
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    handleSubmit,
    setError,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: { ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirmation: '' },
  })

  const soumettre = async (v) => {
    const ok = await executer(() => api.put('/profil/mot-de-passe', v), { setError, succes: 'Mot de passe modifié avec succès.' })
    if (ok) reset()
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-titre">
          <span className="pastille sm">
            <KeyRound size={18} />
          </span>
          <h2>Changer mon mot de passe</h2>
        </div>
      </div>
      <form className="panel-body stack" style={{ gap: 20 }} onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && <Erreur message={erreurGlobale} />}
        <FormField label="Ancien mot de passe" htmlFor="ancien" required error={errors.ancien_mot_de_passe}>
          <input
            id="ancien"
            type="password"
            autoComplete="current-password"
            className={`input ${errors.ancien_mot_de_passe ? 'invalid' : ''}`}
            {...register('ancien_mot_de_passe', { required: "L'ancien mot de passe est obligatoire." })}
          />
        </FormField>
        <FormField label="Nouveau mot de passe" htmlFor="nouveau" required error={errors.nouveau_mot_de_passe} hint="8 caractères minimum.">
          <input
            id="nouveau"
            type="password"
            autoComplete="new-password"
            className={`input ${errors.nouveau_mot_de_passe ? 'invalid' : ''}`}
            {...register('nouveau_mot_de_passe', {
              required: 'Le nouveau mot de passe est obligatoire.',
              minLength: { value: 8, message: 'Le mot de passe doit contenir au moins 8 caractères.' },
              maxLength: { value: 72, message: 'Au plus 72 caractères.' },
            })}
          />
        </FormField>
        <FormField label="Confirmation" htmlFor="confirmation" required error={errors.confirmation}>
          <input
            id="confirmation"
            type="password"
            autoComplete="new-password"
            className={`input ${errors.confirmation ? 'invalid' : ''}`}
            {...register('confirmation', {
              required: 'Confirmez le nouveau mot de passe.',
              validate: (v) => v === getValues('nouveau_mot_de_passe') || 'La confirmation ne correspond pas au nouveau mot de passe.',
            })}
          />
        </FormField>
        <div>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting && <span className="spinner spinner-blanc" />}
            Enregistrer
          </button>
        </div>
      </form>
    </section>
  )
}

export default function Profil() {
  const { donnees, chargement, erreur } = useApi({ profil: '/profil' })
  const p = donnees.profil

  if (chargement) return <Chargement />
  if (erreur) return <Erreur message={erreur} />

  const nom = p.nom ? `${p.nom} ${p.prenom}` : 'Administrateur système'

  return (
    <>
      <PageHeader titre="Mon profil" icone={CircleUserRound} sousTitre="Vos informations et votre mot de passe." />

      <div className={styles.grille}>
        <section className="panel">
          <div className={styles.identite}>
            <span className={styles.avatar}>{initiales(nom)}</span>
            <div className="stack" style={{ gap: 6 }}>
              <h2>{nom}</h2>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <BadgeRole role={p.role} />
                <span className="chip">{p.login}</span>
              </div>
            </div>
          </div>
          <div className="panel-body">
            <dl className="details">
              <dt>Nom</dt>
              <dd>{p.nom || '-'}</dd>
              <dt>Prénom</dt>
              <dd>{p.prenom || '-'}</dd>
              <dt>Matricule</dt>
              <dd>{p.matricule || '-'}</dd>
              <dt>Équipe</dt>
              <dd>{p.equipe_libelle || '-'}</dd>
              <dt>Date d'entrée</dt>
              <dd>{p.date_entree ? `${formatDate(p.date_entree)} (${formatAnciennete(p.date_entree)})` : '-'}</dd>
              {p.atelier_responsable && (
                <>
                  <dt>Responsable de l'atelier</dt>
                  <dd>
                    {p.atelier_responsable.libelle} (n° {p.atelier_responsable.numero})
                  </dd>
                </>
              )}
              {p.equipe_responsable && (
                <>
                  <dt>Responsable de l'équipe</dt>
                  <dd>
                    {p.equipe_responsable.libelle} (n° {p.equipe_responsable.numero})
                  </dd>
                </>
              )}
            </dl>
            <div style={{ marginTop: 20 }}>
              <Information>Le rôle, le matricule et l'équipe ne se modifient pas ici : adressez-vous à l'administrateur.</Information>
            </div>
          </div>
        </section>

        <ChangementMotDePasse />
      </div>
    </>
  )
}
