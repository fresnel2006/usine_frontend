import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { CircleAlert, Eye, EyeOff, Factory, LockKeyhole, LogIn, UserRound, Users, Wrench } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { MESSAGE_SESSION_EXPIREE, messageErreur } from '../api/client'
import { LIBELLES_ROLES } from '../utils/permissions'
import FormField from '../components/FormField'
import styles from './Login.module.css'

// Encadré affiché seulement si VITE_MODE_DEMO=true. Les mots de passe sont dans le README, pas ici.
const MODE_DEMO = import.meta.env.VITE_MODE_DEMO === 'true'
const COMPTES_DEMO = [
  { login: 'admin', role: 'ADMINISTRATEUR' },
  { login: 'itoure', role: 'RESPONSABLE_ATELIER' },
  { login: 'mbamba', role: 'COLLABORATEUR_RESPONSABLE' },
  { login: 'knguessan', role: 'OPERATEUR' },
]

const MODULES = [
  { icone: Factory, titre: 'Production', texte: 'Ateliers, lignes, lots fabriqués et produits.' },
  { icone: Users, titre: 'Ressources humaines', texte: 'Opérateurs, équipes et responsables.' },
  { icone: Wrench, titre: 'Maintenance', texte: 'Machines, pièces, fournisseurs et achats.' },
]

export default function Login() {
  const { utilisateur, connexion } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [erreur, setErreur] = useState(params.get('session') === 'expiree' ? MESSAGE_SESSION_EXPIREE : null)
  const [voirMotDePasse, setVoirMotDePasse] = useState(false)
  const [aideOuverte, setAideOuverte] = useState(false)
  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { login: '', mot_de_passe: '' } })

  if (utilisateur) {
    return <Navigate to="/tableau-de-bord" replace />
  }

  const soumettre = async ({ login, mot_de_passe }) => {
    setErreur(null)
    try {
      await connexion(login.trim(), mot_de_passe)
      navigate(location.state?.depuis || '/tableau-de-bord', { replace: true })
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.vitrine}>
        <div className={styles.marque}>
          <span className={styles.logo}>
            <Factory size={24} strokeWidth={1.8} />
          </span>
          <span className={styles.nomMarque}>Akwaba Agro-Industrie</span>
        </div>

        <div className={styles.message}>
          <h1>Gestion de l'usine</h1>
          <p>Suivez la production, les incidents et la maintenance de votre usine.</p>
        </div>

        <ul className={styles.modules}>
          {MODULES.map(({ icone: Icone, titre, texte }) => (
            <li key={titre}>
              <span className={styles.iconeModule}>
                <Icone size={22} strokeWidth={1.8} />
              </span>
              <div>
                <strong>{titre}</strong>
                <span>{texte}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.zoneFormulaire}>
        <form className={styles.formulaire} onSubmit={handleSubmit(soumettre)} noValidate>
          <div className={styles.titres}>
            <h2>Connexion</h2>
            <p className="muted">Connectez-vous avec votre identifiant et votre mot de passe.</p>
          </div>

          <FormField label="Identifiant" htmlFor="login" error={errors.login}>
            <div className={styles.champIcone}>
              <UserRound size={19} className={styles.iconeChamp} />
              <input
                id="login"
                className={`input ${errors.login ? 'invalid' : ''}`}
                placeholder="Votre identifiant"
                autoComplete="username"
                autoFocus
                {...register('login', { required: "L'identifiant est obligatoire." })}
              />
            </div>
          </FormField>

          <FormField label="Mot de passe" htmlFor="mot_de_passe" error={errors.mot_de_passe}>
            <div className={styles.champIcone}>
              <LockKeyhole size={19} className={styles.iconeChamp} />
              <input
                id="mot_de_passe"
                type={voirMotDePasse ? 'text' : 'password'}
                className={`input ${errors.mot_de_passe ? 'invalid' : ''}`}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                {...register('mot_de_passe', { required: 'Le mot de passe est obligatoire.' })}
              />
              <button
                type="button"
                className={styles.oeil}
                onClick={() => setVoirMotDePasse((v) => !v)}
                aria-label={voirMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {voirMotDePasse ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </FormField>

          {erreur && (
            <div className="alert alert-danger" role="alert">
              <CircleAlert size={18} />
              <span>{erreur}</span>
            </div>
          )}

          <button type="submit" className={`btn btn-primary ${styles.bouton}`} disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner spinner-blanc" /> : <LogIn size={19} />}
            Se connecter
          </button>

          <div className={styles.aide}>
            <button type="button" className={styles.lienAide} onClick={() => setAideOuverte((v) => !v)} aria-expanded={aideOuverte}>
              Mot de passe oublié ?
            </button>
            {aideOuverte && <p className={styles.texteAide}>Contactez l'administrateur pour réinitialiser votre mot de passe.</p>}
          </div>

          {MODE_DEMO && (
            <div className={styles.demo}>
              <strong>Comptes de démonstration</strong>
              <span className="muted small">Cliquez sur un identifiant pour le saisir. Mots de passe : voir le README.</span>
              <ul>
                {COMPTES_DEMO.map((c) => (
                  <li key={c.login}>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('login', c.login)
                        setFocus('mot_de_passe')
                      }}
                    >
                      <span className="chip">{c.login}</span>
                      <span>{LIBELLES_ROLES[c.role]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </section>
    </div>
  )
}
