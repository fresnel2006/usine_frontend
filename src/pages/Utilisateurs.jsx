import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { KeyRound, Pencil, Plus, Power, PowerOff, ShieldCheck, Trash2 } from 'lucide-react'
import api, { messageErreur } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useSuppression } from '../hooks/useSuppression'
import { useSoumission } from '../hooks/useSoumission'
import { LIBELLES_ROLES, ROLES } from '../utils/permissions'
import { initiales, nomComplet } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal, { PiedFormulaire } from '../components/Modal'
import FormField from '../components/FormField'
import Selecteur from '../components/Selecteur'
import ConfirmDialog from '../components/ConfirmDialog'
import BadgeRole from '../components/BadgeRole'
import { Erreur, Information } from '../components/Etats'

const REGLE_MOT_DE_PASSE = {
  required: 'Le mot de passe est obligatoire.',
  minLength: { value: 8, message: 'Le mot de passe doit contenir au moins 8 caractères.' },
  maxLength: { value: 72, message: 'Au plus 72 caractères.' },
}

/** Formulaire long : fenêtre centrée. */
function FormulaireUtilisateur({ compte, comptes, operateurs, moi, onFermer, onEnregistre }) {
  const modification = Boolean(compte)
  const soiMeme = compte?.login === moi.login
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: compte
      ? { login: compte.login, role: compte.role, matricule: compte.matricule || '', actif: compte.actif }
      : { login: '', role: 'OPERATEUR', matricule: '', mot_de_passe: '', actif: true },
  })
  const role = useWatch({ control, name: 'role' })
  const estAdmin = role === 'ADMINISTRATEUR'
  // Un opérateur n'a qu'un seul compte
  const pris = comptes.filter((c) => c.matricule && c.login !== compte?.login).map((c) => c.matricule)

  const soumettre = async (v) => {
    const corps = { role: v.role, matricule: estAdmin ? null : v.matricule, actif: v.actif }
    const ok = await executer(
      () =>
        modification
          ? api.put(`/utilisateurs/${encodeURIComponent(compte.login)}`, corps)
          : api.post('/utilisateurs', { ...corps, login: v.login, mot_de_passe: v.mot_de_passe }),
      { setError, succes: modification ? 'Compte enregistré avec succès.' : 'Compte créé avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      titre={modification ? `Modifier le compte ${compte.login}` : 'Nouveau compte'}
      sousTitre="Chaque compte, sauf l'Administrateur, est lié à un opérateur."
      icone={ShieldCheck}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-utilisateur" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-utilisateur" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        {soiMeme && (
          <div className="full">
            <Information>Vous ne pouvez ni changer votre propre rôle, ni désactiver votre propre compte.</Information>
          </div>
        )}
        <FormField label="Identifiant" htmlFor="login" required error={errors.login} hint="Lettres minuscules, chiffres, . _ - @ +">
          <input
            id="login"
            className={`input mono ${errors.login ? 'invalid' : ''}`}
            disabled={modification}
            autoComplete="off"
            {...register(
              'login',
              modification
                ? {}
                : {
                    required: "L'identifiant est obligatoire.",
                    minLength: { value: 3, message: 'Au moins 3 caractères.' },
                    maxLength: { value: 40, message: 'Au plus 40 caractères.' },
                    pattern: { value: /^[A-Za-z0-9._@+-]+$/, message: 'Caractères autorisés : lettres, chiffres, . _ - @ +' },
                  },
            )}
          />
        </FormField>
        <FormField label="Rôle" htmlFor="role" required error={errors.role}>
          <select id="role" className="select" disabled={soiMeme} {...register('role', { required: 'Choisissez un rôle.' })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {LIBELLES_ROLES[r]}
              </option>
            ))}
          </select>
        </FormField>
        {!estAdmin && (
          <FormField label="Opérateur lié" htmlFor="matricule" required className="full" error={errors.matricule}>
            <Controller
              name="matricule"
              control={control}
              rules={{ validate: (v) => estAdmin || Boolean(v) || "Choisissez l'opérateur lié à ce compte." }}
              render={({ field }) => (
                <Selecteur
                  id="matricule"
                  options={operateurs.map((o) => ({
                    valeur: o.matricule,
                    libelle: nomComplet(o),
                    detail: pris.includes(o.matricule) ? `${o.matricule} - a déjà un compte` : `${o.matricule} - ${o.equipe_libelle}`,
                    desactive: pris.includes(o.matricule),
                  }))}
                  valeur={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalide={Boolean(errors.matricule)}
                  placeholder="Rechercher un opérateur"
                />
              )}
            />
          </FormField>
        )}
        {!modification && (
          <FormField label="Mot de passe provisoire" htmlFor="mot_de_passe" required error={errors.mot_de_passe} hint="8 caractères minimum.">
            <input
              id="mot_de_passe"
              type="password"
              autoComplete="new-password"
              className={`input ${errors.mot_de_passe ? 'invalid' : ''}`}
              {...register('mot_de_passe', REGLE_MOT_DE_PASSE)}
            />
          </FormField>
        )}
        <FormField label="Statut" htmlFor="actif">
          <label className="row" style={{ height: 48, gap: 10, cursor: soiMeme ? 'not-allowed' : 'pointer' }}>
            <input id="actif" type="checkbox" disabled={soiMeme} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} {...register('actif')} />
            Compte actif
          </label>
        </FormField>
      </form>
    </Modal>
  )
}

function FormulaireMotDePasse({ compte, onFermer }) {
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched', defaultValues: { mot_de_passe: '' } })

  const soumettre = async (v) => {
    const ok = await executer(() => api.put(`/utilisateurs/${encodeURIComponent(compte.login)}/mot-de-passe`, v), {
      setError,
      succes: `Mot de passe de ${compte.login} réinitialisé avec succès.`,
    })
    if (ok) onFermer()
  }

  return (
    <Modal
      ouvert
      panneau
      titre="Réinitialiser le mot de passe"
      sousTitre={`Compte ${compte.login}. Communiquez le mot de passe provisoire à la personne.`}
      icone={KeyRound}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-mot-de-passe" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-mot-de-passe" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="Nouveau mot de passe provisoire" htmlFor="mot_de_passe" required error={errors.mot_de_passe} hint="8 caractères minimum.">
          <input
            id="mot_de_passe"
            type="password"
            autoComplete="new-password"
            className={`input ${errors.mot_de_passe ? 'invalid' : ''}`}
            {...register('mot_de_passe', REGLE_MOT_DE_PASSE)}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export default function Utilisateurs() {
  const { utilisateur: moi } = useAuth()
  const toast = useToast()
  const droits = useDroits('utilisateurs')
  const { donnees, chargement, erreur, recharger } = useApi({ comptes: '/utilisateurs', operateurs: '/operateurs' })
  const [filtres, setFiltres] = useState({ role: '', statut: '' })
  const [edition, setEdition] = useState(null)
  const [statut, setStatut] = useState(null)
  const suppression = useSuppression(recharger)
  const comptes = donnees.comptes || []
  const visibles = comptes.filter(
    (c) => (!filtres.role || c.role === filtres.role) && (!filtres.statut || (filtres.statut === 'actif') === c.actif),
  )

  const changerStatut = async () => {
    try {
      await api.post(`/utilisateurs/${encodeURIComponent(statut.login)}/${statut.actif ? 'desactiver' : 'reactiver'}`)
      toast.succes(statut.actif ? `Compte ${statut.login} désactivé.` : `Compte ${statut.login} réactivé.`)
      recharger()
    } catch (e) {
      toast.erreur(messageErreur(e))
    } finally {
      setStatut(null)
    }
  }

  const colonnes = [
    { cle: 'login', libelle: 'Identifiant', rendu: (c) => <span className="chip">{c.login}</span> },
    {
      cle: 'nom_complet',
      libelle: 'Nom',
      valeur: (c) => c.nom_complet || 'Administrateur système',
      rendu: (c) => (
        <div className="personne">
          <span className="avatar">{initiales(c.nom_complet || c.login)}</span>
          <span className="personne-nom">{c.nom_complet || 'Administrateur système'}</span>
        </div>
      ),
    },
    { cle: 'role', libelle: 'Rôle', valeur: (c) => LIBELLES_ROLES[c.role], rendu: (c) => <BadgeRole role={c.role} /> },
    {
      cle: 'matricule',
      libelle: 'Opérateur lié',
      rendu: (c) => (c.matricule ? `${c.matricule} - ${c.equipe_libelle}` : <span className="muted">Aucun</span>),
    },
    {
      cle: 'actif',
      libelle: 'Statut',
      valeur: (c) => (c.actif ? 'Actif' : 'Désactivé'),
      rendu: (c) => <span className={`badge ${c.actif ? 'badge-success' : ''}`}>{c.actif ? 'Actif' : 'Désactivé'}</span>,
    },
  ]

  return (
    <>
      <PageHeader titre="Utilisateurs" icone={ShieldCheck} sousTitre="Comptes, rôles et accès à l'application.">
        {droits.creer && (
          <button type="button" className="btn btn-primary" onClick={() => setEdition({})}>
            <Plus size={18} /> Ajouter
          </button>
        )}
      </PageHeader>

      {erreur ? (
        <Erreur message={erreur} />
      ) : (
        <DataTable
          columns={colonnes}
          rows={visibles}
          rowKey={(c) => c.login}
          chargement={chargement}
          rechercheTexte="Rechercher un identifiant ou un nom"
          vide="Aucun compte enregistré pour le moment."
          videIcone={ShieldCheck}
          filtres={
            <>
              <select className="select" value={filtres.role} onChange={(e) => setFiltres((f) => ({ ...f, role: e.target.value }))} aria-label="Filtrer par rôle">
                <option value="">Tous les rôles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {LIBELLES_ROLES[r]}
                  </option>
                ))}
              </select>
              <select className="select" value={filtres.statut} onChange={(e) => setFiltres((f) => ({ ...f, statut: e.target.value }))} aria-label="Filtrer par statut">
                <option value="">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="desactive">Désactivé</option>
              </select>
              {(filtres.role || filtres.statut) && (
                <button type="button" className="btn btn-ghost" onClick={() => setFiltres({ role: '', statut: '' })}>
                  Réinitialiser
                </button>
              )}
            </>
          }
          actions={(c) => {
            const soiMeme = c.login === moi.login
            return (
              <>
                {droits.modifier && (
                  <button type="button" className="icon-btn" title="Modifier" aria-label="Modifier" onClick={() => setEdition({ compte: c })}>
                    <Pencil size={18} />
                  </button>
                )}
                {droits.modifier && (
                  <button
                    type="button"
                    className="icon-btn"
                    title="Réinitialiser le mot de passe"
                    aria-label="Réinitialiser le mot de passe"
                    onClick={() => setEdition({ motDePasse: c })}
                  >
                    <KeyRound size={18} />
                  </button>
                )}
                {droits.modifier && !soiMeme && (
                  <button
                    type="button"
                    className={`icon-btn ${c.actif ? 'danger' : ''}`}
                    title={c.actif ? 'Désactiver' : 'Réactiver'}
                    aria-label={c.actif ? 'Désactiver' : 'Réactiver'}
                    onClick={() => setStatut(c)}
                  >
                    {c.actif ? <PowerOff size={18} /> : <Power size={18} />}
                  </button>
                )}
                {droits.supprimer && !soiMeme && (
                  <button
                    type="button"
                    className="icon-btn danger"
                    title="Supprimer"
                    aria-label="Supprimer"
                    onClick={() => suppression.demander(`/utilisateurs/${encodeURIComponent(c.login)}`, `Supprimer le compte ${c.login} ?`, 'Compte supprimé avec succès.')}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </>
            )
          }}
        />
      )}

      {edition && !edition.motDePasse && (
        <FormulaireUtilisateur
          compte={edition.compte}
          comptes={comptes}
          operateurs={donnees.operateurs || []}
          moi={moi}
          onFermer={() => setEdition(null)}
          onEnregistre={() => {
            setEdition(null)
            recharger()
          }}
        />
      )}
      {edition?.motDePasse && <FormulaireMotDePasse compte={edition.motDePasse} onFermer={() => setEdition(null)} />}
      <ConfirmDialog
        ouvert={Boolean(statut)}
        titre={statut?.actif ? 'Désactiver le compte' : 'Réactiver le compte'}
        message={
          statut?.actif
            ? `Désactiver le compte ${statut.login} ? La personne ne pourra plus se connecter.`
            : `Réactiver le compte ${statut?.login} ?`
        }
        libelleConfirmer={statut?.actif ? 'Désactiver' : 'Réactiver'}
        definitif={false}
        onConfirmer={changerStatut}
        onAnnuler={() => setStatut(null)}
      />
      <ConfirmDialog {...suppression.dialogue} />
    </>
  )
}
