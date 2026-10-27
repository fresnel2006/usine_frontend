import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Trash2, TriangleAlert } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useSuppression } from '../hooks/useSuppression'
import { formatDate, formatDuree } from '../utils/format'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/ConfirmDialog'
import { Chargement, Erreur, LectureSeule } from '../components/Etats'
import { FormulaireIncident } from './Incidents'

export default function IncidentDetail() {
  const { num } = useParams()
  const navigate = useNavigate()
  const droits = useDroits('incidents')
  const { donnees, chargement, erreur, recharger } = useApi({ incident: `/incidents/${num}` })
  const [edition, setEdition] = useState(false)
  const suppression = useSuppression(() => navigate('/incidents'))
  const i = donnees.incident

  if (chargement) return <Chargement />
  if (erreur) return <Erreur message={erreur} />

  return (
    <>
      <PageHeader
        titre={`Incident ${i.num_incident}`}
        sousTitre={
          <span className="row" style={{ flexWrap: 'wrap' }}>
            <span className="badge badge-primary sans-point">{i.type_libelle}</span>
            <span className="badge badge-danger">{formatDuree(i.temps_arret)} d'arrêt</span>
          </span>
        }
        retour={{ chemin: '/incidents', libelle: 'Incidents' }}
        icone={TriangleAlert}
      >
        {droits.modifier && (
          <button type="button" className="btn btn-secondary" onClick={() => setEdition(true)}>
            <Pencil size={18} /> Modifier
          </button>
        )}
        {droits.supprimer && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => suppression.demander(`/incidents/${i.num_incident}`, `Supprimer l'incident ${i.num_incident} ?`, 'Incident supprimé avec succès.')}
          >
            <Trash2 size={18} /> Supprimer
          </button>
        )}
      </PageHeader>
      {!droits.modifier && <LectureSeule />}

      <section className="panel panel-body">
        <dl className="details">
          <dt>N° incident</dt>
          <dd>{i.num_incident}</dd>
          <dt>Type</dt>
          <dd>
            {i.type_libelle} ({i.code_type})
          </dd>
          <dt>Temps d'arrêt</dt>
          <dd>{i.temps_arret} min</dd>
          <dt>Lot</dt>
          <dd>
            <Link to={`/lots/${i.num_lot}`}>Lot {i.num_lot}</Link> - {i.designation_produit}, produit le {formatDate(i.date_production)}
          </dd>
          <dt>Ligne</dt>
          <dd>
            <Link to={`/lignes/${i.num_ligne}`}>Ligne {i.num_ligne}</Link>
          </dd>
          <dt>Atelier</dt>
          <dd>{i.atelier_libelle}</dd>
        </dl>
      </section>

      {edition && (
        <FormulaireIncident
          incident={i}
          onFermer={() => setEdition(false)}
          onEnregistre={() => {
            setEdition(false)
            recharger()
          }}
        />
      )}
      <ConfirmDialog {...suppression.dialogue} />
    </>
  )
}
