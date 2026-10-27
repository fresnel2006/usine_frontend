import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Info, Pencil, Plus, Trash2, UserRound, Users } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useSuppression } from '../hooks/useSuppression'
import { initiales, nomComplet } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Onglets from '../components/Onglets'
import ConfirmDialog from '../components/ConfirmDialog'
import { Chargement, Erreur, LectureSeule } from '../components/Etats'
import { FormulaireEquipe } from './Equipes'
import { FormulaireOperateur } from './Operateurs'

export default function EquipeDetail() {
  const { num } = useParams()
  const navigate = useNavigate()
  const droits = useDroits('equipes')
  const droitsOperateurs = useDroits('operateurs')
  const { donnees, chargement, erreur, recharger } = useApi({ equipe: `/equipes/${num}`, equipes: '/equipes' })
  const [onglet, setOnglet] = useState('infos')
  const [edition, setEdition] = useState(null)
  const suppression = useSuppression(() => navigate('/equipes'))
  const equipe = donnees.equipe

  if (chargement) return <Chargement />
  if (erreur) return <Erreur message={erreur} />

  const fermer = () => setEdition(null)
  const enregistre = () => {
    setEdition(null)
    recharger()
  }

  return (
    <>
      <PageHeader
        titre={equipe.libelle}
        sousTitre={
          <span className="row" style={{ flexWrap: 'wrap' }}>
            <span className="chip">Équipe {equipe.num_equipe}</span>
            <span className="badge badge-primary">{equipe.nb_operateurs} membre(s)</span>
          </span>
        }
        retour={{ chemin: '/equipes', libelle: 'Équipes' }}
        icone={Users}
      >
        {droits.modifier && (
          <button type="button" className="btn btn-secondary" onClick={() => setEdition('equipe')}>
            <Pencil size={18} /> Modifier
          </button>
        )}
        {droits.supprimer && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => suppression.demander(`/equipes/${equipe.num_equipe}`, `Supprimer l'équipe ${equipe.libelle} ?`, 'Équipe supprimée avec succès.')}
          >
            <Trash2 size={18} /> Supprimer
          </button>
        )}
      </PageHeader>
      {droits.lectureSeule && <LectureSeule />}

      <Onglets
        onglets={[
          { cle: 'infos', libelle: 'Informations', icone: Info },
          { cle: 'membres', libelle: 'Membres', icone: UserRound, nombre: equipe.nb_operateurs },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === 'infos' ? (
        <section className="panel panel-body">
          <dl className="details">
            <dt>N° équipe</dt>
            <dd>{equipe.num_equipe}</dd>
            <dt>Libellé</dt>
            <dd>{equipe.libelle}</dd>
            <dt>Collaborateur responsable</dt>
            <dd>{equipe.responsable ? `${nomComplet(equipe.responsable)} (${equipe.matricule_responsable})` : 'Aucun'}</dd>
            <dt>Membres</dt>
            <dd>{equipe.nb_operateurs}</dd>
          </dl>
        </section>
      ) : (
        <div className="stack" style={{ gap: 16 }}>
          {droitsOperateurs.creer && (
            <div>
              <button type="button" className="btn btn-primary" onClick={() => setEdition('membre')}>
                <Plus size={18} /> Ajouter un opérateur
              </button>
            </div>
          )}
          <DataTable
            columns={[
              {
                cle: 'nom',
                libelle: 'Opérateur',
                valeur: nomComplet,
                rendu: (o) => (
                  <div className="personne">
                    <span className="avatar">{initiales(nomComplet(o))}</span>
                    <span className="personne-nom">{nomComplet(o)}</span>
                    {o.matricule === equipe.matricule_responsable && <span className="badge badge-primary sans-point">Responsable</span>}
                  </div>
                ),
              },
              { cle: 'matricule', libelle: 'Matricule', rendu: (o) => <span className="chip">{o.matricule}</span> },
            ]}
            rows={equipe.operateurs}
            rowKey={(o) => o.matricule}
            recherche={false}
            onRowClick={(o) => navigate(`/operateurs/${o.matricule}`)}
            vide="Aucun opérateur dans cette équipe."
            videIcone={UserRound}
          />
        </div>
      )}

      {edition === 'equipe' && <FormulaireEquipe equipe={equipe} onFermer={fermer} onEnregistre={enregistre} />}
      {edition === 'membre' && (
        <FormulaireOperateur equipes={donnees.equipes} equipeParDefaut={equipe.num_equipe} onFermer={fermer} onEnregistre={enregistre} />
      )}
      <ConfirmDialog {...suppression.dialogue} />
    </>
  )
}
