import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Boxes, Info, Pencil, Trash2, TriangleAlert, Users } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useSuppression } from '../hooks/useSuppression'
import { formatDate, formatDuree, initiales, nomComplet } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Onglets from '../components/Onglets'
import ConfirmDialog from '../components/ConfirmDialog'
import { Chargement, Erreur, LectureSeule } from '../components/Etats'
import { FormulaireLot } from './Lots'

export default function LotDetail() {
  const { num } = useParams()
  const navigate = useNavigate()
  const droits = useDroits('lots')
  const { donnees, chargement, erreur, recharger } = useApi({ lot: `/lots/${num}`, incidents: `/incidents?lot=${num}` })
  const [onglet, setOnglet] = useState('infos')
  const [edition, setEdition] = useState(false)
  const suppression = useSuppression(() => navigate('/lots'))
  const lot = donnees.lot

  if (chargement) return <Chargement />
  if (erreur) return <Erreur message={erreur} />

  return (
    <>
      <PageHeader
        titre={`Lot ${lot.num_lot}`}
        sousTitre={
          <span className="row" style={{ flexWrap: 'wrap' }}>
            <span className="badge badge-primary">{lot.designation_produit}</span>
            <span className="badge">{formatDate(lot.date_production)}</span>
            {lot.nb_incidents > 0 && <span className="badge badge-danger">{formatDuree(lot.temps_arret_total)} d'arrêt</span>}
          </span>
        }
        retour={{ chemin: '/lots', libelle: 'Lots de production' }}
        icone={Boxes}
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
            onClick={() => suppression.demander(`/lots/${lot.num_lot}`, `Supprimer le lot ${lot.num_lot} ?`, 'Lot de production supprimé avec succès.')}
          >
            <Trash2 size={18} /> Supprimer
          </button>
        )}
      </PageHeader>
      {droits.lectureSeule && <LectureSeule />}

      <Onglets
        onglets={[
          { cle: 'infos', libelle: 'Informations', icone: Info },
          { cle: 'operateurs', libelle: 'Opérateurs', icone: Users, nombre: lot.operateurs.length },
          { cle: 'incidents', libelle: 'Incidents', icone: TriangleAlert, nombre: donnees.incidents.length },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === 'infos' && (
        <section className="panel panel-body">
          <dl className="details">
            <dt>N° lot</dt>
            <dd>{lot.num_lot}</dd>
            <dt>Date de production</dt>
            <dd>{formatDate(lot.date_production)}</dd>
            <dt>Ligne</dt>
            <dd>
              Ligne {lot.num_ligne} - {lot.atelier_libelle}
            </dd>
            <dt>Produit</dt>
            <dd>
              {lot.designation_produit} ({lot.reference_produit})
            </dd>
            <dt>Temps d'arrêt total</dt>
            <dd>{lot.nb_incidents ? `${lot.temps_arret_total} min (${lot.nb_incidents} incident(s))` : 'Aucun incident'}</dd>
          </dl>
        </section>
      )}
      {onglet === 'operateurs' && (
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
                </div>
              ),
            },
            { cle: 'matricule', libelle: 'Matricule', rendu: (o) => <span className="chip">{o.matricule}</span> },
          ]}
          rows={lot.operateurs}
          rowKey={(o) => o.matricule}
          recherche={false}
          onRowClick={(o) => navigate(`/operateurs/${o.matricule}`)}
        />
      )}
      {onglet === 'incidents' && (
        <DataTable
          columns={[
            { cle: 'num_incident', libelle: 'N°', largeur: 90, rendu: (i) => <span className="chip">{i.num_incident}</span> },
            { cle: 'type_libelle', libelle: 'Type', rendu: (i) => <span className="badge badge-primary sans-point">{i.type_libelle}</span> },
            { cle: 'temps_arret', libelle: "Temps d'arrêt (min)", align: 'right' },
          ]}
          rows={donnees.incidents}
          rowKey={(i) => i.num_incident}
          recherche={false}
          onRowClick={(i) => navigate(`/incidents/${i.num_incident}`)}
          vide="Aucun incident sur ce lot."
          videIcone={TriangleAlert}
        />
      )}

      {edition && (
        <FormulaireLot
          lot={lot}
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
